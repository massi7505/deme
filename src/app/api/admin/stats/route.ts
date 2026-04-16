import { NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createUntypedAdminClient();

  const [companiesRes, leadsRes, transactionsRes, claimsRes] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("quote_requests")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("transactions")
        .select("amount_cents")
        .eq("status", "paid"),
      supabase
        .from("claims")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  const totalRevenue = (transactionsRes.data || []).reduce(
    (sum: number, t: { amount_cents: number }) => sum + t.amount_cents,
    0
  );

  // Recent companies
  const { data: recentCompanies } = await supabase
    .from("companies")
    .select("id, name, city, account_status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent leads
  const { data: recentLeads } = await supabase
    .from("quote_requests")
    .select("id, prospect_id, from_city, to_city, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    stats: {
      companies: companiesRes.count || 0,
      leads: leadsRes.count || 0,
      revenue: totalRevenue,
      pendingClaims: claimsRes.count || 0,
    },
    recentCompanies: recentCompanies || [],
    recentLeads: recentLeads || [],
  });
}
