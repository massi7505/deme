# KYC Integration — didit.me (SumSub removal)

**Date:** 2026-04-17
**Status:** Draft
**Owner:** solo-dev

## Context

The app has a half-finished SumSub integration: server lib (`src/lib/sumsub.ts`) and webhook handler exist, but the frontend CTA in `src/app/(auth)/verification-identite/page.tsx` still has `// TODO: Launch Sumsub SDK` and never launches a verification. No SumSub account is provisioned, no API key, no data in the `sumsub_applicant_id` column.

We will:
1. Replace SumSub with didit.me as the single KYC provider.
2. Finish the `verification-identite` flow so movers can actually verify.
3. Add an admin action to force re-verification of an already-verified company.

This is a clean swap — no abstraction layer, no provider toggle, no parallel operation.

## Goals

- Single KYC provider: didit.me.
- Working end-to-end flow: mover clicks "Vérifier mon identité" → redirected to didit hosted page → completes verification → webhook updates `kyc_status` → mover returns to app.
- Admin in `/admin/companies` can trigger a fresh re-verification for any company.
- API keys stay in Vercel env vars — never in the DB.

## Non-goals

- Multiple KYC providers or abstraction layer.
- Keeping SumSub as a fallback.
- Migrating historical SumSub data (there is none).

## Architecture

### Files to delete

- `src/lib/sumsub.ts`
- `src/app/api/webhooks/sumsub/route.ts`

### Files to create

```
src/lib/didit.ts                           — didit API client + webhook verification
src/app/api/webhooks/didit/route.ts        — handles didit verification events
src/app/api/kyc/start-session/route.ts     — creates a session, returns verification URL
src/app/api/admin/companies/[id]/kyc-reset/route.ts
                                           — admin-only: resets company to pending
```

### Files to modify

- `src/app/(auth)/verification-identite/page.tsx` — replace TODO, call start-session, redirect
- `src/app/admin/companies/page.tsx` — add "Re-demander vérification" button
- `.env.local.example` — remove SUMSUB_*, add DIDIT_*
- `supabase/migrations/009_kyc_didit.sql` — new

## didit API usage

### Create session

```
POST https://verification.didit.me/v3/session/
Headers:
  x-api-key: <DIDIT_API_KEY>
  Content-Type: application/json

Body:
{
  "workflow_id": "<DIDIT_WORKFLOW_ID>",
  "vendor_data": "<company.id>",
  "callback": "<BRAND.siteUrl>/verification-identite?return=1",
  "contact_details": { "email": "<company.email_contact>" }
}

Response:
{
  "session_id": "...",
  "session_token": "...",
  "verification_url": "..."
}
```

### Retrieve session (polling fallback, if webhook delayed)

```
GET https://verification.didit.me/v3/session/{session_id}/decision/
Headers: x-api-key: <DIDIT_API_KEY>
```

### Webhook verification

- HMAC-SHA256 of raw request body with `DIDIT_WEBHOOK_SECRET`.
- Compare to `x-signature-v2` header (constant-time compare).
- Require `|now - x-timestamp| < 300` seconds (replay protection).

### Status mapping

| didit status | our `kyc_status` |
|---|---|
| `Approved` | `approved` |
| `Declined` | `rejected` |
| `In Review` | `in_review` |
| `Not Started`, `In Progress`, `Abandoned`, `Expired` | `pending` |

## Database migration 009

```sql
-- Remove legacy SumSub column (no data in prod)
ALTER TABLE companies DROP COLUMN sumsub_applicant_id;

-- Add didit session tracking
ALTER TABLE companies ADD COLUMN didit_session_id TEXT;
```

`kyc_status` enum is unchanged: `pending | in_review | approved | rejected`.

## Environment variables

Remove from Vercel + `.env.local.example`:
- `SUMSUB_APP_TOKEN`
- `SUMSUB_SECRET_KEY`

