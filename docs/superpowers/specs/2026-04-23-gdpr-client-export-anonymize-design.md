# GDPR Client Export + Anonymize — Design Spec

**Date:** 2026-04-23
**Status:** Approved — ready for implementation plan
**Scope:** ~2h build, clients only (v1)

## Problem

The site collects PII on two personas — clients (anonymous users who submit a quote form) and movers (paying B2B customers). The French RGPD (GDPR) requires that every data subject can request an export of their personal data (Art. 15) and its erasure (Art. 17). Today there is no tooling for either — a request would require Massi to write raw SQL against a live production DB, which is error-prone and doesn't prove compliance.

## Goal

Give the admin a single page to search a client, export their data as JSON, and anonymize it across every table where their PII lives, with a provable audit trail for the CNIL.

## Scope

- **Clients only** (quote form submitters). Movers are out of scope for v1 — they are B2B contracted users with active accounts, representing <5% of expected GDPR requests. Their deletion path also collides with the 10-year French bookkeeping retention on invoices and is better handled manually until volume demands otherwise.
- **Admin-triggered only**. No public self-service page. The client emails Massi, Massi executes from `/admin/gdpr`. Avoids the OTP-phishing risk of self-service and keeps the v1 surface small.
- **Both actions** — export and anonymize — in one page.

## Non-goals

- Self-service client page (`/mes-donnees`) with OTP auth.
- Mover deletion / anonymization.
- PDF attestation generation; a JSON log in `gdpr_requests` is the CNIL-minimum proof of execution.
- Automatic retention-based anonymization (auto-anonymize quotes older than N months).
- Auto-email notification to the client post-anonymization — that's a human email written by the admin.
- Cleanup of application / Vercel / Sentry / Resend logs; those are governed by each service's retention setting, out of scope for the DB.

Any of these can be added later when usage demands.

## Design

### Architecture

One admin page (`/admin/gdpr`), two API routes (`/api/admin/gdpr/export`, `/api/admin/gdpr/anonymize`), one new DB table (`gdpr_requests`). All existing auth guards (`requireAdmin`) are reused. No new dependencies.

### Admin UI — `/admin/gdpr`

Three vertical zones, styled in the existing admin patterns (shadcn/ui table, react-hot-toast, `cn` helper):

**Zone 1 — Search**
- Single input accepting either an email or a `prospect_id`.
- "Rechercher" button → returns matching `quote_requests` rows (id, `prospect_id`, `from_city → to_city`, `created_at`, `status`, unlock count).
- Empty state: "Aucune donnée trouvée".

**Zone 2 — Selected client**
- Card summary: full name, phone, emails, addresses, reviews left, review tokens, rate-limit event count.
- Two buttons:
  - **"Exporter les données"** → triggers `POST /api/admin/gdpr/export`, browser downloads the JSON file.
  - **"Anonymiser"** → opens a confirm dialog with double validation: operator must type `ANONYMISER` verbatim; dialog shows the row count that will change and a short preview of the transformations.

**Zone 3 — History**
- Last 50 rows of `gdpr_requests`: date, action, email hash prefix (first 8 chars, for visual reference), admin email, affected rows.

### Action — Export

Endpoint: `POST /api/admin/gdpr/export`

Body:
```json
{ "email": "client@example.com" }
```
or
```json
{ "prospectId": "ABC123..." }
```

One of the two is required. The handler resolves `client_email_normalized` from either input, then collects:

