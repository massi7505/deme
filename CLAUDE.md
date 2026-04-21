# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B2B/B2C moving marketplace connecting clients with professional moving companies in France. Revenue model: selling leads (quote requests) to movers. Each lead can be purchased by max 6 movers, then it's hidden. No free trial unlocks — all leads require payment. Brand name is configured via `NEXT_PUBLIC_SITE_NAME` env var (see `src/lib/brand.ts`).

## Commands

```bash
npm run dev                 # Dev server (port 3000)
npm run build               # Production build, must pass with 0 errors
npm run lint                # ESLint
npm run test                # Vitest unit tests (uses --passWithNoTests)
npm run test -- <filter>    # Run tests matching a path filter
npx supabase db push        # Apply migrations to the linked Supabase project
npx supabase gen types typescript --project-id=erbwycanjwtiqpdzaqam > src/types/database.types.ts
```

**Type regen gotcha**: `supabase gen types` overwrites `src/types/database.types.ts` and **replaces the `Enums` block with `{ [_ in never]: never }`**. `src/types/index.ts` imports named enum aliases, so the build fails. After every regen, restore the enum block (search history for the literal list — it's stable).

## Deployment

Hosted on Vercel. **The GitHub↔Vercel webhook is currently broken** — `git push` does NOT auto-deploy. To trigger a deployment, curl the Deploy Hook:

```bash
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_ScEfzxa5vgqh7w84HVr0VHO77k20/lQzqg9gaSp"
```

Production URL: `https://deme-iota.vercel.app`. Configure via Vercel Settings: `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN` (auto-injected when a Blob store is connected), `RESEND_API_KEY`, `MOLLIE_API_KEY`, `INSEE_API_TOKEN`, Mapbox token, etc.

## Stack

- **Next.js 14.2.35** (App Router, Server Components) + **TypeScript strict**
- **Supabase** (PostgreSQL, Auth, Realtime) — project ref: `erbwycanjwtiqpdzaqam`
- **Vercel Blob** for public image uploads (mover logos, photos, site logo, favicon)
- **Supabase Storage** for invoice PDFs only
- **Tailwind CSS** + **shadcn/ui** (Radix primitives in `src/components/ui/`)
- **Framer Motion** for animations
- **React Hook Form** + **Zod** for all forms
- **Tanstack Query** via `QueryClientProvider` in `src/components/providers.tsx`
- **Mapbox GL JS** for address autocomplete + coverage maps
- **Vitest** for unit tests (only pure helpers are tested)

## Architecture

### Route Groups

- `(public)` — SEO pages: landing, mover listings, profiles, blog, FAQ, contact, quote form `/devis`, pricing, international. Plus `/avis/[token]` for client review submission.
- `(auth)` — Mover registration 4-step wizard `/inscription/etape-{1-4}`, `/connexion`, `/verification-identite` (KYC), `/creer-compte`
- `(dashboard)` — Authenticated mover area: `/apercu`, `/demandes-de-devis`, `/profil-entreprise`, `/configurations`, `/recommandations`, `/facturation`, `/compte`, `/compte/parametres`
- `admin/` — Admin dashboard with cookie-token auth: `/admin/login`, `/admin/dashboard`, `/admin/companies`, `/admin/leads`, `/admin/transactions`, `/admin/claims`, `/admin/blog`, `/admin/pages`, `/admin/reviews`, `/admin/settings`, `/admin/comptabilite`

### Layouts

- `(public)` — Header + Footer (both use `useSiteSettings()` for dynamic site name/email/phone)
- `(auth)` — Split panel: green gradient left, form right
- `(dashboard)` — Header + sidebar nav + mobile bottom nav
- `admin/` — Dark sidebar nav (desktop) / hamburger overlay (mobile) + token-based auth. Login page has no sidebar.

### Business logic

**Lead lifecycle:**
1. Client submits 4-step form → OTP verification (email + optional phone) → `POST /api/quotes` creates `quote_requests` + runs `distributeLead()` which matches movers by department/radius
2. Up to 6 `quote_distributions` created per request
3. Mover clicks "Acheter ce lead" → `POST /api/leads/unlock`
4. If `MOLLIE_API_KEY` is set: redirects to Mollie → webhook confirms → unlocks. If unset: **test mode** (instant unlock, no payment)
5. Wallet is debited in priority if balance available (mixed card + wallet payment supported)
6. After 6 unlocks, lead status → "completed" and hidden from other movers. Admin always sees everything.

**Claims + collective defect detection:**
- Mover submits claim from an unlocked lead → stored in `claims` table with a French `reason` label
- Admin sees `/admin/claims`, replies are JSON in `claims.admin_note`, email sent via Resend
- If ≥ 4 movers file a hard-reason claim (`Fausse demande`, `Doublon`, `Numéro invalide`, `Client déjà déménagé`) on the same lead, the lead is auto-flagged `defect_status='suspected'`. Admin then clicks **Accepter** (refund all — wallet credit per mover + mark claims approved + mark lead `confirmed_refunded`) or **Refuser** (clear flag, claims stay individual). See `src/lib/defect-detection.ts`.

**Payment reconciliation (cron every 15 min):**
- `/api/cron/reconcile-payments` picks `transactions` with `status='pending'` and a `mollie_payment_id` older than 10 min
- Queries Mollie for the real status: `paid` → forwards to own webhook for finalization; `failed`/`canceled`/`expired` → marks failed, re-locks the distribution, credits wallet back, notifies mover
- Protected by `CRON_SECRET`. Manual trigger panel at `/admin/transactions` for stuck payments.

**Review system:**
- Cron `/api/cron/send-review-emails` (hourly): for each lead with `move_date` ≥ 7 days ago and ≥1 unlocked distribution, generates 1 `review_tokens` row per mover + emails the client
- Reminder 14 days after the initial email (single reminder, respects token expiration)
- Client lands on `/avis/[token]` → submits 1–10 rating + optional comment → `POST /api/public/reviews` inserts a verified review and **recomputes `companies.rating` + `companies.review_count`**
- Movers can reply once per review via `/profil-entreprise` (`mover_reply`, `mover_reply_at`). Replies appear on the public profile.
- Admin can delete any review from `/admin/reviews` (recompute applied).

**Registration:**
- 4-step wizard stores data in `sessionStorage` (keys: `inscription_types`, `inscription_departments`, `inscription_company`, `inscription_contact`)
- `/creer-compte` calls `POST /api/auth/register` → `supabase.auth.admin.createUser()` (service role, bypasses RLS)
- SIRET verification via INSEE API v3.11 (`X-INSEE-Api-Key-Integration` header); Mover can resync legal status/VAT/address later via `/profil-entreprise`

**Company name change workflow:**
- Mover-side name edits go through `pending_name` on `companies`; admin approves (copies to `name`, regenerates slug via `generateCompanySlug`) or rejects. Visible via banner in `/admin/claims` dashboard counter-like widget.

### API routes

Dashboard routes authenticate via `createClient()` from `lib/supabase/server.ts`, then query with `createUntypedAdminClient()` to bypass RLS.

Admin routes use token auth (`lib/admin-auth.ts`) — not Supabase auth. Cookie: `admin_token`. Verification: `POST /api/admin/verify`.

Public API routes (`/api/public/*`) use `createUntypedAdminClient()` directly.

Cron routes (`/api/cron/*`) require `Authorization: Bearer ${CRON_SECRET}`. Scheduled in `vercel.json`.

### Site settings

Dynamic site settings stored in **Supabase `site_settings` table (id=1, JSON blob in `data`)**, not in `admin-settings.json` (that file is legacy). Configured via `/admin/settings`. Consumed via `useSiteSettings()` hook + `SiteSettingsContext` in providers, and server-side via `readSettings()` in `lib/wallet.ts` or direct queries.

### Supabase client patterns

- `lib/supabase/client.ts` — Browser client (anon key)
- `lib/supabase/server.ts` — Server Components/Actions (cookies-based, async)
- `lib/supabase/admin.ts`:
  - `createAdminClient()` — Typed with Database interface
  - `createUntypedAdminClient()` — Untyped, used in most API routes (types drift from migration schema)

### External integrations (all in `src/lib/`)

| File | Service | Notes |
|------|---------|-------|
| `mollie.ts` | Payments | Lazy `getMollie()`, if key empty → test mode (instant unlock) |
| `didit.ts` | KYC | HMAC-SHA256 webhook verification + 300s replay window |
| `onesignal.ts` | Push notifications | Tags-based targeting by `company_id` |
| `smsfactor.ts` | SMS | FR phone normalization |
| `resend.ts` | Email | All transactional emails. Templates auto-wrapped via `emailShell()` from `email-layout.ts` unless HTML already contains `<html>`. |
| `email-layout.ts` | Shared email shell | Responsive 600px table layout + gradient header + footer with year |
| `sirene.ts` | SIRET verification | INSEE API v3.11, 24h cache. Exports `computeFrenchVAT()` for VAT calculation. |
| `mapbox.ts` | Geocoding | Address autocomplete via `components/ui/address-autocomplete.tsx` |
| `invoice.ts` | Invoices | HTML generation, **Supabase Storage** (not Blob) |
| `admin-auth.ts` | Admin auth | HMAC token generation/verification |
| `csv-export.ts` | CSV export | `downloadCSV()` |
| `blob.ts` | Vercel Blob | `uploadBlob()`, `deleteBlob()`, size/type validation. Paths: `logos/{companyId}/...`, `photos/{companyId}/...`, `site/site-logo/...`, `site/favicon/...` |
| `wallet.ts` | Wallet ops | `getWalletBalanceCents()`, `createRefund()`, `debitWallet()` |
| `reconcile-payments.ts` | Payment reconciliation | Called by cron + admin-manual trigger |
| `defect-detection.ts` | Collective defect flag | `checkAndFlagDefectiveLead()`, `isHardReason()`, exports `HARD_REASONS` + `DEFECT_THRESHOLD` |
| `predefined-qna.ts` | Mover Q&A library | Shared between dashboard UI + backfill path. `findPredefinedAnswer()` |
| `distribute-lead.ts` | Lead distribution | Matching by department/radius, up to 6 movers |
| `ensure-company.ts` | Idempotent company bootstrap | Called on first-dashboard-load to create the company row if missing |

### Database

- `supabase/migrations/` — `001_initial_schema.sql` through `019_review_reminder.sql` as of 2026-04-19. Always regenerate types after `db push`.
- All money stored as `_cents` (integers)
- Prospect IDs format: `12836359FR356619`
- Claims conversation stored as JSON array in `claims.admin_note`
- Review tokens expire 30 days after email (`review_tokens.expires_at`). Reminder email uses the same token.
- Collective defect flag lives on `quote_requests.defect_status` (not on claims)
- `companies.pending_name` workflow: mover submits a rename, admin approves/rejects

## Conventions

- All French text uses real UTF-8 characters (é, è, ê, à, ç), **never** `\u00XX` escapes or `\é` patterns
- French apostrophes in JSX: use `&apos;` not `'` (ESLint enforces)
- Color palette: primary green `#22c55e` via `--brand-green`, secondary blue `#1e40af`, brand-green-dark `#15803d`
- Fonts: DM Sans (body `--font-body`), Plus Jakarta Sans (display `--font-display`)
- Locked contact info: use `maskText`, `maskPhone`, `maskEmail` from `lib/utils.ts`
- `cn()` from `lib/utils.ts` for conditional Tailwind classes
- External API keys proxied through API routes, never client-side
- Lazy init for SDK clients (`getMollie()`, `getResend()`) to prevent build-time env errors
- `Set` spread: use `Array.from(new Set(...))` not `[...new Set(...)]` (TypeScript target compatibility)
- Images from external URLs: use `<img>` with `{/* eslint-disable-next-line @next/next/no-img-element */}`
- When deleting files from Supabase via `createUntypedAdminClient()`, the untyped client loses the narrow type — cast through `as unknown as <NarrowType>` when Postgres join shapes confuse TS
- Migrations have unique numbers but **numbering isn't strict** — when `002_X.sql` is already taken, use the next available number

## Testing

- Vitest runs against `src/**/*.test.ts(x)`. Config in `vitest.config.ts` + `vitest.setup.ts` at repo root
- Tests currently cover only pure helpers: `src/lib/sirene.test.ts` (VAT), `src/lib/utils.test.ts` (slug), `src/lib/defect-detection.test.ts` (thresholds)
- No integration tests — Supabase is not mocked
- Always check `npm run test` + `npm run build` before shipping
