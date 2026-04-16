import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { sendQuoteConfirmation, sendNewLeadNotification } from "@/lib/resend";
import { notifyNewLead } from "@/lib/onesignal";
import { sendLeadSMS } from "@/lib/smsfactor";

interface DistributeResult {
  alreadyDistributed: boolean;
  matchedMovers: number;
}

/** Calculate lead price in cents from admin settings. */
async function calculatePriceCents(
  supabase: ReturnType<typeof createUntypedAdminClient>,
  category: string,
  departmentCode: string,
  volumeM3: number | null
): Promise<number> {
  try {
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).single();
    const s = (data?.data || {}) as Record<string, unknown>;

    const basePrices: Record<string, string> = {
      national: (s.priceNational as string) || "12.00",
      entreprise: (s.priceEntreprise as string) || "18.00",
      international: (s.priceInternational as string) || "25.00",
    };
    let price = parseFloat(basePrices[category] || basePrices.national);

    if (s.pricingMode === "smart") {
      const deptRules = (s.smartPricingDepartments as Array<{ code: string; percent: number }>) || [];
      const deptRule = deptRules.find((r) => r.code === departmentCode);
      if (deptRule) price *= 1 + deptRule.percent / 100;

      if (volumeM3) {
        const volRules = (s.smartPricingVolume as Array<{ minM3: number; maxM3: number; percent: number }>) || [];
        const volRule = volRules.find((r) => volumeM3 >= r.minM3 && volumeM3 <= r.maxM3);
        if (volRule) price *= 1 + volRule.percent / 100;
      }

      const seasonRules = (s.smartPricingSeasons as Array<{ startDate: string; endDate: string; percent: number }>) || [];
      const today = new Date().toISOString().slice(0, 10);
      const seasonRule = seasonRules.find((r) => r.startDate && r.endDate && today >= r.startDate && today <= r.endDate);
      if (seasonRule) price *= 1 + seasonRule.percent / 100;
    }

    return Math.round(price * 100);
  } catch {
    const defaults: Record<string, number> = { national: 1200, entreprise: 1800, international: 2500 };
    return defaults[category] || 1200;
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Distribute a lead to matching movers. Idempotent: skips if `distributed_at`
 * is already set. Sends mover notifications + client confirmation email.
 */
export async function distributeLead(quoteId: string): Promise<DistributeResult> {
  const supabase = createUntypedAdminClient();

  const { data: quote } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (!quote) throw new Error(`Quote ${quoteId} not found`);
  if (quote.distributed_at) return { alreadyDistributed: true, matchedMovers: 0 };

  // Atomic-ish reservation: stamp distributed_at first. Subsequent callers
  // will see it set and short-circuit.
  const { data: stamped } = await supabase
    .from("quote_requests")
    .update({ distributed_at: new Date().toISOString() })
    .eq("id", quoteId)
    .is("distributed_at", null)
    .select("id")
    .single();

  if (!stamped) return { alreadyDistributed: true, matchedMovers: 0 };

  const departmentCode = (quote.from_postal_code || "").slice(0, 2);
  const category = quote.category || "national";

  // Match by department
  const { data: regionMatches } = await supabase
    .from("company_regions")
    .select("company_id, categories")
    .eq("department_code", departmentCode);

  // Match by radius
  const { data: radiusRules } = await supabase
    .from("company_radius")
    .select("company_id, lat, lng, radius_km, move_types");

  const matchedCompanyIds = new Set<string>();
  regionMatches?.forEach((m) => {
    if (m.categories?.includes(category)) matchedCompanyIds.add(m.company_id);
  });

  const fromLat = Number(quote.from_lat) || 0;
  const fromLng = Number(quote.from_lng) || 0;
  if (fromLat && fromLng && radiusRules) {
    for (const rule of radiusRules) {
      if (!rule.move_types?.includes(category)) continue;
      if (haversineKm(fromLat, fromLng, rule.lat, rule.lng) <= rule.radius_km) {
        matchedCompanyIds.add(rule.company_id);
      }
    }
  }

  const companyIds = Array.from(matchedCompanyIds).slice(0, 6);
  if (companyIds.length === 0) return { alreadyDistributed: false, matchedMovers: 0 };

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, email_contact, phone, account_status")
    .in("id", companyIds)
    .in("account_status", ["active", "trial"]);

  if (!companies || companies.length === 0) return { alreadyDistributed: false, matchedMovers: 0 };

  const priceCents = await calculatePriceCents(
    supabase,
    category,
    departmentCode,
    quote.volume_m3 ? Number(quote.volume_m3) : null
  );

  const distributions = companies.map((company) => ({
    quote_request_id: quote.id,
    company_id: company.id,
    price_cents: priceCents,
    is_trial: company.account_status === "trial",
    status: "pending",
    competitor_count: companies.length - 1,
  }));

  await supabase.from("quote_distributions").insert(distributions);

  for (const company of companies) {
    await notifyNewLead(company.id, {
      id: quote.id,
      fromCity: quote.from_city || "",
      toCity: quote.to_city || "",
      moveDate: quote.move_date || undefined,
    }).catch(() => {});

    if (company.email_contact) {
      await sendNewLeadNotification(
        company.email_contact,
        company.name,
        quote.from_city || "",
        quote.to_city || "",
        quote.id
      ).catch(() => {});
    }

    if (company.phone) {
      await sendLeadSMS(company.phone, {
        fromCity: quote.from_city || "",
        toCity: quote.to_city || "",
        moveDate: quote.move_date || undefined,
      }).catch(() => {});
    }

    await supabase.from("notifications").insert({
      company_id: company.id,
      type: "new_lead",
      title: "Nouvelle demande de devis",
      body: `${quote.from_city || "?"} → ${quote.to_city || "?"}`,
      data: { quoteId: quote.id },
    });
  }

  if (quote.client_email) {
    await sendQuoteConfirmation(
      quote.client_email,
      `${quote.client_first_name || ""} ${quote.client_last_name || ""}`.trim() || quote.client_name || "Client",
      quote.from_city || "",
      quote.to_city || "",
      quote.prospect_id
    ).catch(() => {});
  }

  return { alreadyDistributed: false, matchedMovers: companies.length };
}
