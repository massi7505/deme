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
      clientName: d.status === "unlocked" ? quote.client_name : null,
      clientPhone: d.status === "unlocked" ? quote.client_phone : null,
      clientEmail: d.status === "unlocked" ? quote.client_email : null,
      clientSalutation: d.status === "unlocked" ? quote.client_salutation : null,
      clientFirstName: d.status === "unlocked" ? quote.client_first_name : null,
      clientLastName: d.status === "unlocked" ? quote.client_last_name : null,
      // Adresses - complètes si déverrouillé, ville seulement sinon
      fromAddress: d.status === "unlocked" ? quote.from_address : null,
      fromCity: quote.from_city,
      fromPostalCode: d.status === "unlocked" ? quote.from_postal_code : null,
      toAddress: d.status === "unlocked" ? quote.to_address : null,
      toCity: quote.to_city,
      toPostalCode: d.status === "unlocked" ? quote.to_postal_code : null,
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
      phoneVerified: quote.phone_verified ?? false,
    };
  });

  // Filter out sold-out leads (max 6 unlocks reached, mover hasn't unlocked)
  const leads = allLeads.filter((l: { isSoldOut: boolean }) => !l.isSoldOut);

  // Stats
  const totalLeads = leads.length;
  const unlockedLeads = leads.filter((l) => l.status === "unlocked").length;
  const conversionRate = totalLeads > 0 ? Math.round((unlockedLeads / totalLeads) * 100) : 0;

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
      conversionRate,
      revenue: leads
        .filter((l) => l.status === "unlocked")
        .reduce((sum: number, l) => sum + (Number(l.priceCents) || 0), 0),
    },
    notifications: notifications || [],
  });
}
