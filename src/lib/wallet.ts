import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import { refundPayment } from "@/lib/mollie";

type Admin = SupabaseClient;

/**
 * Returns true if the error indicates the wallet_transactions table does not
 * exist yet (migration not applied). Used to degrade gracefully so the rest
 * of the app keeps working while the operator runs the SQL.
 */
function isMissingTable(err: PostgrestError | null | undefined): boolean {
  if (!err) return false;
  // PostgREST: PGRST205 = Could not find the table in schema cache
  // Postgres: 42P01 = undefined_table
  if (err.code === "PGRST205" || err.code === "42P01") return true;
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("wallet_transactions") &&
    (msg.includes("not find") || msg.includes("does not exist"))
  );
}

export class WalletTableMissingError extends Error {
  constructor() {
    super(
      "Table wallet_transactions absente. Appliquez la migration SQL 010_wallet.sql + 012_refund_method.sql dans Supabase."
    );
    this.name = "WalletTableMissingError";
  }
}

export type RefundMethod = "wallet" | "bank";

export interface WalletTxn {
  id: string;
  company_id: string;
  amount_cents: number;
  type: "refund" | "debit" | "adjustment" | "expiry";
  refund_method: RefundMethod | null;
  refund_percent: number | null;
  mollie_refund_id: string | null;
  reason: string | null;
  quote_distribution_id: string | null;
  source_transaction_id: string | null;
  admin_note: string | null;
  expires_at: string | null;
  created_at: string;
}

interface RefundSettings {
  refundsEnabled?: boolean;
  refundMaxPercent?: string;            // single % cap enforced on every refund
  walletValidityDays?: string;
  refundOncePerTransaction?: boolean;
  refundMaxPerMoverMonthly?: string;    // optional € cap, 0/empty = unlimited
  refundMaxPerMoverYearly?: string;     // optional € cap
  refundCooldownDays?: string;          // optional delay between refunds
}

async function readSettings(admin: Admin): Promise<RefundSettings> {
  const { data } = await admin
    .from("site_settings")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  return (data?.data as RefundSettings) || {};
}

