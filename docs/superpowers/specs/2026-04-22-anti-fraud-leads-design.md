# Design — Upstream anti-fraud detection on lead submissions

**Date:** 2026-04-22
**Scope:** Lead submission API (`POST /api/quotes`) + admin leads page
**Goal:** Score every new quote submission against a suite of deterministic fraud detectors. When the score crosses a threshold, park the lead in `status='review_pending'` and withhold it from mover distribution until an admin manually approves or rejects. Silent to the client: the response is identical whether the lead is clean or flagged.

## Problem

The business sells leads for ~30€ each to movers. A bad lead (fake request, duplicate, unreachable client, spam) makes a mover pay for nothing and erodes trust in the marketplace. Current defenses:

- **Rate limiting** on `POST /api/quotes` (5 submissions per IP per 10 min)
- **Obligatory OTP** on email + phone before distribution (feature flag on by default)
- **Collective defect detection** downstream: when ≥ 4 movers file hard-reason claims on the same lead, `defect_status='suspected'` and admin can refund all

Gap: there's nothing between submission and distribution that inspects the **content** of the lead. A non-throwaway email with a verified OTP can still be:
- A disposable domain (`mailinator`, `yopmail`, ...)
- A duplicate of a recent submission from the same user
- A lead with URLs/spam keywords in the notes
- A bot-filled form (honeypot)
- A nonsense submission that will waste admin time only when 4 claims land

Upstream detection catches these **before** the lead reaches movers. Movers only see clean leads; admin only reviews the ambiguous 2–5%; bad leads never cost the marketplace credibility.

## Decisions made during brainstorming

| Decision | Chosen | Alternatives rejected | Why |
|---|---|---|---|
| Action on suspicious lead | Accept but hold in `review_pending`, no distribution | Block with 400 / Distribute + flag | Blocking risks false positives on a ~30€-per-lead market; flag-after-distribute means movers pay then must be refunded — friction |
| Detection depth | Level B (5 basic + 3 textual heuristics) | A only / C (fingerprint + VPN + timing) | A is insufficient (notes-spam is common); C's maintenance cost (JS fingerprint, external APIs) isn't justified for MVP |
| Sensitivity model | Weighted score, silent to client | All-or-nothing / Transparent message | Weighted avoids swamping admin with soft signals; silent avoids killing conversion on false positives |
| Threshold | 50 | — | Calibrated so: `disposable_email` alone (50) or `honeypot` alone (100) trips; `suspicious_name` alone (20) doesn't |
| Admin UI | Badge in sidebar + inline actions on `/admin/leads` | Dedicated page | Reuses existing photo-moderation pattern; inline binary action (approve/reject) doesn't need a separate page |
| Honeypot field | Hidden input on Step 4 form | Timing-based or reCAPTCHA | Zero friction, zero false positive when a bot fills it |
| Email validity check | Local disposable-domain list (~100) | External API (Kickbox etc.) | No third-party dependency for MVP; refresh the list when needed |

## Out of scope

- Browser fingerprinting (navigator.userAgent / canvas hash)
- Fill-time detection (submit too fast = bot)
- IP-based reputation (VPN / Tor / proxy lists) — rate limit already covers the volumetric angle
- External email validation API
- Admin dashboard for fraud analytics (% flagged, top detectors, etc.) — wait until the data warrants it
- Runtime-configurable detector weights via `/admin/settings` — adjust in code for MVP; revisit if calibration becomes a recurring need
- Re-scoring existing leads in the database — only new submissions are scored

## Architecture

### New pure module — `src/lib/fraud-detection.ts`

Exports one function per detector (pure, testable in isolation), one aggregator `scoreLead()`, the threshold constant, and helper types. Follows the same pattern as `src/lib/defect-detection.ts` (which is already unit-tested at `defect-detection.test.ts`).

```ts
export const FRAUD_THRESHOLD = 50;
export const HONEYPOT_FIELD_NAME = "__nickname";

export type FraudReason = {
  code: string;    // stable identifier, e.g. "disposable_email"
  label: string;   // human-readable FR, e.g. "Email jetable"
  weight: number;
};

export type ScoreContext = {
  supabase: ReturnType<typeof createUntypedAdminClient>;
  quoteId: string;
};

export type LeadInput = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  notes?: string;
  fromPostalCode?: string;
  fromCity?: string;
  honeypot?: string;
};

export async function scoreLead(
  lead: LeadInput,
  ctx: ScoreContext
): Promise<{ score: number; reasons: FraudReason[] }>;
```

