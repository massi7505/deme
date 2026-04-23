# GDPR Client Export + Anonymize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin a single `/admin/gdpr` page to search a client (quote-form submitter), export their personal data as JSON, and anonymize it across every table that holds their PII — with a SHA-256-hashed audit log for CNIL proof.

**Architecture:** One admin page + 3 API routes (`search+history`, `export`, `anonymize`). One new DB table `gdpr_requests` + one plpgsql RPC `anonymize_quote_request` that bundles the multi-table anonymize into a single transaction. Existing `requireAdmin` guard reused; new `getAdminEmailFromRequest` helper added so the audit log captures who acted.

**Tech Stack:** Next.js 14 App Router, Supabase (plpgsql RPC + `createUntypedAdminClient`), Node `crypto.createHash` for SHA-256, shadcn/ui + react-hot-toast for the admin page. No test harness — Task 9 is a manual acceptance walkthrough.

---

## File Structure

**Create:**
- `supabase/migrations/026_gdpr_requests.sql` — `gdpr_requests` table + `anonymize_quote_request(uuid)` plpgsql RPC
- `src/lib/gdpr.ts` — pure helpers: `hashEmail(email)`, `collectClientData(admin, email, prospectId)`
- `src/app/api/admin/gdpr/route.ts` — `GET` = last 50 history rows, `POST` action=search
- `src/app/api/admin/gdpr/export/route.ts` — `POST` returns the JSON as a download
- `src/app/api/admin/gdpr/anonymize/route.ts` — `POST` calls the RPC + logs
- `src/app/admin/gdpr/page.tsx` — the UI

**Modify:**
- `src/lib/admin-auth.ts` — add `getAdminEmailFromRequest(request)` parsing the existing `admin_token` cookie
- `src/app/admin/layout.tsx` — add GDPR entry to `ADMIN_NAV`

Each file has one responsibility. The RPC is the only non-trivial SQL — it must run atomically so partial failures never leak PII.

---

## Task 1: Migration 026 — audit table + anonymize RPC

**Files:**
- Create: `supabase/migrations/026_gdpr_requests.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 026_gdpr_requests.sql
-- GDPR audit log + one-shot anonymizer for a client's quote_request.

-- pgcrypto already enabled in 001_initial_schema.sql; digest() available.

CREATE TABLE IF NOT EXISTS gdpr_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action        text NOT NULL CHECK (action IN ('export', 'anonymize')),
  email_hash    text NOT NULL,
  admin_email   text NOT NULL,
  affected_rows int  NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_email_hash
  ON gdpr_requests (email_hash);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created_at
  ON gdpr_requests (created_at DESC);

-- Anonymize one quote_request end-to-end in a single transaction.
-- Returns counts for the audit log. The function runs with the caller's
-- privileges; the service-role key we use on the API side has full access.
CREATE OR REPLACE FUNCTION anonymize_quote_request(p_quote_request_id uuid)
RETURNS TABLE (
  quote_requests_updated int,
  reviews_updated        int,
  review_tokens_deleted  int,
  rate_limit_deleted     int
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_qr_count int := 0;
  v_rv_count int := 0;
  v_rt_count int := 0;
  v_rl_count int := 0;
  v_created_at timestamptz;
BEGIN
  -- Capture the creation timestamp for the rate-limit heuristic.
  SELECT created_at INTO v_created_at
    FROM quote_requests
    WHERE id = p_quote_request_id;

  IF v_created_at IS NULL THEN
    -- Row doesn't exist — caller is responsible for surfacing this.
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;

  -- 1. Redact PII on quote_requests
  UPDATE quote_requests
  SET
    client_name            = '[supprimé]',
    client_first_name      = '[supprimé]',
    client_last_name       = '[supprimé]',
    client_email           = 'deleted-' || id::text || '@anonymized.local',
    client_email_normalized= 'deleted-' || id::text || '@anonymized.local',
    client_phone           = '+00000000000',
    client_phone_normalized= '+00000000000',
    from_address           = '[supprimé]',
    to_address             = '[supprimé]',
    notes                  = NULL,
    updated_at             = now()
  WHERE id = p_quote_request_id;
  GET DIAGNOSTICS v_qr_count = ROW_COUNT;

  -- 2. Anonymize any reviews tied to this quote
  UPDATE reviews
  SET reviewer_name = '[Anonyme]'
  WHERE quote_request_id = p_quote_request_id;
  GET DIAGNOSTICS v_rv_count = ROW_COUNT;

  -- 3. Hard-delete review_tokens for this quote (the token itself is PII)
  DELETE FROM review_tokens
  WHERE quote_request_id = p_quote_request_id;
  GET DIAGNOSTICS v_rt_count = ROW_COUNT;

  -- 4. Delete rate_limit_events within ±2h of the quote creation, for the
  -- public form endpoints. Over-deletion is acceptable; under-deletion
  -- leaks an IP. Guarded with a to_regclass check so the function stays
  -- safe in environments where the table was never created.
  IF to_regclass('public.rate_limit_events') IS NOT NULL THEN
    DELETE FROM rate_limit_events
    WHERE endpoint IN ('quotes', 'verify-email', 'verify-phone')
      AND created_at BETWEEN v_created_at - interval '2 hours'
                         AND v_created_at + interval '2 hours';
    GET DIAGNOSTICS v_rl_count = ROW_COUNT;
  END IF;

  RETURN QUERY SELECT v_qr_count, v_rv_count, v_rt_count, v_rl_count;
END;
$$;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: `Applying migration 026_gdpr_requests.sql... OK`. If the CLI can't authenticate, paste the SQL into the Supabase dashboard SQL editor.

- [ ] **Step 3: Verify the table exists**

```bash
curl -s "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/gdpr_requests?select=id,action,email_hash,admin_email,affected_rows,created_at&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: `[]` (empty JSON array, because no rows yet). A `42P01 relation does not exist` error means the migration didn't apply.

