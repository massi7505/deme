import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { ensureCompanyForUser } from "@/lib/ensure-company";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set(["30d", "90d", "180d", "365d"]);
const DAY_MS = 24 * 60 * 60 * 1000;

function parsePeriodDays(period: string | null): number {
  const p = period && VALID_PERIODS.has(period) ? period : "30d";
  return parseInt(p, 10);
}

type DistRow = {
  id: string;
  quote_request_id: string;
  price_cents: number | null;
  status: string;
  created_at: string;
  unlocked_at: string | null;
};

type QuoteRow = {
  id: string;
  from_city: string | null;
  to_city: string | null;
  category: string | null;
};

type TxnRow = {
  quote_distribution_id: string | null;
  amount_cents: number;
  status: string;
  type: string;
  created_at: string;
};

interface PeriodKPIs {
  received: number;
  unlocked: number;
  conversionRate: number; // 0–100
  spentCents: number;
}

interface CityRow {
  city: string;
  received: number;
  unlocked: number;
  conversionRate: number;
}

interface CategoryRow {
  category: string;
  received: number;
  unlocked: number;
  conversionRate: number;
}

function emptyKPIs(): PeriodKPIs {
  return { received: 0, unlocked: 0, conversionRate: 0, spentCents: 0 };
}

function computeConv(received: number, unlocked: number): number {
  return received > 0 ? Math.round((unlocked / received) * 100) : 0;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // 30 req/min/user — performance runs heavier multi-period queries than
  // the other dashboard GETs, so a tighter cap is warranted.
  const rl = await checkIpRateLimit(`${getClientIp(request)}:${user.id}`, "dashboard/performance", 60, 30);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
    );
  }

  const admin = createUntypedAdminClient();
  const company = await ensureCompanyForUser(admin, user.id, user.email || "");
  if (!company) {
    return NextResponse.json({ error: "Impossible d'initialiser le compte" }, { status: 500 });
  }
  const companyId = company.id as string;

  const periodParam = request.nextUrl.searchParams.get("period");
  const days = parsePeriodDays(periodParam);
  const now = Date.now();
  const currentStart = now - days * DAY_MS;
  const previousStart = now - 2 * days * DAY_MS;
  const previousStartIso = new Date(previousStart).toISOString();

  // Fetch distributions for the wider window (previous + current).
  // status='unlocked' means the mover bought the lead. created_at is when it
  // was distributed; unlocked_at is when payment confirmed.
  const { data: dists } = await admin
    .from("quote_distributions")
    .select("id, quote_request_id, price_cents, status, created_at, unlocked_at")
    .eq("company_id", companyId)
    .gte("created_at", previousStartIso);

  const distributions = (dists ?? []) as DistRow[];

  // Quotes lookup for city + category (only for distributions in window).
  const quoteIds = Array.from(new Set(distributions.map((d) => d.quote_request_id)));
  const quoteById: Record<string, QuoteRow> = {};
  if (quoteIds.length > 0) {
    const { data: quotes } = await admin
      .from("quote_requests")
      .select("id, from_city, to_city, category")
      .in("id", quoteIds);
    for (const q of (quotes ?? []) as QuoteRow[]) {
      quoteById[q.id] = q;
    }
  }

  // Transactions for the wider window — used to compute spend (deduplicated
  // by distribution like /api/dashboard/overview does).
  const { data: txns } = await admin
    .from("transactions")
    .select("quote_distribution_id, amount_cents, status, type, created_at")
    .eq("company_id", companyId)
    .eq("status", "paid")
    .in("type", ["unlock", "lead_purchase"])
    .gte("created_at", previousStartIso);

  const transactions = (txns ?? []) as TxnRow[];

  // Aggregate per period.
  const current = emptyKPIs();
  const previous = emptyKPIs();
  const cityCurrent: Record<string, { received: number; unlocked: number }> = {};
  const categoryCurrent: Record<string, { received: number; unlocked: number }> = {};

  for (const d of distributions) {
    const createdTs = new Date(d.created_at).getTime();
    const inCurrent = createdTs >= currentStart;
    const inPrevious = createdTs >= previousStart && createdTs < currentStart;
    if (!inCurrent && !inPrevious) continue;

    const bucket = inCurrent ? current : previous;
    bucket.received++;
    if (d.status === "unlocked") {
      bucket.unlocked++;
    }

    if (inCurrent) {
      const q = quoteById[d.quote_request_id];
      const city = q?.from_city || "—";
      if (!cityCurrent[city]) cityCurrent[city] = { received: 0, unlocked: 0 };
      cityCurrent[city].received++;
      if (d.status === "unlocked") cityCurrent[city].unlocked++;

      const cat = q?.category || "—";
      if (!categoryCurrent[cat]) categoryCurrent[cat] = { received: 0, unlocked: 0 };
      categoryCurrent[cat].received++;
      if (d.status === "unlocked") categoryCurrent[cat].unlocked++;
    }
  }

  // Spent: sum paid txns, deduped by distribution_id (a single lead can
  // have multiple txn rows if Mollie retried — keep the highest amount).
  const txnByDist = new Map<string, { amount_cents: number; created_at: string }>();
  for (const t of transactions) {
    if (!t.quote_distribution_id || t.amount_cents <= 0) continue;
    const existing = txnByDist.get(t.quote_distribution_id);
    if (!existing || t.amount_cents > existing.amount_cents) {
      txnByDist.set(t.quote_distribution_id, {
        amount_cents: t.amount_cents,
        created_at: t.created_at,
      });
    }
  }
  Array.from(txnByDist.values()).forEach(({ amount_cents, created_at }) => {
    const ts = new Date(created_at).getTime();
    if (ts >= currentStart) current.spentCents += amount_cents;
    else if (ts >= previousStart) previous.spentCents += amount_cents;
  });

  current.conversionRate = computeConv(current.received, current.unlocked);
  previous.conversionRate = computeConv(previous.received, previous.unlocked);

  // Top 10 departure cities (current period).
  const topCities: CityRow[] = Object.entries(cityCurrent)
    .map(([city, s]) => ({
      city,
      received: s.received,
      unlocked: s.unlocked,
      conversionRate: computeConv(s.received, s.unlocked),
    }))
    .sort((a, b) => b.received - a.received)
    .slice(0, 10);

  // All categories sorted by received.
  const byCategory: CategoryRow[] = Object.entries(categoryCurrent)
    .map(([category, s]) => ({
      category,
      received: s.received,
      unlocked: s.unlocked,
      conversionRate: computeConv(s.received, s.unlocked),
    }))
    .sort((a, b) => b.received - a.received);

  return NextResponse.json({
    period: `${days}d`,
    days,
    current,
    previous,
    topCities,
    byCategory,
  });
}