Internally, `scoreLead` runs the 3 DB detectors in parallel via `Promise.all`, then the 5 synchronous detectors sequentially (they're all µs-level). Returns sum + flat list of triggered reasons.

### New static module — `src/lib/disposable-emails.ts`

Exports `DISPOSABLE_DOMAINS: Set<string>` with ~100 well-known throwaway domains (yopmail.com, mailinator.com, 10minutemail.com, guerrillamail.com, tempmail variants, etc.). Kept separate so `fraud-detection.ts` stays focused and the list can be bumped independently.

### The 8 detectors

| Code | Label | Trigger | Weight | DB? |
|---|---|---|---|---|
| `disposable_email` | Email jetable | `email.split('@')[1].toLowerCase()` ∈ `DISPOSABLE_DOMAINS` | 50 | no |
| `dup_phone_7d` | Téléphone déjà utilisé (<7j) | ≥ 1 other `quote_requests` row with same normalized phone + `created_at > now() - 7d` | 40 | yes |
| `dup_email_7d` | Email déjà utilisé (<7j) | ≥ 1 other `quote_requests` row with same lowercased email + `created_at > now() - 7d` | 35 | yes |
| `postal_mismatch` | Code postal / ville incohérents | `fromPostalCode` prefix (first 2 chars) doesn't match French département of `fromCity` per a static `POSTAL_TO_DEPARTMENT` map; OR if `from_lat/from_lng` exist, Haversine > 50km from postal-code centroid (if reverse lookup fails, detector is skipped — no false positive on partial data) | 30 | no |
| `honeypot_filled` | Bot (champ piégé rempli) | `lead.honeypot && lead.honeypot.trim() !== ""` | 100 | no |
| `suspicious_name` | Nom / prénom suspect | Regex test: `/\d/.test(name)` OR `/[^a-zA-Zà-ÿÀ-Ÿ '\-]/.test(name)` OR `name === name.toUpperCase() && name.length >= 3` | 20 | no |
| `url_in_notes` | URL / lien dans les notes | `/(https?:\/\/|www\.|\.(com|fr|ru|cn|xyz|click|top|info|biz))/i.test(notes)` | 40 | no |
| `foreign_script_or_spam` | Texte étranger / spam | `/[Ѐ-ӿ一-鿿]/.test(notes + name)` OR keyword match: `/\b(casino|loan|bitcoin|viagra|crypto|btc|нарколог)\b/i.test(notes)` | 35 | no |

Calibration examples (these MUST trip at threshold ≥ 50):

- `honeypot_filled` alone → 100 ✓
- `disposable_email` alone → 50 ✓
- `dup_phone_7d` + `url_in_notes` → 80 ✓
- `dup_email_7d` + `suspicious_name` → 55 ✓

Calibration examples (these MUST NOT trip at threshold < 50):

- `suspicious_name` alone → 20 ✗
- `postal_mismatch` alone → 30 ✗
- `url_in_notes` alone → 40 ✗ (borderline — someone putting their own website)

### Data flow in `POST /api/quotes`

```
1. IP rate limit (existing)
2. Body validation (existing)
3. INSERT quote_request with status='new' (existing)
4. NEW — scoreLead({...body, honeypot: body.__nickname}, {supabase, quoteId: quote.id})
5. If score >= FRAUD_THRESHOLD:
     - UPDATE quote_requests SET
         status = 'review_pending',
         fraud_score = score,
         fraud_reasons = reasons (JSONB)
     - INSERT notifications (type=system, title="Lead en attente de vérification")
     - SKIP distributeLead()
   Else:
     - UPDATE quote_requests SET
         fraud_score = score,
         fraud_reasons = reasons
     - distributeLead() as before
6. Send OTP email/SMS in both branches (verification happens regardless of fraud score — a flagged lead whose OTP passes and is approved by admin goes straight to distribution)
7. Return identical 200 response in both branches. The flagged branch does a second UPDATE + a notification INSERT, so wall-clock time differs by ~20–40 ms. This is inside the normal variance of network RTT and Supabase response jitter — not a reliable side-channel. If this ever matters, a ~50 ms jitter on the clean branch would flatten it; not worth adding for MVP.
```

### Admin review flow

**Sidebar badge** (`src/app/admin/layout.tsx`) — already polls `/api/admin/stats/moderation` every 60 s for `pendingPhotos`. We extend the same endpoint to return `pendingLeadReviews` too, and render a red pulsing badge on the "Leads" nav entry whenever it's > 0. Identical visual pattern as photos.

**Leads page** (`src/app/admin/leads/page.tsx`):
- Status filter dropdown gains a "En attente de vérif" option
- Each row: if `status='review_pending'`, show an orange badge `🚩 À vérifier · {score}` in the Status column
- Detail panel (right side when a lead is selected): if `review_pending`, show a prominent block at the top listing score + triggered detectors + two buttons:
  - **Approuver et distribuer** → POST `/api/admin/leads` with `action: "approve_review"` → server sets `status='new'` + `reviewed_at=now()` + `reviewed_by='admin'` + calls `distributeLead(quoteId)`
  - **Rejeter** → POST with `action: "reject_review"` → server sets `status='rejected'` + `reviewed_at` + `reviewed_by`; no distribution

**API** (`src/app/api/admin/leads/route.ts`) — 2 new action branches, following the existing `approve_*` / `reject_*` pattern from `src/app/api/admin/companies/route.ts`.

### Honeypot on Step 4 form

`src/components/quote-funnel/Step4Contact.tsx` adds a visually hidden `<input name="__nickname">` that humans can't see or tab-focus:

```tsx
<input
  type="text"
  name="__nickname"
  tabIndex={-1}
  autoComplete="off"
  value={honeypot}
  onChange={(e) => setHoneypot(e.target.value)}
  aria-hidden="true"
  style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none" }}
/>
```

The form passes `__nickname` through to the submit handler, which includes it in the payload to `POST /api/quotes` under `honeypot` (renamed server-side to match `LeadInput.honeypot`).

Zero friction for real users (no tab stop, no screen-reader announcement, no visible element); any bot auto-filling all fields trips `honeypot_filled` and gets 100 points → always flagged.

## Database migration — `022_lead_fraud_detection.sql`

```sql
-- 022_lead_fraud_detection.sql
-- Store fraud score + reasons on every lead so admin can review suspicious
-- submissions before they reach movers. Also add review audit fields.

ALTER TABLE quote_requests
  ADD COLUMN fraud_score    INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN fraud_reasons  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN reviewed_at    TIMESTAMPTZ,
  ADD COLUMN reviewed_by    TEXT;

-- Hot path: admin sidebar counts + admin leads filter.
CREATE INDEX idx_quote_requests_review_pending
  ON quote_requests (status)
  WHERE status = 'review_pending';
```

`status` is a plain TEXT column without a CHECK constraint in `001_initial_schema.sql` (verified during brainstorm), so `'review_pending'` needs no schema change besides what's above.

Backward compatibility: existing rows get `fraud_score=0`, `fraud_reasons=[]`, `reviewed_at/by=NULL`. No re-scoring of historical data.

## Testing plan

Consistent with CLAUDE.md ("only pure helpers are tested"): full unit coverage of the detection module, nothing for the API route wiring.

`src/lib/fraud-detection.test.ts`:
- **1 test per synchronous detector** (disposable email, honeypot, name, URL, foreign script, postal mismatch) — positive + negative case
- **1 test per DB detector** (dup phone, dup email) — mocking `supabase.from().select()` to return rows or empty
- **3 integration-like tests on `scoreLead`**:
  - Clean lead → `{score: 0, reasons: []}`
  - One big signal (disposable email) → `{score: 50, reasons: [disposable_email]}`
  - Two medium signals stacking past threshold (dup email + suspicious name) → `{score: 55, reasons: [...]}`

Admin API route + UI wiring: manual verification after deploy, following the same pattern as the blog redesign (Task 4 checklist).

## Security & observability

- **Silent detection** is deliberate: replying 200 identically means an attacker can't probe the detector set. Trying different payloads gives no signal back — they just see "success" and wait for a call that never comes.
- **Honeypot field name** (`__nickname`) is stable across deploys; if a bot learns it, swap to another name without changing anything else.
- **No PII in `fraud_reasons`** — the array only stores `{code, label, weight}`, never the offending value. A human reading the admin table sees `disposable_email` without seeing the email domain.
- **Notification body** names detectors but never the raw values either.
- **reviewed_by** is hardcoded to `"admin"` for now (the admin auth is token-based, not user-identified). When RBAC lands (already in the roadmap per user's memory), this can become the admin's email.

## Rollback

All additive. If the detector is too aggressive in production:

1. **Soft rollback** — set the env var `LEAD_FRAUD_DETECTION_ENABLED=false` (to be added to the route): if unset or `"false"`, `scoreLead()` short-circuits to `{score: 0, reasons: []}`. New leads distribute as before; reviewed/pending leads remain untouched.
2. **Hard rollback** — revert the commit. Leads already in `review_pending` stay there; admin can approve/reject them from the (now unused but still-compiled) UI block, or a one-line SQL update flips them to `status='new'` and triggers distribution.

No forward-incompatible DB changes — schema additions are non-destructive.

## Deliverables

**New files (4):**
- `supabase/migrations/022_lead_fraud_detection.sql` (~15 lines)
- `src/lib/fraud-detection.ts` (~250 lines)
- `src/lib/disposable-emails.ts` (~105 lines)
- `src/lib/fraud-detection.test.ts` (~300 lines)

**Modified (6):**
- `src/app/api/quotes/route.ts` — score before distribute (~30 LOC)
- `src/app/api/admin/leads/route.ts` — `approve_review` / `reject_review` actions (~50 LOC)
- `src/app/api/admin/stats/moderation/route.ts` — add `pendingLeadReviews` count (~8 LOC)
- `src/app/admin/layout.tsx` — sidebar badge on "Leads" (~10 LOC)
- `src/app/admin/leads/page.tsx` — filter + row badge + detail review block + 2 action handlers (~80 LOC)
- `src/components/quote-funnel/Step4Contact.tsx` — honeypot field + form plumbing (~8 LOC)

**Approximately 850 LOC added, 0 LOC removed.** No backward-incompatible changes.

**Commits:** three, mapping the three layers (detector module + migration, API + admin wiring, Step 4 honeypot).