- [ ] **Step 4: Verify the RPC is callable (smoke test with a non-existent id — should return all zeros)**

```bash
curl -s -X POST "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/rpc/anonymize_quote_request" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_quote_request_id":"00000000-0000-0000-0000-000000000000"}'
```

Expected output (the row doesn't exist so nothing was touched):

```json
[{"quote_requests_updated":0,"reviews_updated":0,"review_tokens_deleted":0,"rate_limit_deleted":0}]
```

- [ ] **Step 5: Commit**

```bash
git -C /c/Users/FX507/Downloads/demenagement24 add supabase/migrations/026_gdpr_requests.sql
git -C /c/Users/FX507/Downloads/demenagement24 commit -m "feat(db): migration 026 — gdpr_requests + anonymize_quote_request RPC"
```

---

## Task 2: Admin-auth helper — extract email from token

**Files:**
- Modify: `src/lib/admin-auth.ts` (add one exported function after `verifyAdminToken`)

- [ ] **Step 1: Add `getAdminEmailFromRequest`**

The existing token format is `base64(email:expiry:hmac)`. Reuse the decode logic but return the email when valid. Insert after the `verifyAdminToken` function (around line 53):

```ts
/**
 * Extract the admin email from a verified admin_token cookie. Returns null
 * when the token is missing or invalid. Used by audit-logging routes that
 * need to record WHO acted.
 */
export function getAdminEmailFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get("admin_token")?.value;
  if (!token || !verifyAdminToken(token)) return null;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [email] = decoded.split(":");
    return email || null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /c/Users/FX507/Downloads/demenagement24
npx tsc --noEmit --project tsconfig.json
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git -C /c/Users/FX507/Downloads/demenagement24 add src/lib/admin-auth.ts
git -C /c/Users/FX507/Downloads/demenagement24 commit -m "feat(admin-auth): getAdminEmailFromRequest helper for audit logs"
```

---

## Task 3: `src/lib/gdpr.ts` — hash + data collection helpers

**Files:**
- Create: `src/lib/gdpr.ts`

- [ ] **Step 1: Create the file**

```ts
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
    const windows = quotes.map((q) => ({
      lo: new Date(new Date(q.created_at).getTime() - 2 * 3600_000).toISOString(),
      hi: new Date(new Date(q.created_at).getTime() + 2 * 3600_000).toISOString(),
    }));
    const endpointSet = new Set<string>();
    for (const w of windows) {
      const { data: rlRows } = await admin
        .from("rate_limit_events")
        .select("endpoint")
        .gte("created_at", w.lo)
        .lte("created_at", w.hi)
        .in("endpoint", ["quotes", "verify-email", "verify-phone"]);
      for (const r of (rlRows || []) as Array<{ endpoint: string }>) {
        endpointSet.add(r.endpoint);
        rateLimitCount += 1;
      }
    }
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
```

- [ ] **Step 2: Type-check**

```bash
cd /c/Users/FX507/Downloads/demenagement24
npx tsc --noEmit --project tsconfig.json
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git -C /c/Users/FX507/Downloads/demenagement24 add src/lib/gdpr.ts
git -C /c/Users/FX507/Downloads/demenagement24 commit -m "feat(gdpr): lib/gdpr helpers — hashEmail, findClientQuotes, buildClientExport"
```

---

## Task 4: Search + history route — `/api/admin/gdpr`

**Files:**
- Create: `src/app/api/admin/gdpr/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { findClientQuotes } from "@/lib/gdpr";

const MAX_EMAIL_LEN = 320;
const MAX_PROSPECT_ID_LEN = 64;

/** GET /api/admin/gdpr — last 50 audit-log rows. */
export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const admin = createUntypedAdminClient();
  const { data, error } = await admin
    .from("gdpr_requests")
    .select("id, action, email_hash, admin_email, affected_rows, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ history: data || [] });
}

/** POST /api/admin/gdpr — search.
 *  Body: { email?: string, prospectId?: string } */
export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const prospectId = typeof body.prospectId === "string" ? body.prospectId.trim() : "";

  if (!email && !prospectId) {
    return NextResponse.json(
      { error: "Fournissez un email ou un prospect_id" },
      { status: 400 }
    );
  }
  if (email.length > MAX_EMAIL_LEN || prospectId.length > MAX_PROSPECT_ID_LEN) {
    return NextResponse.json({ error: "Entrée trop longue" }, { status: 400 });
  }

  const admin = createUntypedAdminClient();
  try {
    const result = await findClientQuotes(admin, { email, prospectId });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /c/Users/FX507/Downloads/demenagement24
npx tsc --noEmit --project tsconfig.json
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git -C /c/Users/FX507/Downloads/demenagement24 add src/app/api/admin/gdpr/route.ts
git -C /c/Users/FX507/Downloads/demenagement24 commit -m "feat(api/admin/gdpr): GET history + POST search"
```

---

## Task 5: Export route — `/api/admin/gdpr/export`

**Files:**
- Create: `src/app/api/admin/gdpr/export/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getAdminEmailFromRequest } from "@/lib/admin-auth";
import { buildClientExport, hashEmail } from "@/lib/gdpr";

const MAX_EMAIL_LEN = 320;
const MAX_PROSPECT_ID_LEN = 64;

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const prospectId = typeof body.prospectId === "string" ? body.prospectId.trim() : "";

  if (!email && !prospectId) {
    return NextResponse.json(
      { error: "Fournissez un email ou un prospect_id" },
      { status: 400 }
    );
  }
  if (email.length > MAX_EMAIL_LEN || prospectId.length > MAX_PROSPECT_ID_LEN) {
    return NextResponse.json({ error: "Entrée trop longue" }, { status: 400 });
  }

  const admin = createUntypedAdminClient();
  const adminEmail = getAdminEmailFromRequest(request) || "unknown";

  let payload;
  try {
    payload = await buildClientExport(admin, { email, prospectId });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  // Always log — even an empty export counts as "request handled in time".
  const emailHash = payload.requestedFor
    ? hashEmail(payload.requestedFor)
    : "";
  if (emailHash) {
    await admin.from("gdpr_requests").insert({
      action: "export",
      email_hash: emailHash,
      admin_email: adminEmail,
      affected_rows: 0,
      notes: typeof body.notes === "string" ? body.notes.slice(0, 500) : null,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const firstProspect = payload.quoteRequests[0]?.prospect_id || "unknown";
  const filename = `gdpr-export-${firstProspect}-${today}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 2: Type-check**

```bash
cd /c/Users/FX507/Downloads/demenagement24
npx tsc --noEmit --project tsconfig.json
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git -C /c/Users/FX507/Downloads/demenagement24 add src/app/api/admin/gdpr/export/route.ts
git -C /c/Users/FX507/Downloads/demenagement24 commit -m "feat(api/admin/gdpr/export): stream JSON export + audit log"
```

---

## Task 6: Anonymize route — `/api/admin/gdpr/anonymize`

**Files:**
- Create: `src/app/api/admin/gdpr/anonymize/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getAdminEmailFromRequest } from "@/lib/admin-auth";
import { hashEmail } from "@/lib/gdpr";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AnonymizeCounts {
  quote_requests_updated: number;
  reviews_updated: number;
  review_tokens_deleted: number;
  rate_limit_deleted: number;
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const body = await request.json().catch(() => ({}));
  const ids: unknown = body.quoteRequestIds;
  const confirmation = body.confirmation;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 500) : null;

  if (confirmation !== "ANONYMISER") {
    return NextResponse.json(
      { error: "Confirmation manquante (tapez ANONYMISER)" },
      { status: 400 }
    );
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Aucun quote_request_id" }, { status: 400 });
  }
  const idList = ids.filter((v): v is string => typeof v === "string" && UUID_RE.test(v));
  if (idList.length !== ids.length) {
    return NextResponse.json({ error: "UUID invalide dans la liste" }, { status: 400 });
  }

  const admin = createUntypedAdminClient();
  const adminEmail = getAdminEmailFromRequest(request) || "unknown";

  // Capture the original email BEFORE anonymization so we can hash it
  // for the audit log. Pick the first row's email (all ids in one request
  // should belong to the same client — enforced by the UI, not the API).
  const { data: preRows } = await admin
    .from("quote_requests")
    .select("id, client_email")
    .in("id", idList);

  const originalEmail =
    ((preRows || [])[0] as { client_email: string | null } | undefined)
      ?.client_email || null;

  const affected = {
    quoteRequests: 0,
    reviews: 0,
    reviewTokens: 0,
    rateLimitEvents: 0,
  };

  for (const id of idList) {
    const { data, error } = await admin.rpc("anonymize_quote_request", {
      p_quote_request_id: id,
    });
    if (error) {
      return NextResponse.json(
        { error: `RPC error on ${id}: ${error.message}` },
        { status: 500 }
      );
    }
    const row = (Array.isArray(data) ? data[0] : data) as AnonymizeCounts | null;
    if (row) {
      affected.quoteRequests += row.quote_requests_updated;
      affected.reviews += row.reviews_updated;
      affected.reviewTokens += row.review_tokens_deleted;
      affected.rateLimitEvents += row.rate_limit_deleted;
    }
  }

  const totalAffected =
    affected.quoteRequests +
    affected.reviews +
    affected.reviewTokens +
    affected.rateLimitEvents;

  await admin.from("gdpr_requests").insert({
    action: "anonymize",
    email_hash: originalEmail ? hashEmail(originalEmail) : "",
    admin_email: adminEmail,
    affected_rows: totalAffected,
    notes,
  });

  return NextResponse.json({
    success: true,
    affectedRows: affected,
    totalAffected,
  });
}
```

- [ ] **Step 2: Type-check**

```bash
cd /c/Users/FX507/Downloads/demenagement24
npx tsc --noEmit --project tsconfig.json
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git -C /c/Users/FX507/Downloads/demenagement24 add src/app/api/admin/gdpr/anonymize/route.ts
git -C /c/Users/FX507/Downloads/demenagement24 commit -m "feat(api/admin/gdpr/anonymize): RPC-backed anonymize + audit log"
```

---

## Task 7: Admin page `/admin/gdpr`

**Files:**
- Create: `src/app/admin/gdpr/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, formatDateShort, formatDate } from "@/lib/utils";
import {
  Search, Download, Trash2, ShieldAlert, RefreshCw, Loader2, X,
} from "lucide-react";
import toast from "react-hot-toast";

interface Quote {
  id: string;
  prospect_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  from_city: string | null;
  to_city: string | null;
  status: string;
  created_at: string;
}

interface HistoryRow {
  id: string;
  action: "export" | "anonymize";
  email_hash: string;
  admin_email: string;
  affected_rows: number;
  notes: string | null;
  created_at: string;
}

export default function AdminGdprPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"email" | "prospectId">("email");
  const [searching, setSearching] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [notes, setNotes] = useState("");

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/gdpr");
      if (res.ok) {
        const d = await res.json();
        setHistory(d.history || []);
      }
    } catch {
      toast.error("Impossible de charger l'historique");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setQuotes([]);
    setResolvedEmail(null);
    try {
      const body: { email?: string; prospectId?: string } = {};
      if (searchMode === "email") body.email = searchQuery.trim();
      else body.prospectId = searchQuery.trim();

      const res = await fetch("/api/admin/gdpr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || "Erreur");
        return;
      }
      setQuotes(d.quotes || []);
      setResolvedEmail(d.resolvedEmail || null);
      if ((d.quotes || []).length === 0) {
        toast("Aucune donnée trouvée");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSearching(false);
    }
  }

  async function handleExport() {
    if (quotes.length === 0) return;
    setExporting(true);
    try {
      const body: { email?: string; prospectId?: string } = {};
      if (resolvedEmail) body.email = resolvedEmail;
      else if (quotes[0].prospect_id) body.prospectId = quotes[0].prospect_id;

      const res = await fetch("/api/admin/gdpr/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Erreur export");
        return;
      }
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition") || "";
      const match = dispo.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `gdpr-export-${Date.now()}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé + tracé dans l'historique");
      loadHistory();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setExporting(false);
    }
  }

  async function handleAnonymize() {
    if (confirmText !== "ANONYMISER") {
      toast.error("Tapez ANONYMISER pour confirmer");
      return;
    }
    setAnonymizing(true);
    try {
      const res = await fetch("/api/admin/gdpr/anonymize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteRequestIds: quotes.map((q) => q.id),
          confirmation: "ANONYMISER",
          notes: notes || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || "Erreur anonymisation");
        return;
      }
      toast.success(
        `Anonymisation OK — ${d.totalAffected} lignes modifiées`
      );
      setConfirmOpen(false);
      setConfirmText("");
      setNotes("");
      setQuotes([]);
      setResolvedEmail(null);
      setSearchQuery("");
      loadHistory();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setAnonymizing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">RGPD</h2>
          <p className="text-sm text-muted-foreground">
            Export + anonymisation des données clients (art. 15 + 17)
          </p>
        </div>
      </div>

      {/* Zone 1 — Search */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b pb-3 mb-4">
          <Search className="h-4 w-4 text-[var(--brand-green)]" />
          <h3 className="text-sm font-semibold">Rechercher un client</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={searchMode}
            onChange={(e) => setSearchMode(e.target.value as "email" | "prospectId")}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="email">Email</option>
            <option value="prospectId">ID Prospect</option>
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={searchMode === "email" ? "client@example.com" : "59613706FR640240"}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="flex items-center gap-2 rounded-lg bg-brand-gradient px-5 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Rechercher
          </button>
        </div>
      </div>

      {/* Zone 2 — Detail + actions */}
      {quotes.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/40 p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-200 pb-3 mb-4">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold">
              {quotes.length} demande{quotes.length > 1 ? "s" : ""} trouvée{quotes.length > 1 ? "s" : ""}
              {resolvedEmail && <> — <span className="font-mono text-xs">{resolvedEmail}</span></>}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200/70">
                  <th className="text-left py-2 font-medium text-muted-foreground">Prospect</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Client</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Trajet</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Statut</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Créé le</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-b border-amber-100/70 last:border-0">
                    <td className="py-2 font-mono text-xs">{q.prospect_id || "—"}</td>
                    <td className="py-2">{q.client_name || "—"}</td>
                    <td className="py-2">{q.from_city || "?"} → {q.to_city || "?"}</td>
                    <td className="py-2"><span className="text-xs">{q.status}</span></td>
                    <td className="py-2 text-xs text-muted-foreground">{formatDateShort(q.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exporter les données (JSON)
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={anonymizing}
              className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Anonymiser
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !anonymizing && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Confirmer l&apos;anonymisation</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {quotes.length} demande{quotes.length > 1 ? "s" : ""} — irréversible
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={anonymizing}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <p className="text-sm text-gray-700">
                Cette action remplace toutes les PII du client ({resolvedEmail || "—"})
                par des placeholders, supprime ses tokens d&apos;avis et les events
                rate-limit associés. Les factures des déménageurs sont conservées
                (obligation comptable 10 ans) mais sans info client.
              </p>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Notes internes (facultatif)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Demande reçue par email le 23/04/2026"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  disabled={anonymizing}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Tapez <strong>ANONYMISER</strong> pour confirmer
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                  disabled={anonymizing}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t bg-gray-50 p-4">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={anonymizing}
                className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleAnonymize}
                disabled={anonymizing || confirmText !== "ANONYMISER"}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {anonymizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {anonymizing ? "Anonymisation..." : "Anonymiser définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone 3 — History */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[var(--brand-green)]" />
            <h3 className="text-sm font-semibold">Historique des demandes (50 dernières)</h3>
          </div>
          <button
            onClick={loadHistory}
            className="flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", historyLoading && "animate-spin")} />
            Actualiser
          </button>
        </div>

        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune demande RGPD traitée pour l&apos;instant
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Action</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Hash email</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Admin</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Lignes</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-2 text-xs">{formatDate(h.created_at)}</td>
                    <td className="py-2">
                      <span className={cn(
                        "text-xs font-semibold",
                        h.action === "anonymize" ? "text-red-600" : "text-blue-600"
                      )}>
                        {h.action === "anonymize" ? "Anonymisé" : "Exporté"}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-xs">{h.email_hash.slice(0, 8)}…</td>
                    <td className="py-2 text-xs">{h.admin_email}</td>
                    <td className="py-2 text-xs">{h.affected_rows}</td>
                    <td className="py-2 text-xs text-muted-foreground truncate max-w-[240px]">{h.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /c/Users/FX507/Downloads/demenagement24
npx tsc --noEmit --project tsconfig.json
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git -C /c/Users/FX507/Downloads/demenagement24 add src/app/admin/gdpr/page.tsx
git -C /c/Users/FX507/Downloads/demenagement24 commit -m "feat(admin/gdpr): page with search, export, anonymize, history"
```

---

## Task 8: Add GDPR to admin sidebar

**Files:**
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Add the import + nav entry**

In `src/app/admin/layout.tsx`, update the lucide-react import block to include `ShieldAlert` (around line 7-23):

Change:
```ts
import {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  AlertTriangle,
  Newspaper,
  FileEdit,
  Star,
  Settings,
  Truck,
  LogOut,
  ChevronLeft,
  BookOpenCheck,
  Menu,
  X,
} from "lucide-react";
```

to:
```ts
import {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  AlertTriangle,
  Newspaper,
  FileEdit,
  Star,
  Settings,
  Truck,
  LogOut,
  ChevronLeft,
  BookOpenCheck,
  Menu,
  X,
  ShieldAlert,
} from "lucide-react";
```

Then in the `ADMIN_NAV` array (around line 25-36), insert the GDPR entry right before `Settings`:

Change:
```ts
  { href: "/admin/reviews", label: "Avis", icon: Star },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];
```

to:
```ts
  { href: "/admin/reviews", label: "Avis", icon: Star },
  { href: "/admin/gdpr", label: "RGPD", icon: ShieldAlert },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];
```

- [ ] **Step 2: Type-check**

```bash
cd /c/Users/FX507/Downloads/demenagement24
npx tsc --noEmit --project tsconfig.json
```

Expected: exit 0.

- [ ] **Step 3: Commit + push (end-of-feature commit triggers Vercel deploy for Task 9)**

```bash
git -C /c/Users/FX507/Downloads/demenagement24 add src/app/admin/layout.tsx
git -C /c/Users/FX507/Downloads/demenagement24 commit -m "feat(admin): add RGPD entry to sidebar"
git -C /c/Users/FX507/Downloads/demenagement24 push origin master
```

---

## Task 9: Manual prod verification

**Goal:** exercise the full workflow against prod with a real seeded quote, then clean up so no test data lingers.

- [ ] **Step 1: Seed a throwaway quote directly via the REST API**

Use your own email + a bogus phone so the post-anonymize check is unambiguous.

```bash
APIKEY="<supabase service role key>"
curl -s -X POST "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/quote_requests" \
  -H "apikey: $APIKEY" -H "Authorization: Bearer $APIKEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{
    "prospect_id":"GDPRTEST20260423",
    "category":"national",
    "move_type":"appartement",
    "from_city":"Paris","from_postal_code":"75001","from_country":"FR",
    "to_city":"Lyon","to_postal_code":"69001","to_country":"FR",
    "client_name":"Test GDPR","client_email":"gdpr-test@example.com","client_email_normalized":"gdpr-test@example.com",
    "client_phone":"0600000000","client_phone_normalized":"33600000000",
    "from_address":"1 rue du Test","to_address":"2 rue du Test",
    "client_first_name":"Test","client_last_name":"GDPR","status":"new","source":"website"
  }'
```

Save the returned `id` — call it `SEED_ID`.

- [ ] **Step 2: Open `/admin/gdpr` on the deployed site and run a search**

Log in to the admin panel, navigate to "RGPD" in the sidebar. Search `gdpr-test@example.com`. Expect the seeded row to appear.

- [ ] **Step 3: Click "Exporter les données (JSON)"**

A file should download. Open it and verify:
- `requestedFor` is `gdpr-test@example.com`
- `quoteRequests[0].client_name` is `Test GDPR`
- `quoteRequests[0].from_address` is `1 rue du Test`

Then check the audit log via REST:

```bash
curl -s "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/gdpr_requests?action=eq.export&order=created_at.desc&limit=1" \
  -H "apikey: $APIKEY" -H "Authorization: Bearer $APIKEY"
```

Expect `affected_rows=0`, `admin_email` set to your admin login email, `email_hash` non-empty.

- [ ] **Step 4: Click "Anonymiser", type `ANONYMISER`, confirm**

Toast should say "Anonymisation OK — N lignes modifiées". Then verify in DB:

```bash
curl -s "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/quote_requests?id=eq.$SEED_ID&select=client_name,client_email,client_phone,from_address,to_address,notes" \
  -H "apikey: $APIKEY" -H "Authorization: Bearer $APIKEY"
```

Expect:
- `client_name = "[supprimé]"`
- `client_email` starts with `deleted-` and ends with `@anonymized.local`
- `client_phone = "+00000000000"`
- `from_address = "[supprimé]"`
- `notes = null`

And the audit log:

```bash
curl -s "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/gdpr_requests?action=eq.anonymize&order=created_at.desc&limit=1" \
  -H "apikey: $APIKEY" -H "Authorization: Bearer $APIKEY"
```

Expect `affected_rows >= 1` and the audit row matches the anonymize action.

- [ ] **Step 5: Verify idempotency — re-search by the original email**

Same search (`gdpr-test@example.com`) should now return empty (the anonymized row is filtered out because its email ends in `@anonymized.local`).

- [ ] **Step 6: Clean up**

Delete the seed row entirely (not relying on anonymization — we want to leave no trace):

```bash
curl -s -X DELETE "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/quote_requests?id=eq.$SEED_ID" \
  -H "apikey: $APIKEY" -H "Authorization: Bearer $APIKEY" -w "HTTP %{http_code}\n"
```

Expected: `HTTP 204`.

You can leave the two `gdpr_requests` rows (export + anonymize) — they're the audit log, they belong there.

- [ ] **Step 7: Update memory notes**

Edit `C:\Users\FX507\.claude\projects\C--Users-FX507--local-bin\memory\project_demenagement24_next_session.md` to:
- Add the feature to the "shipped this session" list with the relevant commit SHAs
- Remove GDPR from the remaining-work list (if it was ever listed)

---

## Rollback

If something goes wrong in production:

1. Remove the sidebar entry (Task 8) and redeploy — the page is hidden but the API routes stay, in case they're in flight.
2. The migration is additive (one new table, one new function). Leave it.
3. If `gdpr_requests` rows need purging (e.g. test runs): `DELETE FROM gdpr_requests WHERE admin_email = '<your admin>' AND created_at > '<timestamp>'`.
