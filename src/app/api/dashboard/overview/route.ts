import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();

  // Get company
  const { data: company } = await admin
    .from("companies")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Aucune entreprise trouvée" }, { status: 404 });
  }

  // Get profile
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get distributions (leads) for this company
  const { data: distributions } = await admin
    .from("quote_distributions")
    .select("id, quote_request_id, price_cents, is_trial, status, unlocked_at, competitor_count, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  // Get quote_requests for the distributions
  const quoteIds = (distributions || []).map((d: { quote_request_id: string }) => d.quote_request_id);
  const quotes: Record<string, Record<string, unknown>> = {};

  if (quoteIds.length > 0) {
    const { data: quotesData } = await admin
      .from("quote_requests")
      .select("*")
      .in("id", quoteIds);

    if (quotesData) {
      for (const q of quotesData) {
        quotes[q.id] = q;
      }
    }
  }

  // Count unlocks per quote_request to enforce max 6
  const unlockCounts: Record<string, number> = {};
  if (quoteIds.length > 0) {
    const { data: allDistributions } = await admin
      .from("quote_distributions")
      .select("quote_request_id, status")
      .in("quote_request_id", quoteIds)
      .eq("status", "unlocked");

    if (allDistributions) {
      for (const d of allDistributions) {
        unlockCounts[d.quote_request_id] = (unlockCounts[d.quote_request_id] || 0) + 1;
      }
    }
  }

  const MAX_UNLOCKS = 6;

  // Build leads list — hide leads that reached max unlocks (unless this mover already unlocked it)
  const allLeads = (distributions || []).map((d: Record<string, unknown>) => {
    const quote = quotes[d.quote_request_id as string] || {};
    const totalUnlocks = unlockCounts[d.quote_request_id as string] || 0;
    const isOwnUnlocked = d.status === "unlocked";
    const isSoldOut = totalUnlocks >= MAX_UNLOCKS && !isOwnUnlocked;

    return {
      distributionId: d.id,
      quoteRequestId: d.quote_request_id,
      priceCents: d.price_cents,
      isTrial: false, // No more free trials
      status: d.status,
      unlockedAt: d.unlocked_at,
      competitorCount: d.competitor_count,
      totalUnlocks,
      maxUnlocks: MAX_UNLOCKS,
      isSoldOut,
      createdAt: d.created_at,
      // Quote info
      prospectId: quote.prospect_id,
      // Avant achat : initiale nom + prénom (B. Massinissa). Après achat : nom complet
      clientName: d.status === "unlocked" ? quote.client_name : null,
      clientPhone: d.status === "unlocked" ? quote.client_phone : null,
      clientEmail: d.status === "unlocked" ? quote.client_email : null,
      clientSalutation: d.status === "unlocked" ? quote.client_salutation : null,
      clientFirstName: quote.client_first_name || null,
      clientLastName: d.status === "unlocked" ? quote.client_last_name : (quote.client_last_name ? (quote.client_last_name as string)[0] + "." : null),
      // Adresses - complètes si déverrouillé, code postal + ville toujours visibles
      fromAddress: d.status === "unlocked" ? quote.from_address : null,
      fromCity: quote.from_city,
      fromPostalCode: quote.from_postal_code,
      toAddress: d.status === "unlocked" ? quote.to_address : null,
      toCity: quote.to_city,
      toPostalCode: quote.to_postal_code,
      moveDate: quote.move_date,
      category: quote.category,
      volumeM3: quote.volume_m3,
      roomCount: quote.room_count,
      fromHousingType: quote.from_housing_type,
      fromFloor: quote.from_floor,
      fromElevator: quote.from_elevator,
      toHousingType: quote.to_housing_type,
      toFloor: quote.to_floor,
      toElevator: quote.to_elevator,
      emailVerified: quote.email_verified ?? false,
      phoneVerified: quote.phone_verified ?? false,
    };
  });

  // Filter out sold-out leads (max 6 unlocks reached, mover hasn't unlocked)
  const leads = allLeads.filter((l: { isSoldOut: boolean }) => !l.isSoldOut);

  // Stats
  const totalLeads = leads.length;
  const unlockedLeads = leads.filter((l) => l.status === "unlocked").length;
  const pendingLeads = leads.filter((l) => l.status === "pending").length;
  const conversionRate = totalLeads > 0 ? Math.round((unlockedLeads / totalLeads) * 100) : 0;

  // Revenue from actual paid transactions (deduplicated per lead, same logic as billing)
  const { data: paidTxns } = await admin
    .from("transactions")
    .select("quote_distribution_id, amount_cents, status, type, created_at")
    .eq("company_id", company.id)
    .eq("status", "paid")
    .in("type", ["unlock", "lead_purchase"]);

  const seenDists = new Set<string>();
  let revenue = 0;
  let revenue30d = 0;
  const cutoff30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const dailyRevenue: Record<string, number> = {}; // YYYY-MM-DD → cents
  for (const t of (paidTxns || []) as Array<{ quote_distribution_id: string; amount_cents: number; created_at: string }>) {
    if (t.quote_distribution_id && seenDists.has(t.quote_distribution_id)) continue;
    if (t.quote_distribution_id) seenDists.add(t.quote_distribution_id);
    if (t.amount_cents > 0) revenue += t.amount_cents;
    const ts = new Date(t.created_at).getTime();
    if (ts >= cutoff30d && t.amount_cents > 0) {
      revenue30d += t.amount_cents;
      const day = t.created_at.slice(0, 10);
      dailyRevenue[day] = (dailyRevenue[day] || 0) + t.amount_cents;
    }
  }

  // 30-day activity: leads received + leads unlocked, per day.
  const dailyReceived: Record<string, number> = {};
  const dailyUnlocked: Record<string, number> = {};
  let unlocked30d = 0;
  for (const l of leads as Array<{ createdAt: string; status: string; unlockedAt?: string | null }>) {
    const createdTs = new Date(l.createdAt).getTime();
    if (createdTs >= cutoff30d) {
      const day = l.createdAt.slice(0, 10);
      dailyReceived[day] = (dailyReceived[day] || 0) + 1;
    }
    if (l.status === "unlocked" && l.unlockedAt) {
      const unlockTs = new Date(l.unlockedAt).getTime();
      if (unlockTs >= cutoff30d) {
        const day = l.unlockedAt.slice(0, 10);
        dailyUnlocked[day] = (dailyUnlocked[day] || 0) + 1;
        unlocked30d++;
      }
    }
  }
  const activity30d: Array<{ date: string; received: number; unlocked: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    activity30d.push({
      date: d,
      received: dailyReceived[d] || 0,
      unlocked: dailyUnlocked[d] || 0,
    });
  }

  // Top 3 departure cities + avg lead price (from unlocked leads)
  const cityCounts: Record<string, number> = {};
  let priceSum = 0;
  let priceCount = 0;
  for (const l of leads as Array<{ status: string; fromCity: string | null; priceCents: number; createdAt: string }>) {
    if (l.status === "unlocked" && l.fromCity) {
      cityCounts[l.fromCity] = (cityCounts[l.fromCity] || 0) + 1;
    }
    if (typeof l.priceCents === "number" && l.priceCents > 0) {
      priceSum += l.priceCents;
      priceCount++;
    }
  }
  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([city, count]) => ({ city, count }));
  const avgLeadPriceCents = priceCount > 0 ? Math.round(priceSum / priceCount) : 0;

  // Leads in last 30 days
  const leads30d = (leads as Array<{ createdAt: string }>).filter(
    (l) => new Date(l.createdAt).getTime() >= cutoff30d
  ).length;

  // Get notifications
  const { data: notifications } = await admin
    .from("notifications")
    .select("*")
    .eq("company_id", company.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    profile,
    company,
    leads,
    stats: {
      totalLeads,
      unlockedLeads,
      pendingLeads,
      conversionRate,
      revenue,
      revenue30d,
      leads30d,
      unlocked30d,
      avgLeadPriceCents,
      topCities,
      activity30d,
    },
    notifications: notifications || [],
  });
}
