import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * Financial snapshot for admin accounting tab.
 * Query params:
 *   period = "month" | "year" | "all" (default "month")
 */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const admin = createUntypedAdminClient();
  const period = request.nextUrl.searchParams.get("period") || "month";

  const now = new Date();
  let since: Date | null = null;
  if (period === "month") {
    since = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "year") {
    since = new Date(now.getFullYear(), 0, 1);
  }

  // Transactions ------------------------------------------------------------
  const txnQuery = admin
    .from("transactions")
    .select("id, company_id, amount_cents, type, status, created_at")
    .eq("status", "paid")
    .in("type", ["unlock", "lead_purchase", "subscription"])
    .order("created_at", { ascending: false });

  if (since) txnQuery.gte("created_at", since.toISOString());

  const { data: txns } = await txnQuery;

  let grossRevenue = 0;
  let unlockRevenue = 0;
  let subscriptionRevenue = 0;
  const revenueByCompany: Record<string, number> = {};

  const txnsList = (txns || []) as Array<{
    id: string;
    company_id: string;
    amount_cents: number;
    type: string;
    status: string;
    created_at: string;
  }>;

  for (const t of txnsList) {
    if (t.amount_cents <= 0) continue;
    grossRevenue += t.amount_cents;
    if (t.type === "subscription") subscriptionRevenue += t.amount_cents;
    else unlockRevenue += t.amount_cents;
    revenueByCompany[t.company_id] =
      (revenueByCompany[t.company_id] || 0) + t.amount_cents;
  }

  // Wallet ledger ----------------------------------------------------------
  const wQuery = admin
    .from("wallet_transactions")
    .select("id, company_id, amount_cents, type, reason, expires_at, created_at, refund_method, refund_percent")
    .order("created_at", { ascending: false });
  if (since) wQuery.gte("created_at", since.toISOString());

  const { data: wtxns } = await wQuery;
  const wList = (wtxns || []) as Array<{
    id: string;
    company_id: string;
    amount_cents: number;
    type: string;
    reason: string | null;
    expires_at: string | null;
    created_at: string;
    refund_method: string | null;
    refund_percent: number | null;
  }>;

  let refundsIssued = 0;         // all refunds in period (wallet + bank)
  let refundsWallet = 0;         // wallet credits
  let refundsBank = 0;           // bank refunds via Mollie
  let walletConsumed = 0;        // debits
  const refundsByCompany: Record<string, number> = {};
  const refundsWalletByCompany: Record<string, number> = {};
  const refundsBankByCompany: Record<string, number> = {};

  for (const t of wList) {
    if (t.type === "refund" && t.amount_cents > 0) {
      refundsIssued += t.amount_cents;
      refundsByCompany[t.company_id] =
        (refundsByCompany[t.company_id] || 0) + t.amount_cents;
      if (t.refund_method === "bank") {
        refundsBank += t.amount_cents;
        refundsBankByCompany[t.company_id] =
          (refundsBankByCompany[t.company_id] || 0) + t.amount_cents;
      } else {
        // default 'wallet' for legacy rows without refund_method
        refundsWallet += t.amount_cents;
        refundsWalletByCompany[t.company_id] =
          (refundsWalletByCompany[t.company_id] || 0) + t.amount_cents;
      }
    }
    if (t.amount_cents < 0) walletConsumed += -t.amount_cents;
  }

  // Outstanding wallet liability = non-expired credits − debits (bank refunds excluded)
  const { data: allWalletRows } = await admin
    .from("wallet_transactions")
    .select("amount_cents, type, expires_at, company_id, refund_method");

  const nowMs = Date.now();
  let liability = 0;
  const liabilityByCompany: Record<string, number> = {};
  for (const t of (allWalletRows || []) as Array<{
    amount_cents: number;
    type: string;
    expires_at: string | null;
    company_id: string;
    refund_method: string | null;
  }>) {
    if (t.refund_method === "bank") continue; // bank refunds leave the platform
    if (t.amount_cents > 0) {
      if (t.expires_at && new Date(t.expires_at).getTime() < nowMs) continue;
      liability += t.amount_cents;
      liabilityByCompany[t.company_id] =
        (liabilityByCompany[t.company_id] || 0) + t.amount_cents;
    } else {
      liability += t.amount_cents;
      liabilityByCompany[t.company_id] =
        (liabilityByCompany[t.company_id] || 0) + t.amount_cents;
    }
  }
  liability = Math.max(0, liability);
  for (const k of Object.keys(liabilityByCompany)) {
    liabilityByCompany[k] = Math.max(0, liabilityByCompany[k]);
  }

  // Expired credits total
  let expiredCredits = 0;
  for (const t of (allWalletRows || []) as Array<{
    amount_cents: number;
    expires_at: string | null;
  }>) {
    if (t.amount_cents > 0 && t.expires_at && new Date(t.expires_at).getTime() < nowMs) {
      expiredCredits += t.amount_cents;
    }
  }

  // Soon-expiring (next 30 days)
  const in30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: soonExpiring } = await admin
    .from("wallet_transactions")
    .select("id, company_id, amount_cents, expires_at, reason")
    .gt("amount_cents", 0)
    .not("expires_at", "is", null)
    .gte("expires_at", new Date().toISOString())
    .lte("expires_at", in30d)
    .order("expires_at", { ascending: true })
    .limit(50);

  // Company names
  const companyIds = Array.from(
    new Set([
      ...Object.keys(revenueByCompany),
      ...Object.keys(refundsByCompany),
      ...Object.keys(liabilityByCompany),
    ])
  );
  const companyMap: Record<string, string> = {};
  if (companyIds.length > 0) {
    const { data: companies } = await admin
      .from("companies")
      .select("id, name")
      .in("id", companyIds);
    for (const c of (companies || []) as Array<{ id: string; name: string }>) {
      companyMap[c.id] = c.name;
    }
  }

  const perCompany = companyIds
    .map((id) => ({
      companyId: id,
      name: companyMap[id] || "—",
      revenueCents: revenueByCompany[id] || 0,
      refundedCents: refundsByCompany[id] || 0,
      refundedWalletCents: refundsWalletByCompany[id] || 0,
      refundedBankCents: refundsBankByCompany[id] || 0,
      liabilityCents: liabilityByCompany[id] || 0,
      netCents:
        (revenueByCompany[id] || 0) - (refundsByCompany[id] || 0),
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  const refundCount = wList.filter((w) => w.type === "refund" && w.amount_cents > 0).length;
  const walletRefundCount = wList.filter(
    (w) => w.type === "refund" && w.amount_cents > 0 && w.refund_method !== "bank"
  ).length;
  const bankRefundCount = wList.filter(
    (w) => w.type === "refund" && w.amount_cents > 0 && w.refund_method === "bank"
  ).length;

  const avgRefundPercent = (() => {
    const rows = wList.filter(
      (w) => w.type === "refund" && w.amount_cents > 0 && w.refund_percent != null
    );
    if (rows.length === 0) return null;
    return (
      rows.reduce((s, r) => s + (r.refund_percent || 0), 0) / rows.length
    );
  })();

  return NextResponse.json({
    period,
    kpis: {
      grossRevenueCents: grossRevenue,
      unlockRevenueCents: unlockRevenue,
      subscriptionRevenueCents: subscriptionRevenue,
      refundsIssuedCents: refundsIssued,
      refundsWalletCents: refundsWallet,
      refundsBankCents: refundsBank,
      walletConsumedCents: walletConsumed,
      netRevenueCents: grossRevenue - refundsIssued,
      liabilityCents: liability,
      expiredCreditsCents: expiredCredits,
      transactionCount: txnsList.length,
      refundCount,
      walletRefundCount,
      bankRefundCount,
      avgRefundPercent,
    },
    perCompany,
    soonExpiring: soonExpiring || [],
  });
}
