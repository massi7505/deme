# Wallet Expiry Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warn movers by email at J-30 and J-7 before their `wallet_transactions` credits expire, so they have time to consume them.

**Architecture:** A daily Vercel cron (`0 9 * * *`) queries `wallet_transactions` for positive wallet refund credits crossing the J-7 or J-30 expiry window, aggregates per mover, and sends one email per (mover × threshold). Two new tracking columns (`warned_at_7d`, `warned_at_30d`) prevent double-sends. Windows are disjoint (`]7d, 30d]` for J-30, `]0, 7d]` for J-7) so a credit never receives both warnings.

**Tech Stack:** Next.js App Router API route, Supabase (via `createUntypedAdminClient`), Resend templated email (`sendTemplated` helper), Vercel cron. **Note: project has no test harness — verification is manual against a seeded staging row (Task 6).**

---

## File Structure

**Create:**
- `supabase/migrations/025_wallet_expiry_warnings.sql` — two `ALTER TABLE` + one partial index
- `src/app/api/cron/warn-wallet-expiry/route.ts` — cron handler (two passes, J-7 then J-30)

**Modify:**
- `src/components/admin/settings/types.ts` — add `walletExpiryWarning` to `EMAIL_TEMPLATE_DEFS` + `DEFAULT_EMAIL_TEMPLATES`
- `src/lib/resend.ts` — add `sendWalletExpiryWarningEmail` helper
- `vercel.json` — register the new cron

Each file has a single responsibility. The cron handler is the only non-trivial logic and lives in its own file so it can be held in context at once.

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/025_wallet_expiry_warnings.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 025_wallet_expiry_warnings.sql
-- Track per-threshold expiry warnings so the daily cron never double-sends.

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS warned_at_30d timestamptz,
  ADD COLUMN IF NOT EXISTS warned_at_7d  timestamptz;

-- Partial index: the warning worker only scans positive wallet-method refunds
-- with an expiry. That's a small slice of wallet_transactions, so a narrow
-- index keeps the cron fast without affecting the hot-path balance query.
CREATE INDEX IF NOT EXISTS idx_wallet_expiry_warning
  ON wallet_transactions (expires_at)
  WHERE amount_cents > 0
    AND type = 'refund'
    AND refund_method = 'wallet'
    AND expires_at IS NOT NULL;
```

- [ ] **Step 2: Apply the migration to Supabase**

Run from the project root:

```bash
npx supabase db push
```

Expected output: `Applying migration 025_wallet_expiry_warnings.sql... OK`.

If the CLI prompts for a link/password, the project's existing session on the `erbwycanjwtiqpdzaqam` project is reused. If the CLI can't authenticate, use the Supabase dashboard SQL editor instead and paste the migration body.

- [ ] **Step 3: Verify the columns exist**

```bash
curl -s "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/wallet_transactions?select=id,warned_at_30d,warned_at_7d&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: a JSON array (possibly empty) with `warned_at_30d` and `warned_at_7d` present on the row shape. A `42703 column does not exist` error means the migration didn't apply.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/025_wallet_expiry_warnings.sql
git commit -m "feat(db): migration 025 — wallet_transactions expiry warning columns"
```

---

## Task 2: Register the email template

**Files:**
- Modify: `src/components/admin/settings/types.ts` (two edits in two separate arrays)

- [ ] **Step 1: Add the template metadata to `EMAIL_TEMPLATE_DEFS`**

Open `src/components/admin/settings/types.ts`. Find the `EMAIL_TEMPLATE_DEFS` array (~line 107). Immediately after the `walletRefund` entry, insert:

```ts
  { key: "walletExpiryWarning", label: "Expiration crédits portefeuille", category: "Déménageur", variables: ["siteName", "companyName", "thresholdLabel", "totalAmount", "creditLines", "baseUrl"] },
