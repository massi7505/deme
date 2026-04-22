import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const supabase = createUntypedAdminClient();

  const cutoff30dIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    companiesRes,
    companiesActiveRes,
    companiesTrialRes,
    leadsRes,
    leadsPendingVerifRes,
    leadsEmailVerifiedRes,
    leadsPhoneVerifiedRes,
    leadsBothVerifiedRes,
    distributionsUnlockedRes,
    distributionsPendingRes,
    transactionsAllRes,
    transactions30dRes,
    claimsRes,
    verification30dRes,
    defectCountRes,
  ] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("account_status", "active"),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("account_status", "trial"),
    supabase.from("quote_requests").select("id", { count: "exact", head: true }),
    supabase.from("quote_requests").select("id", { count: "exact", head: true }).is("distributed_at", null),
    supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("email_verified", true),
    supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("phone_verified", true),
    supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("email_verified", true).eq("phone_verified", true),
    supabase.from("quote_distributions").select("id", { count: "exact", head: true }).eq("status", "unlocked"),
    supabase.from("quote_distributions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("transactions").select("amount_cents, company_id").eq("status", "paid").in("type", ["unlock", "lead_purchase"]),
    supabase.from("transactions").select("amount_cents, created_at").eq("status", "paid").in("type", ["unlock", "lead_purchase"]).gte("created_at", cutoff30dIso),
    supabase.from("claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("quote_requests").select("created_at, distributed_at, email_verified, phone_verified").gte("created_at", cutoff30dIso),
    supabase.from("quote_requests").select("id", { count: "exact", head: true }).eq("defect_status", "suspected"),
  ]);

  // Total revenue (all-time, deduped per company would be too heavy — sum raw)
  const totalRevenue = (transactionsAllRes.data || []).reduce(
    (sum: number, t: { amount_cents: number }) => sum + (t.amount_cents || 0),
    0
  );

  // Revenue per company (for top movers)
  const revenuePerCompany: Record<string, number> = {};
  for (const t of (transactionsAllRes.data || []) as Array<{ amount_cents: number; company_id: string }>) {
    if (!t.company_id) continue;
    revenuePerCompany[t.company_id] = (revenuePerCompany[t.company_id] || 0) + (t.amount_cents || 0);
  }

  const topCompanyIds = Object.entries(revenuePerCompany)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let topMovers: Array<{ id: string; name: string; city: string | null; revenue: number }> = [];
  if (topCompanyIds.length > 0) {
    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, name, city")
      .in("id", topCompanyIds);
    if (companiesData) {
      const map: Record<string, { name: string; city: string | null }> = {};
      for (const c of companiesData as Array<{ id: string; name: string; city: string | null }>) {
        map[c.id] = { name: c.name, city: c.city };
      }
      topMovers = topCompanyIds
        .filter((id) => map[id])
        .map((id) => ({
          id,
          name: map[id].name,
          city: map[id].city,
          revenue: revenuePerCompany[id],
        }));
    }
  }

  // 30-day revenue + sparkline
  const dailyRevenue: Record<string, number> = {};
  let revenue30d = 0;
  for (const t of (transactions30dRes.data || []) as Array<{ amount_cents: number; created_at: string }>) {
    revenue30d += t.amount_cents || 0;
    const day = t.created_at.slice(0, 10);
    dailyRevenue[day] = (dailyRevenue[day] || 0) + (t.amount_cents || 0);
  }
  const sparkline: Array<{ date: string; cents: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    sparkline.push({ date: d, cents: dailyRevenue[d] || 0 });
  }

  // Platform conversion rate: unlocked distributions / total distributions
  const totalUnlocked = distributionsUnlockedRes.count || 0;
  const totalPending = distributionsPendingRes.count || 0;
  const totalDistributions = totalUnlocked + totalPending;
  const conversionRate = totalDistributions > 0 ? Math.round((totalUnlocked / totalDistributions) * 100) : 0;

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

  // Verification stats: only meaningful for leads created after the feature
  // shipped (005 migration added verification columns). Past leads have
  // email_verified/phone_verified = false by backfill default.
  const verif30d = (verification30dRes.data || []) as Array<{
    created_at: string;
    distributed_at: string | null;
    email_verified: boolean | null;
    phone_verified: boolean | null;
  }>;
  const v30Total = verif30d.length;
  const v30Distributed = verif30d.filter((l) => l.distributed_at).length;
  const v30EmailOnly = verif30d.filter((l) => l.email_verified && !l.phone_verified).length;
  const v30PhoneOnly = verif30d.filter((l) => !l.email_verified && l.phone_verified).length;
  const v30Both = verif30d.filter((l) => l.email_verified && l.phone_verified).length;
  const v30None = verif30d.filter((l) => !l.email_verified && !l.phone_verified).length;
  const verificationRate30d = v30Total > 0 ? Math.round((v30Distributed / v30Total) * 100) : 0;

  return NextResponse.json({
    stats: {
      companies: companiesRes.count || 0,
      companiesActive: companiesActiveRes.count || 0,
      companiesTrial: companiesTrialRes.count || 0,
      leads: leadsRes.count || 0,
      leadsPendingVerif: leadsPendingVerifRes.count || 0,
      leadsEmailVerified: leadsEmailVerifiedRes.count || 0,
      leadsPhoneVerified: leadsPhoneVerifiedRes.count || 0,
      leadsBothVerified: leadsBothVerifiedRes.count || 0,
      distributionsUnlocked: totalUnlocked,
      distributionsPending: totalPending,
      conversionRate,
      revenue: totalRevenue,
      revenue30d,
      pendingClaims: claimsRes.count || 0,
      defectCount: defectCountRes.count || 0,
      sparkline,
      topMovers,
      verification30d: {
        total: v30Total,
        distributed: v30Distributed,
        emailOnly: v30EmailOnly,
        phoneOnly: v30PhoneOnly,
        both: v30Both,
        none: v30None,
        rate: verificationRate30d,
      },
    },
    recentCompanies: recentCompanies || [],
    recentLeads: recentLeads || [],
  });
}