| Table | Exported fields |
| --- | --- |
| `quote_requests` | all columns |
| `quote_distributions` | `id, status, price_cents, unlocked_at, created_at`, plus `company_name` (from a join — the mover identity is part of the client's data, since the client can ask who saw their request) |
| `reviews` | `rating, comment, reviewer_name, is_anonymous, created_at`, plus `company_name` |
| `review_tokens` | `token, expires_at, used_at, created_at` |
| `rate_limit_events` | `endpoint, created_at` — IP addresses intentionally **excluded** from the export (they'd be another person's data if IPs are shared; a scope-of-export question). A count of events is also returned at the top-level. |

Output format:
```json
{
  "exportedAt": "2026-04-23T10:15:00.000Z",
  "requestedFor": "client@example.com",
  "quoteRequests": [...],
  "distributions": [...],
  "reviews": [...],
  "reviewTokens": [...],
  "rateLimitEventSummary": { "count": 3, "endpoints": ["quotes", "verify-email"] }
}
```

Response headers:
```
Content-Type: application/json
Content-Disposition: attachment; filename="gdpr-export-<prospectId>-<YYYY-MM-DD>.json"
```

(If multiple `prospect_id`s match the email, the filename uses the first one; the JSON contains all matches.)

The server does not persist the export on disk — it streams directly to the browser.

The handler then inserts a row into `gdpr_requests` with `action='export'`, `email_hash=sha256(email.toLowerCase().trim())`, `admin_email=<from cookie>`, `affected_rows=0`, `notes=null`.

### Action — Anonymize

Endpoint: `POST /api/admin/gdpr/anonymize`

Body:
```json
{
  "quoteRequestIds": ["...", "..."],
  "confirmation": "ANONYMISER",
  "notes": "Demande reçue par email 2026-04-23"
}
```

Guards:
1. `confirmation` must equal the literal string `ANONYMISER`. Reject otherwise with 400.
2. Every id in `quoteRequestIds` must resolve to an existing row (no ghost deletes).
3. All DB work runs inside a single Supabase RPC (plpgsql function) so partial failures roll back atomically. If the function is missing (migration not yet applied), the endpoint returns 500 with a clear message.

Transformations applied per `quote_request` row:

| Table | Column | New value |
| --- | --- | --- |
| `quote_requests` | `client_name` | `'[supprimé]'` |
| | `client_first_name` | `'[supprimé]'` |
| | `client_last_name` | `'[supprimé]'` |
| | `client_email` | `'deleted-' || id || '@anonymized.local'` |
| | `client_email_normalized` | same as above |
| | `client_phone` | `'+00000000000'` |
| | `client_phone_normalized` | `'+00000000000'` |
| | `from_address` | `'[supprimé]'` |
| | `to_address` | `'[supprimé]'` |
| | `notes` | `null` |
| `reviews` (matched via `quote_request_id`) | `reviewer_name` | `'[Anonyme]'` |
| `review_tokens` (matched via `quote_request_id`) | — | **DELETE row** |
| `rate_limit_events` (matched via the client's IP from a pre-lookup of the quote's creation window) | — | **DELETE rows** |

Kept intact (explicitly): `from_city`, `from_postal_code`, `to_city`, `to_postal_code`, `move_date`, `volume_m3`, `category`, `prospect_id`, and the review `comment`. These are non-identifying fields useful for mover-side statistics and historical accounting.

Not touched: `transactions`, `quote_distributions` (other than the join), `profiles`, `companies`, `company_*`, `notifications` (those are mover-side data).

IP handling (rate_limit_events): `rate_limit_events` has no `quote_request_id` FK, so we can't match by id. We use a time-window heuristic: for each quote being anonymized, delete every `rate_limit_events` row whose `endpoint` is in `('quotes', 'verify-email', 'verify-phone')` AND whose `created_at` falls inside a ±2 hour window around the quote's `created_at`. Over-deletion is acceptable (rate-limit windows are 24h max; worst case a concurrent legitimate user gets one extra slot). Under-deletion would leak an IP and defeat the anonymization.

Response:
```json
{
  "success": true,
  "affectedRows": { "quoteRequests": 2, "reviews": 1, "reviewTokens": 2, "rateLimitEvents": 5 },
  "totalAffected": 10
}
```

Then insert `gdpr_requests` with `action='anonymize'`, `email_hash` (hash of the original email, read once before transformation), `admin_email`, `affected_rows=totalAffected`, `notes` from the body.

### Audit table — migration 026

```sql
CREATE TABLE gdpr_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action        text NOT NULL CHECK (action IN ('export', 'anonymize')),
  email_hash    text NOT NULL,
  admin_email   text NOT NULL,
  affected_rows int  NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gdpr_requests_email_hash ON gdpr_requests (email_hash);
CREATE INDEX idx_gdpr_requests_created_at ON gdpr_requests (created_at DESC);
```

`email_hash` = `encode(digest(lower(trim(email)), 'sha256'), 'hex')`. Requires the `pgcrypto` extension (already used elsewhere for `gen_random_uuid()` — no new dependency). Chosen over plain text because storing the email plain would re-introduce the PII we just deleted. The admin re-hashes on future queries to verify a prior request was logged for the same address.

`admin_email` is stored in clear: it's internal audit, not client PII.

No auto-retention: v1 keeps rows indefinitely. Row volume is trivially small (expected <100/year for a couple of years).

### Why this approach

- **Admin-triggered** keeps the v1 surface minimal and avoids the OTP-phishing attack class. Expected volume (<5 requests/year in dev phase, <50/year post-launch) is low enough that a human admin in the loop is free.
- **Anonymize, not hard delete**, because ~50% of clients have a linked paid transaction (mover unlocked the lead) and the French Code de commerce (art. L123-22) requires 10-year retention of accounting records. Anonymizing decouples the PII from the accounting row.
- **Single RPC transaction** ensures atomicity — a partial anonymize (name erased but email left) would be a GDPR bug AND a CNIL-reportable breach.
- **SHA-256 email hash** in the audit log is the minimum CNIL-compliant proof of execution. Plain-text email would re-introduce PII; full-row copies would duplicate the problem.

### Edge cases

| Case | Behaviour |
| --- | --- |
| Client with multiple quotes on the same email | Search returns all; one-shot anonymize handles them in a single transaction. UI shows the full count before the confirm dialog. |
| Email already anonymized (re-request) | Search returns empty (matches on `deleted-*@anonymized.local` are ignored in the UI). Idempotent. |
| Multiple reviews on different movers | All review rows matched by `quote_request_id` get `reviewer_name='[Anonyme]'`; each mover keeps their rating math. |
| Email casing / whitespace | `client_email_normalized` handles this (already normalized by migration 023). |
| Export for an email with zero quotes | Returns a JSON with empty arrays; log still inserted (trace that the request was handled within the RGPD deadline). |
| Foreign key / constraint failure mid-anonymize | RPC transaction rolls back atomically; toast "Erreur technique, aucune modification appliquée". |
| Admin closes tab mid-anonymize | Server-side transaction runs independently of client connection; either commits or rolls back. |
| `rate_limit_events` table missing (test env) | Function skips that step with a warning, continues with the rest. Non-fatal. |

### Security

- Both endpoints protected by `requireAdmin(request)` — same pattern as every other `/api/admin/*` route.
- Rate limiting not added in v1: the route is admin-only and the admin is a trusted actor. Adding it later is trivial (the `checkIpRateLimit` helper exists).
- CSRF: the admin cookie is SameSite=Lax (existing setting), and these are POST-only. Safe.
- Input validation: `quoteRequestIds` must be an array of valid UUIDs; `email` / `prospectId` length-capped at 320 / 128 chars respectively.
- The export JSON never includes mover PII (email/phone of the company) — the client is entitled to know *who* saw their lead, not *how to contact them privately*.

### Instrumentation

Minimal. `console.log` structured entries on each action with `{action, emailHashPrefix, affectedRows, adminEmail}`. The `gdpr_requests` table is the authoritative log; console is just a debug aid.

### Tests

Out of scope (no test harness). Manual verification via a seeded test client is the acceptance step, documented in the implementation plan.

## Open questions

None. Ready for implementation plan.
