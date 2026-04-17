import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { getWalletBalanceCents } from "@/lib/wallet";

interface SiteSettings {
  refundsEnabled?: boolean;
  refundMaxPercent?: string;
  refundMaxPerMoverMonthly?: string;
  refundMaxPerMoverYearly?: string;
  refundOncePerTransaction?: boolean;
  refundCooldownDays?: string;
  walletValidityDays?: string;
}

async function readSettings(
  admin: ReturnType<typeof createUntypedAdminClient>
): Promise<SiteSettings> {
  const { data } = await admin
    .from("site_settings")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  return (data?.data as SiteSettings) || {};
}

function eurosToCents(value: string | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/**
 * GET /api/admin/wallet?companyId=<uuid>
 * Returns wallet state + caps for the given mover.
 * POST is disabled — all refunds go through /api/admin/transactions action=refund.
 */
export async function GET(request: NextRequest) {
  const admin = createUntypedAdminClient();
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId requis" }, { status: 400 });
  }

  const [txnRes, balance, settings, paidTxnRes] = await Promise.all([
    admin
      .from("wallet_transactions")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    getWalletBalanceCents(admin, companyId),
    readSettings(admin),
    admin
      .from("transactions")
      .select(
        "id, amount_cents, type, status, created_at, mollie_payment_id, quote_distribution_id"
      )
      .eq("company_id", companyId)
      .eq("status", "paid")
      .in("type", ["unlock", "lead_purchase"])
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // If wallet_transactions doesn't exist yet, surface a single clear flag
  // rather than returning 500s. Admin UI can warn the operator.
  const walletTableMissing =
    txnRes.error &&
    ((txnRes.error as { code?: string }).code === "PGRST205" ||
      (txnRes.error as { code?: string }).code === "42P01");

  // Mark transactions already refunded so the UI can disable the button
  const refundedSourceIds = new Set<string>();
  for (const wt of (txnRes.data || []) as Array<{
    source_transaction_id: string | null;
    type: string;
  }>) {
    if (wt.type === "refund" && wt.source_transaction_id) {
      refundedSourceIds.add(wt.source_transaction_id);
    }
  }
  const paidTxns = ((paidTxnRes.data || []) as Array<{
    id: string;
    amount_cents: number;
    type: string;
    status: string;
    created_at: string;
    mollie_payment_id: string | null;
    quote_distribution_id: string | null;
  }>).map((t) => ({ ...t, already_refunded: refundedSourceIds.has(t.id) }));

  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let monthRefunded = 0;
  let yearRefunded = 0;
  for (const t of (txnRes.data || []) as Array<{
    amount_cents: number;
    type: string;
    created_at: string;
  }>) {
    if (t.type !== "refund" || t.amount_cents <= 0) continue;
    const ts = new Date(t.created_at);
    if (ts >= yearAgo) yearRefunded += t.amount_cents;
    if (ts >= monthStart) monthRefunded += t.amount_cents;
  }

  const monthlyCapCents = eurosToCents(settings.refundMaxPerMoverMonthly);
  const yearlyCapCents = eurosToCents(settings.refundMaxPerMoverYearly);

  return NextResponse.json({
    balance,
    walletTableMissing: !!walletTableMissing,
    transactions: txnRes.data || [],
    refundableTransactions: paidTxns,
    caps: {
      refundsEnabled: !!settings.refundsEnabled,
      maxPercent: parseInt(settings.refundMaxPercent || "100", 10),
      monthlyCapCents,
      yearlyCapCents,
      monthRefundedCents: monthRefunded,
      yearRefundedCents: yearRefunded,
      monthRemainingCents: monthlyCapCents > 0 ? monthlyCapCents - monthRefunded : -1,
      yearRemainingCents: yearlyCapCents > 0 ? yearlyCapCents - yearRefunded : -1,
      oncePerTransaction: !!settings.refundOncePerTransaction,
      cooldownDays: parseInt(settings.refundCooldownDays || "0", 10),
      walletValidityDays: parseInt(settings.walletValidityDays || "365", 10),
    },
  });
}

/**
 * POST is no longer an entry point for refunds — kept only to return a clear
 * error if something still calls the old ad-hoc credit endpoint.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Endpoint désactivé. Utilisez /api/admin/transactions action=refund pour tout remboursement.",
    },
    { status: 410 }
  );
}
