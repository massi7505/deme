import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient;

/** SHA-256 hash of a normalized email, hex-encoded. Matches the `digest`
 *  call inside the DB RPC for symmetry so the admin can recompute from a
 *  plain email to look up past requests. */
export function hashEmail(email: string): string {
  return crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export interface ClientQuote {
  id: string;
  prospect_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
  from_city: string | null;
  to_city: string | null;
  from_address: string | null;
  to_address: string | null;
  move_date: string | null;
  category: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface ClientSearchResult {
  quotes: ClientQuote[];
  resolvedEmail: string | null;
}

/**
 * Look up all quote_requests for a client by email (preferred — uses the
 * normalized column) or by prospect_id. Already-anonymized rows
 * (email starts with 'deleted-' and domain '@anonymized.local') are
 * filtered out so the admin doesn't re-process ghost clients.
 */
export async function findClientQuotes(
  admin: Admin,
  params: { email?: string; prospectId?: string }
): Promise<ClientSearchResult> {
  const email = params.email?.trim().toLowerCase();
  const prospectId = params.prospectId?.trim();

  if (!email && !prospectId) {
    return { quotes: [], resolvedEmail: null };
  }

  let query = admin
    .from("quote_requests")
    .select(
      "id, prospect_id, client_name, client_email, client_phone, client_first_name, client_last_name, from_city, to_city, from_address, to_address, move_date, category, status, notes, created_at"
    )
    .order("created_at", { ascending: false });

  if (email) {
    query = query.eq("client_email_normalized", email);
  } else if (prospectId) {
    query = query.eq("prospect_id", prospectId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = ((data || []) as ClientQuote[]).filter(
    (q) =>
      !(q.client_email || "").endsWith("@anonymized.local")
  );

  const resolvedEmail =
    email || rows[0]?.client_email?.toLowerCase() || null;

  return { quotes: rows, resolvedEmail };
}

export interface ClientExport {
  exportedAt: string;
  requestedFor: string;
  quoteRequests: ClientQuote[];
  distributions: Array<{
    id: string;
    quote_request_id: string;
    status: string;
    price_cents: number;
    unlocked_at: string | null;
    created_at: string;
    company_name: string | null;
  }>;
  reviews: Array<{
    id: string;
    quote_request_id: string | null;
    rating: number;
    comment: string | null;
    reviewer_name: string | null;
    is_anonymous: boolean;
    created_at: string;
    company_name: string | null;
  }>;
  reviewTokens: Array<{
    token: string;
    quote_request_id: string;
    company_id: string;
    expires_at: string;
    used_at: string | null;
    created_at: string;
  }>;
  rateLimitEventSummary: { count: number; endpoints: string[] };
}

/**
 * Build the full GDPR export payload. Returns empty arrays when nothing
 * is found, so the route always has a well-formed object to stream.
 */
export async function buildClientExport(
  admin: Admin,
  params: { email?: string; prospectId?: string }
): Promise<ClientExport> {
  const { quotes, resolvedEmail } = await findClientQuotes(admin, params);
  const quoteIds = quotes.map((q) => q.id);

  let distributions: ClientExport["distributions"] = [];
  let reviews: ClientExport["reviews"] = [];
  let reviewTokens: ClientExport["reviewTokens"] = [];
  let rateLimitCount = 0;
  let rateLimitEndpoints: string[] = [];

  if (quoteIds.length > 0) {
    const { data: distRows } = await admin
      .from("quote_distributions")
      .select("id, quote_request_id, status, price_cents, unlocked_at, created_at, company_id")
      .in("quote_request_id", quoteIds);

    const companyIds = Array.from(
      new Set(
        ((distRows || []) as Array<{ company_id: string | null }>)
          .map((d) => d.company_id)
          .filter(Boolean)
      )
    ) as string[];

    const companyNameMap: Record<string, string> = {};
    if (companyIds.length > 0) {
      const { data: companies } = await admin
        .from("companies")
        .select("id, name")
        .in("id", companyIds);
      for (const c of (companies || []) as Array<{ id: string; name: string }>) {
        companyNameMap[c.id] = c.name;
      }
    }

    distributions = ((distRows || []) as Array<{
      id: string;
      quote_request_id: string;
      status: string;
      price_cents: number;
      unlocked_at: string | null;
      created_at: string;
      company_id: string | null;
    }>).map((d) => ({
      id: d.id,
      quote_request_id: d.quote_request_id,
      status: d.status,
      price_cents: d.price_cents,
      unlocked_at: d.unlocked_at,
      created_at: d.created_at,
      company_name: d.company_id ? companyNameMap[d.company_id] || null : null,
    }));

    const { data: rvRows } = await admin
      .from("reviews")
      .select("id, quote_request_id, rating, comment, reviewer_name, is_anonymous, created_at, company_id")
      .in("quote_request_id", quoteIds);

    reviews = ((rvRows || []) as Array<{
      id: string;
      quote_request_id: string | null;
      rating: number;
      comment: string | null;
      reviewer_name: string | null;
      is_anonymous: boolean;
      created_at: string;
      company_id: string | null;
    }>).map((r) => ({
      id: r.id,
      quote_request_id: r.quote_request_id,
      rating: r.rating,
      comment: r.comment,
      reviewer_name: r.reviewer_name,
      is_anonymous: r.is_anonymous,
      created_at: r.created_at,
      company_name: r.company_id ? companyNameMap[r.company_id] || null : null,
    }));

    const { data: tokenRows } = await admin
      .from("review_tokens")
      .select("token, quote_request_id, company_id, expires_at, used_at, created_at")
      .in("quote_request_id", quoteIds);

    reviewTokens = (tokenRows || []) as ClientExport["reviewTokens"];

    // Rate-limit summary: count events within ±2h of each quote creation
    // for the public form endpoints. Avoid exposing raw IPs (they can be
    // shared by unrelated users).
    //
    // Dedup by row id: two quotes created within 4h of each other produce
    // overlapping windows; a single event would otherwise be counted twice,
    // inflating the CNIL-facing number.
    const windows = quotes.map((q) => ({
      lo: new Date(new Date(q.created_at).getTime() - 2 * 3600_000).toISOString(),
      hi: new Date(new Date(q.created_at).getTime() + 2 * 3600_000).toISOString(),
    }));
    const endpointSet = new Set<string>();
    const eventIdSet = new Set<string>();
    for (const w of windows) {
      const { data: rlRows } = await admin
        .from("rate_limit_events")
        .select("id, endpoint")
        .gte("created_at", w.lo)
        .lte("created_at", w.hi)
        .in("endpoint", ["quotes", "verify-email", "verify-phone"]);
      for (const r of (rlRows || []) as Array<{ id: string; endpoint: string }>) {
        if (eventIdSet.has(r.id)) continue;
        eventIdSet.add(r.id);
        endpointSet.add(r.endpoint);
      }
    }
    rateLimitCount = eventIdSet.size;
    rateLimitEndpoints = Array.from(endpointSet);
  }

  return {
    exportedAt: new Date().toISOString(),
    requestedFor: resolvedEmail || params.prospectId || "",
    quoteRequests: quotes,
    distributions,
    reviews,
    reviewTokens,
    rateLimitEventSummary: {
      count: rateLimitCount,
      endpoints: rateLimitEndpoints,
    },
  };
}
