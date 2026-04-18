import { getPayment } from "@/lib/mollie";
import { BRAND } from "@/lib/brand";

type Admin = ReturnType<typeof import("@/lib/supabase/admin").createUntypedAdminClient>;

interface PendingTxn {
  id: string;
  mollie_payment_id: string;
  quote_distribution_id: string | null;
  wallet_debit_cents: number | null;
  company_id: string;
  amount_cents: number;
  created_at: string;
}

interface ReconcileResult {
  checked: number;
  paid: number;
  failed: number;
  stillPending: number;
  errors: number;
}

// Terminal Mollie statuses that should roll back the unlock.
const FAILED_STATUSES = new Set(["failed", "canceled", "expired"]);

/**
 * Reconcile pending transactions against Mollie. Picks transactions that
 * have sat in `pending` long enough that the webhook is clearly not coming,
 * then either finalizes them via our own webhook or rolls them back.
 *
 * Design notes:
 * - `minAgeMinutes` guards against racing the normal webhook (default 10 min).
 * - `reconciled_at` prevents hammering Mollie for the same txn twice in one
 *   cron run.
 * - For successful payments we forward to `/api/webhooks/mollie`. That keeps
 *   the invoicing/notification path in a single place (the webhook handler).
 * - For terminal failures we clean up inline: re-lock the distribution and
 *   credit the wallet back if it was partially debited.
 */
export async function reconcilePendingPayments(
  admin: Admin,
  opts: { minAgeMinutes?: number; limit?: number } = {}
): Promise<ReconcileResult> {
  const minAgeMinutes = opts.minAgeMinutes ?? 10;
  const limit = opts.limit ?? 50;

  const cutoff = new Date(Date.now() - minAgeMinutes * 60 * 1000).toISOString();

  const { data: pending } = await admin
    .from("transactions")
    .select("id, mollie_payment_id, quote_distribution_id, wallet_debit_cents, company_id, amount_cents, created_at")
    .eq("status", "pending")
    .not("mollie_payment_id", "is", null)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(limit);

  const result: ReconcileResult = {
    checked: 0,
    paid: 0,
    failed: 0,
    stillPending: 0,
    errors: 0,
  };

  for (const txn of ((pending || []) as unknown) as PendingTxn[]) {
    result.checked += 1;
    try {
      const payment = await getPayment(txn.mollie_payment_id);

      if (payment.status === "paid") {
        // Forward to the real webhook so it runs the full finalization path
        // (wallet debit, invoice, email, notification).
        await fetch(`${BRAND.siteUrl}/api/webhooks/mollie`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `id=${encodeURIComponent(txn.mollie_payment_id)}`,
        }).catch((err) => {
          console.error("[Reconcile] Self-webhook call failed:", err);
          throw err;
        });
        await admin
          .from("transactions")
          .update({ reconciled_at: new Date().toISOString() })
          .eq("id", txn.id);
        result.paid += 1;
        continue;
      }

      if (FAILED_STATUSES.has(payment.status)) {
        await rollbackPendingTxn(admin, txn);
        result.failed += 1;
        continue;
      }

      // Still open / pending / authorized-but-not-captured etc.
      await admin
        .from("transactions")
        .update({ reconciled_at: new Date().toISOString() })
        .eq("id", txn.id);
      result.stillPending += 1;
    } catch (err) {
      console.error(`[Reconcile] Failed to reconcile txn ${txn.id}:`, err);
      result.errors += 1;
    }
  }

  return result;
}

/**
 * Mollie reported a terminal failure. Clean everything up:
 *   1. Mark transaction as failed.
 *   2. Re-lock the distribution (was optimistically unlocked at checkout).
 *   3. If wallet was partially debited, credit it back.
 */
async function rollbackPendingTxn(admin: Admin, txn: PendingTxn): Promise<void> {
  const walletDebit = txn.wallet_debit_cents || 0;

  // 1. Mark transaction failed + reconciled
  await admin
    .from("transactions")
    .update({
      status: "failed",
      reconciled_at: new Date().toISOString(),
    })
    .eq("id", txn.id);

  // 2. Re-lock the distribution (only if currently unlocked — avoid stomping
  //    a later successful retry from the same mover)
  if (txn.quote_distribution_id) {
    await admin
      .from("quote_distributions")
      .update({ status: "pending", unlocked_at: null })
      .eq("id", txn.quote_distribution_id)
      .eq("status", "unlocked");
  }

  // 3. Refund the wallet debit if any — wallet_transactions allows positive
  //    entries with type "refund".
  if (walletDebit > 0) {
    await admin.from("wallet_transactions").insert({
      company_id: txn.company_id,
      amount_cents: walletDebit,
      type: "refund",
      reason: "Paiement échoué / expiré — remboursement portefeuille",
      quote_distribution_id: txn.quote_distribution_id,
      source_transaction_id: txn.id,
    });
  }

  // 4. Notify the mover so they understand why the lead re-locked.
  await admin.from("notifications").insert({
    company_id: txn.company_id,
    type: "payment_failed",
    title: "Paiement non confirmé",
    body: walletDebit > 0
      ? `Le paiement de ${(txn.amount_cents / 100).toFixed(2)} € n'a pas été confirmé. Votre portefeuille a été recrédité de ${(walletDebit / 100).toFixed(2)} € et le lead est à nouveau disponible.`
      : `Le paiement de ${(txn.amount_cents / 100).toFixed(2)} € n'a pas été confirmé. Le lead est à nouveau disponible.`,
    data: { transactionId: txn.id, distributionId: txn.quote_distribution_id },
  });
}
