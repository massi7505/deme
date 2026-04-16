# Lead Verification (Email + Phone OTP) — Design

**Date:** 2026-04-16
**Status:** Approved
**Author:** Claude (brainstorming skill)

## Context

Today quotes submitted on `/devis` are distributed to up to 6 movers **immediately** after submission, before any verification. An SMS OTP is sent to the client's phone after the fact, but verification is informational: the mover sees a "Vérifié" badge if the client completed the SMS flow, but unverified leads are sold all the same. There is **no** email verification at all. Fake or mistyped contacts create mover claims and erode trust in the marketplace.

## Goal

Only distribute a lead to movers once the client has proved control of at least one of the two contact channels (email or phone). Give movers a stronger quality signal by showing which channels are verified on each lead.

## Scope

**In scope:**

- Email OTP verification (new): template, DB columns, send + verify API routes, UI integrated into post-submission flow.
- Phone OTP (existing): keep `sendOtpSMS` and `verify-phone` route; add a matching `resend-phone-otp` route and wire resend + rate limits into the new UI.
- Post-submission page `/verifier-demande/[id]` where the client completes either verification.
- Gate distribution: movers see the lead only after the first verification passes.
- Two independent badges (`email_verified`, `phone_verified`) on the mover-facing lead cards and detail page.
- Rate limiting / anti-abuse (per-code attempts + resend cooldown + overall expiry).
- Admin-editable email template for OTP.

**Out of scope:**

- Captcha / bot protection on `/devis` (separate concern).
- Reputation score computed from verification history (future work).
- Re-verifying leads distributed before this feature ships.
- Changing claim reasons / refund policy for fake contacts (still handled via existing claims).
- SMS OTP to another channel (WhatsApp, etc.).

## User model

**Actor: Client (quote requester).** Fills the devis form, then arrives on `/verifier-demande/[id]` with two side-by-side cards (email + phone) and an OTP entry widget in each. They can validate one, both, or none. At least one is required to reach the movers.

**Actor: Mover (déménageur).** On `/demandes-de-devis`, sees only leads where at least one verification has passed. Each lead card shows `📧 Email vérifié` and `📞 Tél vérifié` badges independently, so a half-verified lead is visibly weaker than a fully-verified one.

**Actor: Admin.** Can edit the OTP email template at `/admin/settings` → Email templates.

## Architecture

### Data model changes

Add columns to `quote_requests` (migration `002_lead_verification.sql`):

```sql
ALTER TABLE quote_requests ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE quote_requests ADD COLUMN email_verification_code TEXT;
ALTER TABLE quote_requests ADD COLUMN email_verification_expires TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN email_verification_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE quote_requests ADD COLUMN email_verification_last_sent_at TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN phone_verification_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE quote_requests ADD COLUMN phone_verification_last_sent_at TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN distributed_at TIMESTAMPTZ;
ALTER TABLE quote_requests ADD COLUMN status_detail TEXT;
```

The existing `status` column gains a new value: `pending_verification` (set when the quote is created, before any verified flag flips). Keep `status = 'new'` for legacy rows and rows that have been distributed. Existing `phone_verified / phone_verification_code / phone_verification_expires` stay as-is.

### Lead lifecycle

```
client submits /devis
        │
        ▼
┌─────────────────────────────┐
│ POST /api/quotes            │
│ - insert quote_request      │
│   status = pending_verif.   │
│ - generate email OTP (15m)  │
│ - generate phone OTP (15m)  │
│ - send email via Resend     │
│ - send SMS via SMSFactor    │
│ - NO distribution yet       │
└─────────────┬───────────────┘
              │ returns { quoteId }
              ▼
client redirected to /verifier-demande/[quoteId]
              │
              ├─── enters email OTP ─── POST /api/quotes/verify-email
              │                                     │
              └─── enters phone OTP ─── POST /api/quotes/verify-phone
                                                    │
                                                    ▼
                          either flag flips to true
                                                    │
                                                    ▼
              ┌───────────────────────────────────────┐
              │ distributeLead(quoteId) – idempotent: │
              │   - skip if distributed_at set        │
              │   - set distributed_at = now()        │
              │   - set status = 'new'                │
              │   - match movers (dept + radius)      │
              │   - insert quote_distributions        │
              │   - notify movers (email/sms/push)    │
              │   - send confirmation email to client │
              └───────────────────────────────────────┘
```

`distributeLead()` is extracted from the current body of `POST /api/quotes` into a reusable server function (new file `src/lib/distribute-lead.ts`). Called by both verify routes. Idempotency key is `quote_requests.distributed_at IS NOT NULL`.

### API routes

- `POST /api/quotes` — updated: stores the quote with `status=pending_verification`, generates both OTPs, sends email + SMS, returns `{ success, quoteId, prospectId }`. Does **not** call `distributeLead`.
- `POST /api/quotes/send-email-otp` — body `{ quoteId }`. Generates a new 6-digit code, stores it, sends via Resend. Used for re-send.
- `POST /api/quotes/verify-email` — body `{ quoteId, code }`. Checks code + expiry + attempts, sets `email_verified = true`, calls `distributeLead` if first success.
- `POST /api/quotes/verify-phone` — existing route, updated to call `distributeLead` on first success + increment `phone_verification_attempts`.
- `POST /api/quotes/resend-phone-otp` — body `{ quoteId }`. New route symmetric to `send-email-otp`.
- `GET /api/quotes/verification-status` — body `{ quoteId }`. Returns `{ emailVerified, phoneVerified, emailMasked, phoneMasked, email_cooldown_sec, phone_cooldown_sec }` so the page can hydrate.