```

The variable names (`thresholdLabel`, `totalAmount`, `creditLines`) must match exactly — they're injected by the `sendWalletExpiryWarningEmail` helper in Task 3.

- [ ] **Step 2: Add the default template body to `DEFAULT_EMAIL_TEMPLATES`**

In the same file, find the `DEFAULT_EMAIL_TEMPLATES` object (~line 139). Immediately after the `walletRefund` entry, insert:

```ts
  walletExpiryWarning: {
    subject: "⏳ {{totalAmount}} de crédit portefeuille expirent sous {{thresholdLabel}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{companyName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Vous avez <strong>{{totalAmount}}</strong> de crédit portefeuille qui vont expirer dans les <strong>{{thresholdLabel}}</strong> à venir.</p>
<div style="${CALLOUT_AMBER}">
  <p style="margin:0 0 10px;font-weight:600;color:#92400e;">Détail des crédits concernés</p>
  <ul style="margin:0;padding-left:20px;color:#374151;">
    {{creditLines}}
  </ul>
</div>
<p style="margin:0 0 16px;color:#374151;">Ces crédits sont utilisés automatiquement sur vos prochains achats de leads — il suffit d&apos;acheter avant la date d&apos;expiration pour ne rien perdre.</p>
<a href="{{baseUrl}}/demandes-de-devis" style="${BTN_PRIMARY}">Voir les leads disponibles</a>
<p style="margin:24px 0 0;font-size:13px;color:#6b7280;">Passé la date d&apos;expiration, les crédits sont définitivement retirés de votre solde.</p>`,
  },
```

The `{{creditLines}}` placeholder receives pre-escaped `<li>` items from the helper — do not escape it again.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit --project tsconfig.json
```

Expected: exit 0, no output. A syntax error in the inserted literal would surface here.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/settings/types.ts
git commit -m "feat(email): register walletExpiryWarning template"
```

---

## Task 3: Email helper in resend.ts

**Files:**
- Modify: `src/lib/resend.ts` (add one function after `sendWalletRefundEmail`)

- [ ] **Step 1: Locate the insertion point**

In `src/lib/resend.ts`, find the `sendWalletRefundEmail` function (around line 221). The new function goes immediately after its closing `}`.

- [ ] **Step 2: Add the helper**

Insert this block:

```ts
/**
 * Warn a mover that wallet credits are about to expire. The cron groups all
 * credit rows crossing the same threshold (30d or 7d) into one email per
 * mover so the inbox stays clean.
 */
export async function sendWalletExpiryWarningEmail(
  to: string,
  companyName: string,
  threshold: 7 | 30,
  credits: Array<{ amountCents: number; expiresAt: string }>
) {
  const totalCents = credits.reduce((s, c) => s + c.amountCents, 0);
  const totalAmount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(totalCents / 100);
  const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const creditLines = credits
    .map((c) => {
      const amount = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(c.amountCents / 100);
      const date = dateFormatter.format(new Date(c.expiresAt));
      return `<li style="margin-bottom:4px;"><strong>${amount}</strong> — expire le ${date}</li>`;
    })
    .join("");
  const thresholdLabel = threshold === 7 ? "7 jours" : "30 jours";
  return sendTemplated("walletExpiryWarning", to, {
    companyName,
    thresholdLabel,
    totalAmount,
    creditLines,
  });
}
```

Notes:
- The `<li>` HTML is assembled here (not in the template) so the template stays static. The `creditLines` variable is injected raw by `replaceVars` — the helper is the only place where `amount` and `date` land, both from deterministic formatters, so there's no user-controlled text to escape.
- `threshold` is typed as `7 | 30` to prevent the caller from passing arbitrary numbers.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit --project tsconfig.json
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/resend.ts
git commit -m "feat(email): sendWalletExpiryWarningEmail helper"
```

---

## Task 4: Cron handler

**Files:**
- Create: `src/app/api/cron/warn-wallet-expiry/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { getWalletBalanceCents } from "@/lib/wallet";
import { sendWalletExpiryWarningEmail } from "@/lib/resend";

type Threshold = 7 | 30;

interface CreditRow {
  id: string;
  company_id: string;
  amount_cents: number;
  expires_at: string;
}

interface PassStats {
  threshold: Threshold;
  rowsFound: number;
  movers: number;
  emailsSent: number;
  skippedNoEmail: number;
  skippedNoBalance: number;
  errors: number;
}

/**
 * Daily cron. For each of the two disjoint windows (]0, 7d] and ]7d, 30d]),
 * finds positive wallet refund credits not yet warned at that threshold,
 * groups them per company, and sends one aggregated email per company.
 *
 * Marking rules:
 * - On successful send → mark all rows in the group with warned_at_<N>d = now().
 * - No email on file → mark as warned (stops the row from re-scanning forever).
 * - Balance ≤ 0 → DO NOT mark. If balance recovers before the expiry day, the
 *   warning fires on a later run.
 * - Resend error → DO NOT mark. Next day's run retries.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();
  const stats: PassStats[] = [];

  // J-7 first, then J-30. Order is cosmetic — the windows are disjoint so
  // the same row can never match both in the same run.
  for (const threshold of [7, 30] as const) {
    stats.push(await runPass(admin, threshold));
  }

  return NextResponse.json({ ok: true, stats });
}

async function runPass(
  admin: ReturnType<typeof createUntypedAdminClient>,
  threshold: Threshold
): Promise<PassStats> {
  const stats: PassStats = {
    threshold,
    rowsFound: 0,
    movers: 0,
    emailsSent: 0,
    skippedNoEmail: 0,
    skippedNoBalance: 0,
    errors: 0,
  };

  const now = new Date();
  const upper = new Date(now.getTime() + threshold * 24 * 60 * 60 * 1000).toISOString();
  // Lower bound:
  //   J-7 pass  → expires_at > now  (include everything down to the wire)
  //   J-30 pass → expires_at > now + 7d  (exclude the J-7 band)
  const lower =
    threshold === 30
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : now.toISOString();

  const warnedColumn = threshold === 7 ? "warned_at_7d" : "warned_at_30d";

  const { data, error } = await admin
    .from("wallet_transactions")
    .select("id, company_id, amount_cents, expires_at")
    .eq("type", "refund")
    .eq("refund_method", "wallet")
    .gt("amount_cents", 0)
    .gt("expires_at", lower)
    .lte("expires_at", upper)
    .is(warnedColumn, null);

  if (error) {
    console.error("[warn-wallet-expiry] query error:", error.message);
    stats.errors += 1;
    return stats;
  }

  const rows = (data || []) as CreditRow[];
  stats.rowsFound = rows.length;
  if (rows.length === 0) return stats;

  const byCompany = new Map<string, CreditRow[]>();
  for (const r of rows) {
    const list = byCompany.get(r.company_id) || [];
    list.push(r);
    byCompany.set(r.company_id, list);
  }
  stats.movers = byCompany.size;

  for (const [companyId, group] of byCompany) {
    const balance = await getWalletBalanceCents(admin, companyId);
    if (balance <= 0) {
      // Skip WITHOUT marking — balance may recover before expiry.
      stats.skippedNoBalance += 1;
      continue;
    }

    const { data: company } = await admin
      .from("companies")
      .select("name, email_contact")
      .eq("id", companyId)
      .maybeSingle();

    const companyInfo = company as { name: string; email_contact: string | null } | null;

    const ids = group.map((r) => r.id);

    if (!companyInfo?.email_contact) {
      // Mark as warned so we don't re-scan this row daily with no hope of sending.
      stats.skippedNoEmail += 1;
      await admin
        .from("wallet_transactions")
        .update({ [warnedColumn]: now.toISOString() })
        .in("id", ids);
      continue;
    }

    try {
      await sendWalletExpiryWarningEmail(
        companyInfo.email_contact,
        companyInfo.name,
        threshold,
        group.map((r) => ({ amountCents: r.amount_cents, expiresAt: r.expires_at }))
      );
      await admin
        .from("wallet_transactions")
        .update({ [warnedColumn]: now.toISOString() })
        .in("id", ids);
      stats.emailsSent += 1;
    } catch (err) {
      // DO NOT mark — retry tomorrow.
      stats.errors += 1;
      console.error(
        "[warn-wallet-expiry] email failed for company",
        companyId,
        (err as Error).message
      );
    }
  }

  return stats;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit --project tsconfig.json
```

Expected: exit 0. A missing import or bad type surfaces here.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/warn-wallet-expiry/route.ts
git commit -m "feat(cron): warn-wallet-expiry route — J-30 + J-7 aggregated emails"
```

---

## Task 5: Register the cron in vercel.json

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add the cron entry**

Current file content:

```json
{
  "crons": [
    { "path": "/api/cron/reconcile-payments", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/send-review-emails", "schedule": "0 * * * *" }
  ]
}
```

Replace the `crons` array with:

```json
{
  "crons": [
    { "path": "/api/cron/reconcile-payments", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/send-review-emails", "schedule": "0 * * * *" },
    { "path": "/api/cron/warn-wallet-expiry", "schedule": "0 9 * * *" }
  ]
}
```

`0 9 * * *` = 09:00 UTC daily (10:00 Paris CET / 11:00 CEST). Early enough that movers receive it during business hours.

- [ ] **Step 2: Commit and push to trigger a deploy**

```bash
git add vercel.json
git commit -m "feat(cron): schedule warn-wallet-expiry daily at 09:00 UTC"
git push origin master
```

Vercel picks up the new cron on deploy. Confirm after the deploy succeeds: **Vercel dashboard → project → Settings → Cron Jobs** should list three entries, the new one scheduled `0 9 * * *`.

---

## Task 6: Manual verification

**Goal:** exercise all four code paths (email sent, skipped for no balance, skipped for no email, marked on success) against real DB rows without waiting for the nightly schedule.

- [ ] **Step 1: Seed a test credit**

Pick a real mover company id with a known `email_contact` and a positive wallet balance. Query one:

```bash
curl -s "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/companies?email_contact=not.is.null&wallet_balance_cents=gt.0&select=id,name,email_contact,wallet_balance_cents&limit=3" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Pick one. Insert a wallet credit expiring in 5 days (J-7 band):

```bash
COMPANY_ID="<paste-id-here>"
curl -s -X POST "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/wallet_transactions" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"company_id\": \"$COMPANY_ID\",
    \"amount_cents\": 1500,
    \"type\": \"refund\",
    \"refund_method\": \"wallet\",
    \"reason\": \"Test J-7 alert\",
    \"expires_at\": \"$(date -u -d '+5 days' +%Y-%m-%dT%H:%M:%SZ)\"
  }"
```

Save the returned row id — call it `SEED_ID`.

- [ ] **Step 2: Manually trigger the cron against production**

```bash
curl -s "https://deme-iota.vercel.app/api/cron/warn-wallet-expiry" \
  -H "authorization: Bearer $CRON_SECRET"
```

Expected JSON response:

```json
{
  "ok": true,
  "stats": [
    { "threshold": 7, "rowsFound": 1, "movers": 1, "emailsSent": 1, "skippedNoEmail": 0, "skippedNoBalance": 0, "errors": 0 },
    { "threshold": 30, "rowsFound": 0, "movers": 0, "emailsSent": 0, "skippedNoEmail": 0, "skippedNoBalance": 0, "errors": 0 }
  ]
}
```

Confirm the mover received the email (Resend dashboard → Activity, or the mover's inbox).

- [ ] **Step 3: Confirm the row was marked**

```bash
curl -s "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/wallet_transactions?id=eq.$SEED_ID&select=warned_at_7d,warned_at_30d" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expected: `warned_at_7d` set to the timestamp of the run, `warned_at_30d` still null (disjoint windows — this row was in the J-7 band so only J-7 fires).

- [ ] **Step 4: Confirm idempotency**

Re-run the curl from Step 2. Expected: `rowsFound: 0` on the J-7 pass — the seeded row is excluded because `warned_at_7d` is now non-null.

- [ ] **Step 5: Clean up the seed**

```bash
curl -s -X DELETE "https://erbwycanjwtiqpdzaqam.supabase.co/rest/v1/wallet_transactions?id=eq.$SEED_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

- [ ] **Step 6: Record verification in the memory notes**

Update `memory/project_demenagement24_next_session.md` to note that wallet expiry alerts shipped, with the commit hash, and remove it from the remaining-work list.

---

## Rollback

If the cron misbehaves in production:

1. Disable the cron: remove the `warn-wallet-expiry` entry from `vercel.json`, commit, push. The cron stops on the next deploy.
2. The migration is additive (two nullable columns + one partial index). Leaving it in place is harmless. A `DROP COLUMN` is safe if needed but not required.