function eurosToCents(value: string | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * Authoritative wallet balance from the ledger.
 * - Positive wallet credits are counted only while not expired
 * - Negative rows (debits) are always counted
 * - Bank refunds (refund_method='bank') are ignored — the money left via
 *   Mollie, it's not in the wallet
 */
export async function getWalletBalanceCents(
  admin: Admin,
  companyId: string
): Promise<number> {
  const { data, error } = await admin
    .from("wallet_transactions")
    .select("amount_cents, expires_at, refund_method")
    .eq("company_id", companyId);

  if (isMissingTable(error)) return 0; // degrade gracefully
  if (!data || data.length === 0) return 0;

  const now = Date.now();
  let total = 0;
  for (const t of data as Array<{
    amount_cents: number;
    expires_at: string | null;
    refund_method: string | null;
  }>) {
    // Bank refunds never touch the balance (money paid back on the card)
    if (t.refund_method === "bank") continue;
    if (t.amount_cents > 0) {
      if (t.expires_at && new Date(t.expires_at).getTime() < now) continue;
      total += t.amount_cents;
    } else {
      total += t.amount_cents;
    }
  }
  return Math.max(0, total);
}

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

export interface CreateRefundInput {
  /** Source transaction ID being refunded (required for refund method). */
  sourceTransactionId: string;
  /** Amount to refund in cents. Must not exceed maxPercent × source amount. */
  amountCents: number;
  /** Wallet credit or bank refund via Mollie. */
  method: RefundMethod;
  /** Human-readable reason shown to mover. */
  reason: string;
  /** Internal admin note (not shown to mover). */
  adminNote?: string | null;
  /** Actor email for audit (from admin token). */
  actorEmail?: string | null;
}

export interface CreateRefundResult {
  id: string;
  method: RefundMethod;
  amountCents: number;
  percent: number;
  newBalance: number;
  mollieRefundId: string | null;
  expiresAt: string | null;
  company: { id: string; name: string; email_contact: string | null };
}

/**
 * Single entry point for ALL refunds (wallet or bank).
 * Enforces every guardrail from site_settings. Throws on violation.
 */
export async function createRefund(
  admin: Admin,
  input: CreateRefundInput
): Promise<CreateRefundResult> {
  const settings = await readSettings(admin);

  if (!settings.refundsEnabled) {
    throw new Error("Remboursements désactivés dans les paramètres");
  }

  const { sourceTransactionId, amountCents, method, reason, adminNote } = input;

  if (amountCents <= 0) throw new Error("Montant invalide");
  if (!sourceTransactionId) {
    throw new Error("Transaction source requise pour un remboursement");
  }

  // Load the source transaction
  const { data: source } = await admin
    .from("transactions")
    .select("id, company_id, amount_cents, status, mollie_payment_id, type, quote_distribution_id, currency")
    .eq("id", sourceTransactionId)
    .maybeSingle();

  if (!source) throw new Error("Transaction source introuvable");
  if (source.status !== "paid") {
    throw new Error("Seules les transactions payées peuvent être remboursées");
  }
  if (source.type === "refund") {
    throw new Error("Impossible de rembourser un remboursement");
  }

  const sourceAbs = Math.abs(source.amount_cents);
  if (sourceAbs === 0) throw new Error("Transaction source de montant nul");

  // ── Guardrail 1: max percent of source transaction (ALWAYS enforced) ─────
  const maxPercent = Math.max(0, Math.min(100, parseInt(settings.refundMaxPercent || "30", 10)));
  const capCents = Math.floor((sourceAbs * maxPercent) / 100);
  if (capCents === 0) {
    throw new Error(
      `Pourcentage de remboursement à 0 % dans les paramètres. Augmentez-le pour autoriser ce remboursement.`
    );
  }
  if (amountCents > capCents) {
    throw new Error(
      `Plafond dépassé : ${maxPercent} % max de la transaction (${(capCents / 100).toFixed(2)} €).`
    );
  }

  // ── Guardrail 2: once per transaction (ALWAYS enforced — anti-double-click) ─
  {
    const { count } = await admin
      .from("wallet_transactions")
      .select("id", { count: "exact", head: true })
      .eq("source_transaction_id", sourceTransactionId)
      .eq("type", "refund");
    if ((count || 0) > 0) {
      throw new Error("Cette transaction a déjà été remboursée.");
    }
  }

  // ── Guardrail 3: cooldown per mover ──────────────────────────────────────
  const cooldownDays = parseInt(settings.refundCooldownDays || "0", 10);
  if (cooldownDays > 0) {
    const since = new Date(
      Date.now() - cooldownDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: recent } = await admin
      .from("wallet_transactions")
      .select("created_at")
      .eq("company_id", source.company_id)
      .eq("type", "refund")
      .gte("created_at", since)
      .limit(1);
    if (recent && recent.length > 0) {
      throw new Error(
        `Cooldown actif : patientez ${cooldownDays} jour(s) avant un nouveau remboursement.`
      );
    }
  }

  // ── Guardrail 4: monthly / yearly money caps per mover ───────────────────
  const monthlyCap = eurosToCents(settings.refundMaxPerMoverMonthly);
  const yearlyCap = eurosToCents(settings.refundMaxPerMoverYearly);
  if (monthlyCap > 0 || yearlyCap > 0) {
    const yearAgo = new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000
    ).toISOString();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: priorRefunds } = await admin
      .from("wallet_transactions")
      .select("amount_cents, created_at")
      .eq("company_id", source.company_id)
      .eq("type", "refund")
      .gte("created_at", yearAgo);

    let monthSum = 0;
    let yearSum = 0;
    for (const r of (priorRefunds || []) as Array<{
      amount_cents: number;
      created_at: string;
    }>) {
      if (r.amount_cents <= 0) continue;
      yearSum += r.amount_cents;
      if (new Date(r.created_at) >= monthStart) monthSum += r.amount_cents;
    }
    if (monthlyCap > 0 && monthSum + amountCents > monthlyCap) {
      throw new Error(
        `Plafond mensuel atteint : ${(monthSum / 100).toFixed(2)} € déjà remboursé ce mois.`
      );
    }
    if (yearlyCap > 0 && yearSum + amountCents > yearlyCap) {
      throw new Error(
        `Plafond annuel atteint : ${(yearSum / 100).toFixed(2)} € déjà remboursé sur 365 j.`
      );
    }
  }

  // ── Company (for email + return payload) ─────────────────────────────────
  const { data: company } = await admin
    .from("companies")
    .select("id, name, email_contact")
    .eq("id", source.company_id)
    .maybeSingle();
  if (!company) throw new Error("Entreprise introuvable");

  const percent = Math.round((amountCents / sourceAbs) * 10000) / 100;

  // ── Execute refund ────────────────────────────────────────────────────────
  let mollieRefundId: string | null = null;
  let expiresAt: string | null = null;

  if (method === "bank") {
    if (!source.mollie_payment_id) {
      throw new Error(
        "Impossible : la transaction source n'a pas d'identifiant Mollie."
      );
    }
    try {
      const mollieRefund = await refundPayment(
        source.mollie_payment_id,
        amountCents,
        reason
      );
      mollieRefundId =
        (mollieRefund as unknown as { id?: string })?.id || null;
    } catch (err) {
      throw new Error(
        `Mollie a refusé le remboursement : ${(err as Error).message}`
      );
    }
  } else {
    const validityDays = Math.max(
      1,
      parseInt(settings.walletValidityDays || "365", 10)
    );
    expiresAt = new Date(
      Date.now() + validityDays * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  // ── Ledger row (always, for both methods) ────────────────────────────────
  const { data: inserted, error } = await admin
    .from("wallet_transactions")
    .insert({
      company_id: company.id,
      amount_cents: amountCents,
      type: "refund",
      refund_method: method,
      refund_percent: percent,
      mollie_refund_id: mollieRefundId,
      reason,
      admin_note: adminNote ?? null,
      source_transaction_id: sourceTransactionId,
      quote_distribution_id: source.quote_distribution_id || null,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (isMissingTable(error)) throw new WalletTableMissingError();
  if (error || !inserted) {
    throw new Error(
      error?.message || "Échec de l'écriture dans wallet_transactions"
    );
  }

  // For bank refunds, mark the original transaction as refunded
  if (method === "bank") {
    await admin
      .from("transactions")
      .update({ status: "refunded" })
      .eq("id", sourceTransactionId);
    await admin.from("transactions").insert({
      company_id: company.id,
      quote_distribution_id: source.quote_distribution_id,
      mollie_payment_id: source.mollie_payment_id,
      amount_cents: -amountCents,
      currency: source.currency || "EUR",
      type: "refund",
      status: "paid",
    });
  }

  // In-app notification
  await admin.from("notifications").insert({
    company_id: company.id,
    type: "refund",
    title:
      method === "wallet"
        ? "Crédit portefeuille reçu"
        : "Remboursement bancaire effectué",
    body: `${(amountCents / 100).toFixed(2)} € — ${reason}`,
    data: {
      transactionId: sourceTransactionId,
      refundId: inserted.id,
      method,
    },
  });

  const newBalance = await syncWalletBalance(admin, company.id);

  return {
    id: inserted.id,
    method,
    amountCents,
    percent,
    newBalance,
    mollieRefundId,
    expiresAt,
    company: company as { id: string; name: string; email_contact: string | null },
  };
}

/**
 * Debit the wallet to pay for a lead unlock. Caller checks balance first.
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
  if (amountCents <= 0) throw new Error("Debit amount must be positive");

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

  if (isMissingTable(error)) throw new WalletTableMissingError();
  if (error || !data) {
    throw new Error(error?.message || "Failed to debit wallet");
  }
  const balance = await syncWalletBalance(admin, companyId);
  return { id: data.id, balance };
}
