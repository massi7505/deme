# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B2B/B2C moving marketplace connecting clients with professional moving companies in France. Revenue model: selling leads (quote requests) to movers. Each lead can be purchased by max 6 movers, then it's hidden. No free trial unlocks — all leads require payment. Brand name is configured via `NEXT_PUBLIC_SITE_NAME` env var (see `src/lib/brand.ts`).

## Commands

```bash
npm run dev          # Dev server (default port 3000)
npm run build        # Production build (66 pages, must pass with 0 errors)
npm run lint         # ESLint
npx supabase db push # Push migrations to Supabase
npx supabase gen types typescript --project-id=erbwycanjwtiqpdzaqam > src/types/database.types.ts
```

## Stack

- **Next.js 14** (App Router, Server Components) + **TypeScript strict**
- **Supabase** (PostgreSQL, Auth, Realtime, Storage) — project ref: `erbwycanjwtiqpdzaqam`
- **Tailwind CSS** + **shadcn/ui** (Radix primitives in `src/components/ui/`)
- **Framer Motion** for animations
- **React Hook Form** + **Zod** for all forms
- **Tanstack Query** via `QueryClientProvider` in `src/components/providers.tsx`
- **Mapbox GL JS** for address autocomplete and coverage maps

## Architecture

### Route Groups (39 pages)

- `(public)` — SEO pages: landing, mover listings, profiles, blog, FAQ, contact, quote form `/devis`, pricing, international
- `(auth)` — Mover registration 4-step wizard `/inscription/etape-{1-4}`, login `/connexion`, KYC `/verification-identite`, account creation `/creer-compte`
- `(dashboard)` — Authenticated mover area: `/apercu`, `/demandes-de-devis`, `/profil-entreprise`, `/configurations`, `/recommandations`, `/facturation`, `/compte`, `/compte/parametres`
- `admin/` — Admin dashboard with login: `/admin/login`, `/admin/dashboard`, `/admin/companies`, `/admin/leads`, `/admin/transactions`, `/admin/claims`, `/admin/blog`, `/admin/pages`, `/admin/reviews`, `/admin/settings`

### Layouts

- `(public)` — Header + Footer (both use `useSiteSettings()` for dynamic site name/email/phone)
- `(auth)` — Split panel: green gradient left, form right
- `(dashboard)` — Header + sidebar nav (`DashboardNav`) + mobile bottom nav
- `admin/` — Dark sidebar nav + token-based auth (cookie `admin_token`), login page has no sidebar

### Business Logic

**Lead lifecycle:**
1. Client submits 4-step form → `POST /api/quotes` creates `quote_requests` + matches movers by department/radius
2. Up to 6 `quote_distributions` created per request
3. Mover clicks "Acheter ce lead" → `POST /api/leads/unlock`
4. If `MOLLIE_API_KEY` is set: redirects to Mollie payment page → webhook confirms → unlocks lead
5. If `MOLLIE_API_KEY` is empty: **test mode** — instant unlock without payment
6. After 6 unlocks, lead status → "completed" and hidden from other movers
7. Only admin sees all leads regardless of unlock count

**Claims workflow:**
- Mover submits claim from unlocked lead detail page
- Admin sees claims at `/admin/claims` with conversation thread (stored as JSON in `admin_note`)
- Statuses: pending → in_review → approved/rejected/refunded
- Admin replies trigger email to mover via Resend

**Registration:**
- 4-step wizard stores data in `sessionStorage` (keys: `inscription_types`, `inscription_departments`, `inscription_company`, `inscription_contact`)
- `/creer-compte` calls `POST /api/auth/register` which uses `supabase.auth.admin.createUser()` (service role) to bypass RLS
- SIRET verification via INSEE API v3.11 (`X-INSEE-Api-Key-Integration` header)

### API Routes (30 routes)

Dashboard routes authenticate via `createClient()` from `lib/supabase/server.ts`, then query with `createUntypedAdminClient()` to bypass RLS.

Admin routes use token auth (`lib/admin-auth.ts`) — not Supabase auth.

Public API routes (`/api/public/*`) use `createUntypedAdminClient()` directly.

Key routes:
- `/api/dashboard/overview` — returns profile, company, leads, stats, notifications for the authenticated mover
- `/api/admin/leads` — GET returns all leads with distributions; POST handles distribute/remove/delete/update_status
- `/api/admin/companies` — GET returns all companies with profiles+regions; POST handles status/kyc/suspend/reactivate/delete
- `/api/admin/claims` — GET returns claims with company info; POST handles update_status and reply (with email)
- `/api/settings` — public GET returns site settings (name, URL, email, phone, address)

### Site Settings

Dynamic site settings stored in `admin-settings.json` (gitignored). Configured via `/admin/settings`. Available app-wide via `useSiteSettings()` hook + `SiteSettingsContext` in providers.

Settings propagate to: Header (site name), Footer (site name, email, phone, address), emails.

### Supabase Client Patterns

- `lib/supabase/client.ts` — Browser client (anon key)
- `lib/supabase/server.ts` — Server Components/Actions (cookies-based, async)
- `lib/supabase/admin.ts`:
  - `createAdminClient()` — Typed with Database interface
  - `createUntypedAdminClient()` — Untyped, used in most API routes (types don't match migration schema)

### External Integrations (all in `src/lib/`)

| File | Service | Notes |
|------|---------|-------|
| `mollie.ts` | Payments | Lazy `getMollie()`, if key empty → test mode (instant unlock) |
| `didit.ts` | KYC (didit.me) | HMAC-SHA256 webhook verification + 300s replay window |
| `onesignal.ts` | Push notifications | Tags-based targeting by company_id |
| `smsfactor.ts` | SMS | FR phone normalization |
| `resend.ts` | Email | Lazy `getResend()` (exported), HTML templates inline |
| `sirene.ts` | SIRET verification | INSEE API v3.11, `X-INSEE-Api-Key-Integration` header, 24h cache |
| `mapbox.ts` | Geocoding/maps | Address autocomplete via `AddressAutocomplete` component |
| `invoice.ts` | Invoices | HTML generation, Supabase Storage upload |
| `admin-auth.ts` | Admin auth | HMAC token generation/verification |
| `csv-export.ts` | CSV export | `downloadCSV()` for admin data export |

### Database

- Migration: `supabase/migrations/001_initial_schema.sql` (15 tables, RLS policies, 30+ indexes)
- Types: `src/types/database.types.ts` — **out of sync with migration**. Regenerate after `supabase db push`.
- All money stored as `_cents` (integers)
- Prospect IDs format: `12836359FR356619`
- Claims conversation stored as JSON array in `claims.admin_note`

## Conventions

- All French text uses real UTF-8 characters (é, è, ê, à, ç), **never** `\u00XX` escapes or `\é` patterns
- Color palette: primary green `#22c55e` via `--brand-green`, secondary blue `#1e40af`
- Fonts: DM Sans (body `--font-body`), Plus Jakarta Sans (display `--font-display`)
- Locked contact info: use `maskText`, `maskPhone`, `maskEmail` from `lib/utils.ts`
- `cn()` from `lib/utils.ts` for conditional Tailwind classes
- External API keys proxied through API routes, never client-side
- Lazy init for SDK clients (`getMollie()`, `getResend()`) to prevent build-time env errors
- `Set` spread: use `Array.from(new Set(...))` not `[...new Set(...)]` (TypeScript target compatibility)
- Images from external URLs: use `<img>` with `{/* eslint-disable-next-line @next/next/no-img-element */}`
- French apostrophes in JSX: use `&apos;` not `'`