Each verify/resend route enforces:

- **Cooldown**: reject resend within 30 s of `*_last_sent_at`.
- **Hourly cap**: reject if `*_verification_attempts >= 3` AND last sent < 1 h ago (unblock once that window passes; the counter is reset on successful verification or successful re-send after cooldown).
- **Overall expiry**: reject resend if quote is older than 24 h → the page shows "Lien expiré, recommencez votre demande" and invites resubmit.

### Frontend

- `/verifier-demande/[id]/page.tsx` (new, in `app/(public)/`): fetches status on mount, renders two Cards.
  - **Email card**: shows `b***@domain.com`, 6-box OTP input (reuse the one built for password reset), "Vérifier" button, "Renvoyer le code (30s)" button, green check when verified.
  - **Phone card**: same pattern with masked phone `06 ** ** ** 12`.
  - Banner at top: "Votre demande est presque finalisée. Validez au moins un canal pour que les déménageurs reçoivent votre demande."
  - Success banner appears as soon as one side verifies: "✓ Votre demande a été transmise à X déménageurs." Then both cards remain editable so the client can also verify the second channel (upgrades the quality signal).
- `/devis/page.tsx` (modified): on submission success, replace the current success page with `router.push(\`/verifier-demande/${quoteId}\`)`.
- `OtpInput` from `mot-de-passe-oublie/page.tsx` is moved to `src/components/ui/otp-input.tsx` so both flows share it. Default length **6** (quote OTP length); password reset keeps its **8** via the `length` prop.

### Mover-side changes

- `/api/dashboard/overview`: already returns `phoneVerified`; add `emailVerified`. Both remain null-safe for legacy rows (treat as false).
- `/demandes-de-devis` list: render two independent badges using existing Tailwind style; only appear when the respective flag is true.
- `/demandes-de-devis/[id]` detail: same two badges under the title.

### Email template

Add to `DEFAULT_EMAIL_TEMPLATES` and `EMAIL_TEMPLATE_DEFS`:

```ts
{ key: "quoteVerification", label: "Vérification demande client", category: "Client", variables: ["siteName", "clientName", "otpCode", "expiryMinutes", "baseUrl", "verifyUrl"] }
```

Body uses the shared gradient header + 6-digit code block + expiry warning (same visual language as `passwordReset`). `verifyUrl` points to `/verifier-demande/[id]` for a one-click landing, but the OTP alone is sufficient to validate (no magic-link shortcut). Wire `sendQuoteVerificationEmail(to, clientName, otpCode, expiryMinutes, verifyUrl)` in `src/lib/resend.ts`.

## Constraints and non-goals

- **We keep the current dual-channel redundancy.** Either email or phone is enough. We do not force both; it just upgrades the badge.
- **No distribution retry for legacy leads.** Rows created before the migration keep `status='new'` and are not affected.
- **No magic-link-only flow.** A clickable link would still land on `/verifier-demande/[id]` and ask for the OTP. This keeps one code path and avoids token-in-URL leakage.

## Failure modes

| Scenario | Handling |
|---|---|
| Resend API down when sending email OTP | Quote still saved; page shows "Code email non envoyé, réessayez" with manual resend button. Phone OTP still works. |
| SMSFactor rate-limited / invalid number | Phone card shows an editable phone number field + "Mettre à jour et renvoyer". Updating the number writes back to `client_phone` and fires a fresh OTP. |
| Client enters wrong code 3× | Card locks for 1 h; "Réessayer dans MM:SS" countdown. |
| 24 h passes without verification | Nightly cron (or on-read check in verify routes) sets `status='abandoned'`, lead is never distributed. Client sees "Demande expirée, recommencez". |
| distributeLead throws after flag flipped | Flag stays true; `distributed_at` stays null; next successful verification or a manual admin trigger retries. Idempotent. |
| Same OTP submitted twice (race) | Second call returns `alreadyVerified:true`; no double distribution because of idempotency. |

## Testing

- Unit: `distributeLead()` idempotency (call twice, single distribution set).
- Unit: OTP generation, expiry, attempts counter in both send and verify routes.
- Integration: full client journey — submit /devis, land on /verifier-demande, resend cooldown, three bad codes then lockout, successful verify triggers distribution.
- Integration: legacy rows without `email_verified` column return `false` on the mover API without breaking typed reads (columns default to false in migration, legacy rows are backfilled to false by the NOT NULL DEFAULT).
- E2E: mover does not see a lead in `pending_verification`, sees it as soon as one flag flips, sees both badges when both flip.
- Manual smoke on staging with a real email (Resend) and a real French number (SMSFactor).

## Migration plan

1. Ship DB migration `002_lead_verification.sql`.
2. Deploy new code with feature flag `LEAD_VERIFICATION_ENABLED=false` initially. While false, `POST /api/quotes` keeps the old "distribute immediately" path; new routes exist but are only invoked if the flag is on.
3. Smoke test staging.
4. Flip `LEAD_VERIFICATION_ENABLED=true` on Vercel.
5. Monitor claims rate + verification completion rate for 1 week. Expected completion ≥ 70 % given either channel counts.

## Open questions

None. All design points were resolved during brainstorming.
