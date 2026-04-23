# Wallet Expiry Alerts — Design Spec

**Date:** 2026-04-23
**Status:** Approved — ready for implementation plan
**Scope:** ~1h build

## Problem

`wallet_transactions` credits carry an `expires_at` (default 365 days from `walletValidityDays`). When a credit expires, `getWalletBalanceCents` silently drops it from the balance. Movers currently receive no warning — they discover the loss only by reading their ledger.

## Goal

Warn each mover by email before their credits expire so they have time to consume them on lead purchases.

## Non-goals

- In-app notifications (bell icon). Email only for v1.
- Dashboard badge / widget showing "X € expiring in Y days".
- Per-mover or per-threshold configuration via `site_settings`.
- J-1 reminder (J-30 + J-7 is enough; if they didn't act after J-7, J-1 won't change it).
- Admin observability for the warning pipeline (delivery rate, open rate).

Any of the above can be added later if the email-only baseline proves insufficient.

## Design

### Delivery cadence

Two thresholds per credit row:

- **J-30** — first nudge, soft urgency ("you have time")
- **J-7** — real alarm ("last chance")

One email **per mover per threshold**, aggregating every credit row that crossed that threshold in the last run. Example: if a mover has two refunds expiring on 2026-05-23 and 2026-05-25, one single email lists both.

### Trigger

Vercel cron, once per day at 09:00 UTC:

```json
{ "path": "/api/cron/warn-wallet-expiry", "schedule": "0 9 * * *" }
```

Auth: `Authorization: Bearer ${CRON_SECRET}` — same pattern as the two existing crons (`reconcile-payments`, `send-review-emails`).

### Schema — migration 025

Two tracking columns on `wallet_transactions` so we never double-send a threshold:

```sql
ALTER TABLE wallet_transactions
  ADD COLUMN warned_at_30d timestamptz,
  ADD COLUMN warned_at_7d  timestamptz;

CREATE INDEX idx_wallet_expiry_warning
  ON wallet_transactions (expires_at)
  WHERE amount_cents > 0
    AND type = 'refund'
    AND refund_method = 'wallet'
    AND expires_at IS NOT NULL;
```

The partial index is narrow on purpose: the warning worker only cares about positive wallet refunds with an expiry, which is a small fraction of the table. No impact on the hot-path balance query.

### Cron handler — `src/app/api/cron/warn-wallet-expiry/route.ts`

Two passes, run back to back in the same handler. The window for each pass is **exclusive of the more urgent threshold** so a single row never gets both emails:

**Pass 1 — J-7 (urgent)**

```
type = 'refund'
AND refund_method = 'wallet'
AND amount_cents > 0
AND expires_at >  now()
AND expires_at <= now() + interval '7 days'
AND warned_at_7d IS NULL
```

**Pass 2 — J-30 (soft)**

```
type = 'refund'
AND refund_method = 'wallet'
AND amount_cents > 0
AND expires_at >  now() + interval '7 days'   -- exclude the J-7 band
AND expires_at <= now() + interval '30 days'
AND warned_at_30d IS NULL
```

With this split, a row created with e.g. 5-day validity gets the J-7 email only; a row at 20 days gets the J-30 email only; a row starting at 60 days gets J-30 at day 30, then J-7 at day 7. No duplicate alerts.

For each pass, group matches by `company_id`. For each company:

- Fetch current balance via `getWalletBalanceCents(admin, companyId)`.
- **If `balance <= 0`, skip the email AND do not mark the rows** — debits have already consumed the credits in aggregate, nothing is actually at risk. Leaving `warned_at_*` null means the row will be re-evaluated on the next daily run, so if the balance recovers (new refund, reversed debit), the warning still fires before expiry.
- Fetch `name` and `email_contact` from `companies`.
- If no `email_contact`, mark the rows as warned (so we don't re-scan forever) and continue.
- Otherwise, send `sendWalletExpiryWarningEmail(...)` with all credit rows for that mover.
- On successful send (or graceful skip above), mark every row in the group with `warned_at_<threshold>d = now()`. On Resend error, do not mark — retry tomorrow.

### Email template

Register a new template `wallet_expiry_warning` in:

- `src/components/admin/settings/types.ts` → add to `EMAIL_TEMPLATE_DEFS` + `DEFAULT_EMAIL_TEMPLATES`
- `src/lib/resend.ts` → new `sendWalletExpiryWarningEmail(to, companyName, threshold, credits, totalCents)`

Template variables:

| Variable        | Example                                     |
| --------------- | ------------------------------------------- |
| `companyName`   | "Déménagements Dupont"                      |
| `threshold`     | `30` or `7` (number of days remaining)      |
| `thresholdLabel`| "30 jours" / "7 jours"                      |
| `totalAmount`   | "45,00 €"                                   |
| `creditLines`   | `<li>20,00 € — expire le 23 mai 2026</li>…` |
| `dashboardUrl`  | `${BRAND.siteUrl}/dashboard`                |

Tone:
- **J-30:** "Vous avez 45 € de crédit qui expirent dans les 30 prochains jours. C'est le bon moment d'acheter quelques leads."
- **J-7:** "Dernière chance : 45 € expirent dans moins de 7 jours. Ces crédits seront perdus après cette date."

CTA (single button): "Utiliser mes crédits" → `dashboardUrl`.

Use `sendTemplated("wallet_expiry_warning", emailTo, vars)` — the existing helper auto-injects `baseUrl` and `siteName`, matching every other email in the project.

### Edge cases

| Case                                                    | Behaviour                                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Credit already expired when the cron runs (late tick)   | Skipped by the `expires_at > now()` lower bound.                                                                                     |
| Balance ≤ 0 (credits already consumed in aggregate)     | Skip email, do **not** mark rows — re-check tomorrow in case balance recovers before expiry.                                         |
| Company has no `email_contact`                          | Skip email, mark rows as warned (prevent infinite re-scan).                                                                          |
| Resend API failure                                      | Log error, do **not** mark rows as warned — cron retries next day.                                                                   |
| A refund is issued today with `expires_at` ≤ 7 days away | Handler catches it on the next run. Single J-7 email sent; J-30 window excludes it by construction.                                  |
| Mover gets refund while cron is mid-run                 | No race: new row has `warned_at_*` both null, worst case is a next-day email.                                                        |

### Instrumentation

Minimal: `console.log` each pass with counts `{ threshold, rowsFound, movers, emailsSent, skippedNoEmail, skippedNoBalance, errors }`. Surface in Vercel logs. No Sentry custom events for v1.

### Tests

Out of scope for this spec — the project has no test harness wired in yet and adding one is a different initiative. The cron handler will be verified manually against a seeded staging row (documented in the implementation plan).

## Open questions

None. Ready for implementation plan.
