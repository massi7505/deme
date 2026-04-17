import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient;

const LOOKBACK_DAYS = 30;
const MAX_BACKFILL = 6;
const MAX_UNLOCKS_PER_LEAD = 6;

/**
 * Ensure a newly-onboarded mover can see existing leads in their zones.
 * Looks up recent quote_requests matching the mover's departments/categories
 * and creates pending distributions for ones they're not already on (and that
 * still have unlock capacity). Idempotent — safe to run repeatedly.
 */
export async function backfillLeadsForCompany(
  admin: Admin,
  companyId: string
): Promise<{ added: number }> {
  const { data: regions } = await admin
    .from("company_regions")
    .select("department_code, categories")
    .eq("company_id", companyId);

  if (!regions || regions.length === 0) return { added: 0 };

  const categoriesByDept: Record<string, Set<string>> = {};
  for (const r of regions as Array<{ department_code: string; categories: string[] }>) {
    const set = categoriesByDept[r.department_code] || new Set<string>();
    (r.categories || []).forEach((c) => set.add(c));
    categoriesByDept[r.department_code] = set;
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: quotes } = await admin
    .from("quote_requests")
    .select("id, category, from_postal_code, volume_m3")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!quotes || quotes.length === 0) return { added: 0 };

  const candidates = (quotes as Array<{ id: string; category: string; from_postal_code: string | null }>).filter(
    (q) => {
      const dept = (q.from_postal_code || "").slice(0, 2);
      const cats = categoriesByDept[dept];
      if (!cats) return false;
      return cats.has(q.category || "national");
    }
  );

  if (candidates.length === 0) return { added: 0 };

  const candidateIds = candidates.map((q) => q.id);

  const { data: existingDists } = await admin
    .from("quote_distributions")
    .select("quote_request_id, company_id, status")
    .in("quote_request_id", candidateIds);

  const alreadyMine = new Set<string>();
  const unlockCounts: Record<string, number> = {};
  for (const d of (existingDists || []) as Array<{ quote_request_id: string; company_id: string; status: string }>) {
    if (d.company_id === companyId) alreadyMine.add(d.quote_request_id);
    if (d.status === "unlocked") {
      unlockCounts[d.quote_request_id] = (unlockCounts[d.quote_request_id] || 0) + 1;
    }
  }

  const eligible = candidates
    .filter((q) => !alreadyMine.has(q.id))
    .filter((q) => (unlockCounts[q.id] || 0) < MAX_UNLOCKS_PER_LEAD)
    .slice(0, MAX_BACKFILL);

  if (eligible.length === 0) return { added: 0 };

  const { data: settingsRow } = await admin
    .from("site_settings")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  const settings = (settingsRow?.data || {}) as Record<string, string>;
  const basePriceEuros: Record<string, string> = {
    national: settings.priceNational || "12.00",
    entreprise: settings.priceEntreprise || "18.00",
    international: settings.priceInternational || "25.00",
  };

  const rows = eligible.map((q) => {
    const cat = q.category || "national";
    const euros = parseFloat(basePriceEuros[cat] || basePriceEuros.national);
    return {
      quote_request_id: q.id,
      company_id: companyId,
      price_cents: Math.round(euros * 100),
      is_trial: false,
      status: "pending",
      competitor_count: 0,
    };
  });

  const { error } = await admin.from("quote_distributions").insert(rows);
  if (error) {
    console.error("[backfillLeadsForCompany] insert failed:", error.message);
    return { added: 0 };
  }

  return { added: rows.length };
}