Add:
- `DIDIT_API_KEY` — passed as `x-api-key` on session creation
- `DIDIT_WEBHOOK_SECRET` — HMAC secret for webhook verification
- `DIDIT_WORKFLOW_ID` — the workflow the user will go through (from didit dashboard)

## New webhook route

`src/app/api/webhooks/didit/route.ts`:

1. Read raw body as text.
2. Verify signature (HMAC-SHA256) + timestamp window (300s). Reject with 401 on mismatch.
3. Parse JSON. Extract `session_id`, `status`, `decision`, `vendor_data` (= companyId).
4. Map status → `kyc_status` (see table above).
5. On `Approved`: update `companies` (`kyc_status=approved`, `is_verified=true`, `account_status=active`), insert notification row, call `notifyKycApproved` (OneSignal), send `sendKycApprovedEmail`.
6. On `Declined`: update `companies` (`kyc_status=rejected`), insert notification, send `sendKycRejectedEmail` with reject reason from decision payload.
7. On `In Review`: update `companies` (`kyc_status=in_review`). No email.
8. On other: no-op.
9. Return `{ received: true }`.

## Start-session endpoint

`POST /api/kyc/start-session` (mover-authenticated):

1. Get current user → find their company row.
2. Reject with 409 if `kyc_status === 'approved'`.
3. Call `didit.createSession({ companyId, email, name })`.
4. Persist `didit_session_id = response.session_id`, `kyc_status = 'in_review'`.
5. Return `{ verificationUrl: response.verification_url }`.

## Frontend — verification-identite

Replace the TODO click handler with:

```ts
onClick={async () => {
  setLoading(true);
  const res = await fetch("/api/kyc/start-session", { method: "POST" });
  if (!res.ok) {
    toast.error("Impossible de démarrer la vérification. Réessayez.");
    setLoading(false);
    return;
  }
  const { verificationUrl } = await res.json();
  window.location.href = verificationUrl;
}}
```

On return (URL has `?return=1`), show a "Vérification en cours d'analyse…" state and poll `GET /api/kyc/status` every 5s (max 2 min) for `kyc_status` change. Webhook is authoritative — polling is just UX.

## Admin re-verification action

`/admin/companies` — add a button per row: "Re-demander vérification".

Handler: `POST /api/admin/companies/[id]/kyc-reset`
1. Require admin auth (existing `verifyAdminToken`).
2. `UPDATE companies SET didit_session_id = NULL, kyc_status = 'pending' WHERE id = :id`.
3. Optional: send email to `email_contact` asking the mover to re-verify. (Default: on.)
4. Return 200.

Next time the mover logs in and opens `/verification-identite`, a fresh session is created via `start-session` (no stale ID to reuse).

## Security

- Webhook signature verification is non-optional. Missing or invalid signature → 401, no DB write.
- Timestamp replay window: 300s.
- `DIDIT_API_KEY` and `DIDIT_WEBHOOK_SECRET` never returned to clients, never logged.
- `kyc-reset` endpoint is admin-only.

## Testing

- Manual smoke test in dev with didit sandbox workflow.
- Unit test: webhook signature verification with known payload/secret → known signature.
- Unit test: status mapping covers all 7 didit statuses.
- Build passes with 0 TS errors.

## Open questions

- **Admin status indicator for env vars?** Optional — a single-provider setup needs less operator feedback than a dual-provider one. Skipping unless we hit issues in testing. The admin can check Vercel directly.

## Rollout

1. Set `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`, `DIDIT_WORKFLOW_ID` on Vercel.
2. Configure webhook URL in didit dashboard: `<BRAND.siteUrl>/api/webhooks/didit`.
3. Apply migration 009 (`npx supabase db push`).
4. Deploy.
5. Test one signup end-to-end in sandbox.

## Rollback

- Revert the code + delete the added didit columns. There is no SumSub data to preserve; the DROP COLUMN for `sumsub_applicant_id` is destructive but the column has no data in prod.
- A safer mid-rollout option: feature-flag the frontend CTA behind an env var during canary.
