import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient;

export interface WalletTxn {
  id: string;
  company_id: string;
  amount_cents: number;
  type: "refund" | "debit" | "adjustment" | "expiry";
  reason: string | null;
  quote_distribution_id: string | null;
  source_transaction_id: string | null;
  admin_note: string | null;
  expires_at: string | null;
  created_at: string;
}

/**
 * Sum of non-expired credits minus all debits. Authoritative balance
 * always comes from the ledger, not from the cached companies column.
 */
export async function getWalletBalanceCents(
  admin: Admin,
  companyId: string
): Promise<number> {
  const { data } = await admin
    .from("wallet_transactions")
    .select("amount_cents, expires_at, type")
    .eq("company_id", companyId);

  if (!data || data.length === 0) return 0;

  const now = Date.now();
  let total = 0;
  for (const t of data as Array<{
    amount_cents: number;
    expires_at: string | null;
    type: string;
  }>) {
    if (t.amount_cents > 0) {
      if (t.expires_at && new Date(t.expires_at).getTime() < now) continue;
      total += t.amount_cents;
    } else {
      total += t.amount_cents; // negative already
    }
  }
  return Math.max(0, total);
}

/**
 * Refresh the cached `companies.wallet_balance_cents` to match the ledger.
 * Call after any write to wallet_transactions.
 */
export async function syncWalletBalance(
  admin: Admin,
  companyId: string
): Promise<number> {
  const balance = await getWalletBalanceCents(admin, companyId);
  await admin
    .from("companies")
    .update({ wallet_balance_cents: balance })
    .eq("id", companyId);
  return balance;
}

/**
 * Credit the mover wallet. `validityDays` defines when the credit expires.
 * Returns the inserted row.
 */
export async function creditWallet(
  admin: Admin,
  params: {
    companyId: string;
    amountCents: number;
    reason: string;
    validityDays: number;
    adminNote?: string;
    sourceTransactionId?: string | null;
    quoteDistributionId?: string | null;
    type?: "refund" | "adjustment";
  }
): Promise<{ id: string; balance: number }> {
  const {
    companyId,
    amountCents,
    reason,
    validityDays,
    adminNote,
    sourceTransactionId,
    quoteDistributionId,
    type = "refund",
  } = params;

  if (amountCents <= 0) {
    throw new Error("Credit amount must be positive");
  }

  const expiresAt = new Date(
    Date.now() + validityDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("wallet_transactions")
    .insert({
      company_id: companyId,
      amount_cents: amountCents,
      type,
      reason,
      source_transaction_id: sourceTransactionId ?? null,
      quote_distribution_id: quoteDistributionId ?? null,
      admin_note: adminNote ?? null,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to credit wallet");
  }

  const balance = await syncWalletBalance(admin, companyId);
  return { id: data.id, balance };
}

/**
 * Debit the wallet to pay for a lead unlock (or other). Caller is responsible
 * for checking balance first.
 */
export async function debitWallet(
  admin: Admin,
  params: {
    companyId: string;
    amountCents: number;
    reason: string;
    quoteDistributionId?: string | null;
  }
): Promise<{ id: string; balance: number }> {
  const { companyId, amountCents, reason, quoteDistributionId } = params;

  if (amountCents <= 0) {
    throw new Error("Debit amount must be positive");
  }

  const { data, error } = await admin
    .from("wallet_transactions")
    .insert({
      company_id: companyId,
      amount_cents: -amountCents,
      type: "debit",
      reason,
      quote_distribution_id: quoteDistributionId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to debit wallet");
  }

  const balance = await syncWalletBalance(admin, companyId);
  return { id: data.id, balance };
}
