import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { reconcilePendingPayments } from "@/lib/reconcile-payments";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * Admin-triggered manual reconciliation. Allows lowering the minAgeMinutes
 * to 0 so the admin can act immediately on stuck payments surfaced in the UI.
 *
 * Also returns the current list of stuck (still-pending) transactions for
 * the admin dashboard.
 */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const admin = createUntypedAdminClient();

  // Stuck = pending + has a mollie payment + older than 30 minutes
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: stuck } = await admin
    .from("transactions")
    .select(`
      id, amount_cents, wallet_debit_cents, mollie_payment_id,
      created_at, reconciled_at, quote_distribution_id, company_id,
      companies(name)
    `)
    .eq("status", "pending")
    .not("mollie_payment_id", "is", null)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ stuck: stuck || [] });
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const body = await request.json().catch(() => ({}));
  const minAgeMinutes = Math.max(0, Number(body.minAgeMinutes ?? 0));
  const limit = Math.min(200, Math.max(1, Number(body.limit ?? 50)));

  const admin = createUntypedAdminClient();
  const result = await reconcilePendingPayments(admin, {
    minAgeMinutes,
    limit,
  });

  return NextResponse.json({ ok: true, ...result });
}
