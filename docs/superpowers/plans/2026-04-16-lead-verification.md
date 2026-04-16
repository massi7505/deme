# Lead Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate distribution of quote requests on at least one of email/phone OTP being verified, with independent badges shown to movers so they can see which contact channels are proven real.

**Architecture:** Add a thin verification layer on top of the existing quote flow. `POST /api/quotes` saves the quote and sends both OTPs but does NOT distribute. A new public page `/verifier-demande/[id]` collects the codes. On the first successful verification, an idempotent `distributeLead()` helper matches movers and inserts `quote_distributions` (reusing the current logic extracted from the route). A feature flag lets us ship the code dark and enable it per environment.

**Tech Stack:** Next.js 14 App Router, Supabase PostgreSQL + Auth, Resend (email), SMSFactor (SMS), Tailwind + shadcn/ui, react-hook-form + zod, Framer Motion.

**Repo conventions to respect:**
- All French text uses real UTF-8 characters (é, è, ê, à, ç), never `\u00XX` escapes.
- French apostrophes in JSX → `&apos;`.
- Fetch handlers on client: check `r.ok` before calling `.json()` and before `setState` (per user memory `feedback_fetch_error_handling`).
- Capture refs as typed `const` after null guards before nested functions (per user memory `feedback_typescript_closures`).
- Never run `supabase db push` or similar in a Vercel build step (per user memory `feedback_build_rules`). Migrations are pushed locally by the engineer.
- `npm run build` must finish with 0 TypeScript / ESLint errors.

**There is no test framework in this repo.** Verification is `npm run build` (type-check + lint) plus manual smoke via browser or `curl`. Where a step says "verify", it means running the command and checking the expected output manually.

---

## File Structure

**Create:**
- `supabase/migrations/005_lead_verification.sql` — add verification columns, backfill `distributed_at` for legacy rows.
- `src/lib/distribute-lead.ts` — idempotent `distributeLead(quoteId)` helper (mover matching, distribution insert, mover notifications, client confirmation email).
- `src/lib/quote-verification.ts` — shared helpers: `generateOtp()`, `OTP_EXPIRY_MS`, `RESEND_COOLDOWN_MS`, `MAX_ATTEMPTS`, `ABANDON_AFTER_MS`, `checkRateLimit()`.
- `src/components/ui/otp-input.tsx` — shared OTP input component (moved from `mot-de-passe-oublie/page.tsx`).
- `src/app/api/quotes/send-email-otp/route.ts`
- `src/app/api/quotes/verify-email/route.ts`
- `src/app/api/quotes/resend-phone-otp/route.ts`
- `src/app/api/quotes/verification-status/route.ts`
- `src/app/(public)/verifier-demande/[id]/page.tsx` — post-submission verification UI.

**Modify:**
- `src/app/api/quotes/route.ts` — stop calling the inline distribution block; instead generate both OTPs, set `status='pending_verification'` effectively via `distributed_at=null`, return `quoteId`. Respect `LEAD_VERIFICATION_ENABLED` flag.
- `src/app/api/quotes/verify-phone/route.ts` — increment attempt counter, call `distributeLead` on first success, fetch mover-side fields after verify.
- `src/app/(public)/devis/page.tsx` — after success response, `router.push(\`/verifier-demande/\${quoteId}\`)` instead of showing the inline success panel.
- `src/app/(auth)/mot-de-passe-oublie/page.tsx` — import `OtpInput` from `@/components/ui/otp-input` (keep `length={8}` prop).
- `src/app/api/dashboard/overview/route.ts` — include `emailVerified` alongside `phoneVerified` in the lead list.
- `src/app/(dashboard)/demandes-de-devis/page.tsx` — render both badges.
- `src/app/(dashboard)/demandes-de-devis/[id]/page.tsx` — render both badges near the title.
- `src/lib/resend.ts` — add `sendQuoteVerificationEmail()`.
- `src/components/admin/settings/types.ts` — register `quoteVerification` template + default HTML body.
- `.env.local.example` — add `LEAD_VERIFICATION_ENABLED=true` line.

---

## Task 1: Database migration + regenerate types

**Files:**
- Create: `supabase/migrations/005_lead_verification.sql`
- Modify (via codegen): `src/types/database.types.ts`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/005_lead_verification.sql`:

```sql
-- 005_lead_verification.sql
-- Gate quote distribution on client-controlled email/phone verification.

ALTER TABLE quote_requests
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN email_verification_code TEXT,
  ADD COLUMN email_verification_expires TIMESTAMPTZ,
  ADD COLUMN email_verification_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN email_verification_last_sent_at TIMESTAMPTZ,
  ADD COLUMN phone_verification_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN phone_verification_last_sent_at TIMESTAMPTZ,
  ADD COLUMN distributed_at TIMESTAMPTZ,
  -- Persist the submitted coordinates so distributeLead (called later
  -- from verify routes) can still do radius matching. Before this
  -- migration, /api/quotes only read body.fromLat/fromLng in-memory.
  ADD COLUMN from_lat NUMERIC,
  ADD COLUMN from_lng NUMERIC;

-- Backfill legacy rows as already distributed so movers keep seeing
-- pre-feature leads exactly like before.
UPDATE quote_requests SET distributed_at = created_at WHERE distributed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_quote_requests_distributed_at
  ON quote_requests (distributed_at)
  WHERE distributed_at IS NULL;
```

- [ ] **Step 2: Push the migration to Supabase**

Run (in the project root, interactive terminal, not via Claude's Bash):

```bash
npx supabase db push
```

Expected: migration applied with no error; no prompts for destructive ops.

- [ ] **Step 3: Regenerate TypeScript types**

Run:

```bash
npx supabase gen types typescript --project-id=erbwycanjwtiqpdzaqam > src/types/database.types.ts
```

Expected: `src/types/database.types.ts` now lists the new columns under `quote_requests.Row`.

- [ ] **Step 4: Verify build still passes**

Run:

```bash
npm run build
```

Expected: `✓ Compiled successfully` and no new TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_lead_verification.sql src/types/database.types.ts
git commit -m "feat(db): add verification columns to quote_requests"
```

---

## Task 2: Shared OtpInput component

**Files:**
- Create: `src/components/ui/otp-input.tsx`
- Modify: `src/app/(auth)/mot-de-passe-oublie/page.tsx`

- [ ] **Step 1: Create the shared component**

Create `src/components/ui/otp-input.tsx`:

```tsx
"use client";

import { useRef } from "react";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
}

export function OtpInput({ value, onChange, length = 6, disabled }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, " ").split("").slice(0, length);

  function setDigit(i: number, d: string) {
    const clean = d.replace(/\D/g, "").slice(0, 1);
    const arr = value.padEnd(length, " ").split("");
    arr[i] = clean || " ";
    onChange(arr.join("").trim());
    if (clean && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-between gap-1.5 sm:gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          disabled={disabled}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          aria-label={`Chiffre ${i + 1}`}
          className="h-12 w-full min-w-0 rounded-lg border border-input bg-background text-center font-mono text-lg font-semibold text-foreground outline-none ring-offset-background transition focus:border-[var(--brand-green)] focus:ring-2 focus:ring-[var(--brand-green)]/40 disabled:opacity-50 sm:h-14 sm:text-xl"
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Replace local OtpInput in password-reset page**

In `src/app/(auth)/mot-de-passe-oublie/page.tsx`:

1. Remove the local `OtpInput` function (lines defining `function OtpInput(...)` down to its closing `}`).
2. Remove the `useRef` import from `react` if no longer used (keep `useState`, `useEffect`).
3. Add at the top with the other imports:

```tsx
import { OtpInput } from "@/components/ui/otp-input";
```

4. The JSX call `<OtpInput value={otp} onChange={setOtp} disabled={submitting} />` must pass `length={OTP_LENGTH}` so the 8-digit UI is preserved:

```tsx
<OtpInput value={otp} onChange={setOtp} length={OTP_LENGTH} disabled={submitting} />
```

- [ ] **Step 3: Verify build**

Run:

```bash
npm run build
```

Expected: build passes with no errors. Navigate to `/mot-de-passe-oublie` and confirm the OTP UI still renders 8 cells.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/otp-input.tsx src/app/(auth)/mot-de-passe-oublie/page.tsx
git commit -m "refactor(ui): extract shared OtpInput component"
```

---

## Task 3: Quote verification email template + Resend helper

**Files:**
- Modify: `src/components/admin/settings/types.ts`
- Modify: `src/lib/resend.ts`

- [ ] **Step 1: Register the template metadata**

In `src/components/admin/settings/types.ts`, inside the `EMAIL_TEMPLATE_DEFS` array, add as the last entry (after `passwordReset`):

```ts
  { key: "quoteVerification", label: "Vérification demande client", category: "Client", variables: ["siteName", "clientName", "otpCode", "expiryMinutes", "verifyUrl", "baseUrl"] },
```

- [ ] **Step 2: Add the default HTML body**

In the same file, inside the `DEFAULT_EMAIL_TEMPLATES` object, add after the `passwordReset` entry and before the closing `};`:

```ts
  quoteVerification: {
    subject: "Confirmez votre demande de devis — {{siteName}}",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px"><div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:24px;font-weight:700">{{siteName}}</h1></div><div style="padding:32px;background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0;font-size:20px;color:#111827">Bonjour {{clientName}},</h2><p style="color:#374151;line-height:1.6">Merci pour votre demande de devis. Pour la valider et permettre aux déménageurs de vous recontacter, saisissez ce code sur la page de confirmation :</p><div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:24px;margin:28px 0;text-align:center"><p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Votre code de vérification</p><p style="margin:0;font-family:'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#166534">{{otpCode}}</p></div><div style="text-align:center;margin:24px 0"><a href="{{verifyUrl}}" style="display:inline-block;background:#22c55e;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Valider ma demande</a></div><div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px;margin:20px 0"><p style="margin:0;color:#92400e;font-size:14px"><strong>⏱ Expire dans {{expiryMinutes}} minutes.</strong></p></div><p style="color:#6b7280;font-size:14px;line-height:1.6">Si vous n&apos;êtes pas à l&apos;origine de cette demande, ignorez cet email.</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"><p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">© {{siteName}}</p></div></div>`,
  },
```

- [ ] **Step 3: Add the Resend wrapper**

In `src/lib/resend.ts`, append at the end of the file (after `sendPasswordResetEmail`):

```ts
export async function sendQuoteVerificationEmail(
  to: string,
  clientName: string,
  otpCode: string,
  expiryMinutes: number,
  verifyUrl: string
) {
  return sendTemplated("quoteVerification", to, {
    clientName,
    otpCode,
    expiryMinutes: String(expiryMinutes),
    verifyUrl,
  });
}
```

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: 0 errors. Open `/admin/settings` → Email templates tab → the new "Vérification demande client" row appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/settings/types.ts src/lib/resend.ts
git commit -m "feat(email): add quoteVerification template and Resend helper"
```

---

## Task 4: Shared verification helpers

**Files:**
- Create: `src/lib/quote-verification.ts`

- [ ] **Step 1: Write the helpers**

Create `src/lib/quote-verification.ts`:

```ts
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
export const MAX_ATTEMPTS = 3;
export const ATTEMPT_LOCK_MS = 60 * 60 * 1000; // 1 hour
export const ABANDON_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateOtp(length: number = OTP_LENGTH): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return String(Math.floor(min + Math.random() * (max - min)));
}

export function otpExpiryIso(now: Date = new Date()): string {
  return new Date(now.getTime() + OTP_EXPIRY_MS).toISOString();
}

export type Channel = "email" | "phone";

export interface RateLimitState {
  lastSentAt: string | null;
  attempts: number;
  createdAt: string;
}

export interface RateLimitResult {
  ok: boolean;
  reason?: "cooldown" | "locked" | "abandoned";
  retryAfterSec?: number;
}

/** Decide whether a send/resend is allowed. Does not mutate state. */
export function checkResendAllowed(state: RateLimitState, now: Date = new Date()): RateLimitResult {
  const createdMs = now.getTime() - new Date(state.createdAt).getTime();
  if (createdMs > ABANDON_AFTER_MS) {
    return { ok: false, reason: "abandoned" };
  }
  if (state.lastSentAt) {
    const elapsedMs = now.getTime() - new Date(state.lastSentAt).getTime();
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        reason: "cooldown",
        retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000),
      };
    }
  }
  if (state.attempts >= MAX_ATTEMPTS && state.lastSentAt) {
    const elapsedMs = now.getTime() - new Date(state.lastSentAt).getTime();
    if (elapsedMs < ATTEMPT_LOCK_MS) {
      return {
        ok: false,
        reason: "locked",
        retryAfterSec: Math.ceil((ATTEMPT_LOCK_MS - elapsedMs) / 1000),
      };
    }
  }
  return { ok: true };
}

/** Check if a code is valid against the stored code + expiry. */
export function verifyCode(
  input: string,
  stored: string | null,
  expires: string | null,
  now: Date = new Date()
): { ok: boolean; reason?: "missing" | "expired" | "mismatch" } {
  if (!stored) return { ok: false, reason: "missing" };
  if (expires && new Date(expires).getTime() < now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (stored.trim() !== input.trim()) return { ok: false, reason: "mismatch" };
  return { ok: true };
}

/** Mask an email for display: "benais***@gmail.com" */
export function maskEmailForDisplay(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = Math.min(4, Math.max(1, local.length - 3));
  return `${local.slice(0, visible)}${"*".repeat(3)}@${domain}`;
}

/** Mask a phone for display: "06 ** ** ** 12" */
export function maskPhoneForDisplay(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `${digits.slice(0, 2)} ** ** ** ${digits.slice(-2)}`;
}

/** Type-safe shortcut for grabbing quote_requests row fields needed everywhere. */
export async function loadQuoteForVerification(quoteId: string) {
  const supabase = createUntypedAdminClient();
  const { data } = await supabase
    .from("quote_requests")
    .select(
      "id, created_at, distributed_at, client_name, client_first_name, client_last_name, client_email, client_phone, email_verified, email_verification_code, email_verification_expires, email_verification_attempts, email_verification_last_sent_at, phone_verified, phone_verification_code, phone_verification_expires, phone_verification_attempts, phone_verification_last_sent_at"
    )
    .eq("id", quoteId)
    .single();
  return data;
}
```

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/quote-verification.ts
git commit -m "feat(lib): shared OTP helpers and rate limit rules"
```

---

## Task 5: Extract distributeLead() helper

**Files:**
- Create: `src/lib/distribute-lead.ts`
- Modify: `src/app/api/quotes/route.ts` (extraction only — still called inline for now)

- [ ] **Step 1: Write the helper**

Create `src/lib/distribute-lead.ts`:

```ts
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { sendQuoteConfirmation, sendNewLeadNotification } from "@/lib/resend";
import { notifyNewLead } from "@/lib/onesignal";
import { sendLeadSMS } from "@/lib/smsfactor";

interface DistributeResult {
  alreadyDistributed: boolean;
  matchedMovers: number;
}

/** Calculate lead price in cents from admin settings. */
async function calculatePriceCents(
  supabase: ReturnType<typeof createUntypedAdminClient>,
  category: string,
  departmentCode: string,
  volumeM3: number | null
): Promise<number> {
  try {
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).single();
    const s = (data?.data || {}) as Record<string, unknown>;

    const basePrices: Record<string, string> = {
      national: (s.priceNational as string) || "12.00",
      entreprise: (s.priceEntreprise as string) || "18.00",
      international: (s.priceInternational as string) || "25.00",
    };
    let price = parseFloat(basePrices[category] || basePrices.national);

    if (s.pricingMode === "smart") {
      const deptRules = (s.smartPricingDepartments as Array<{ code: string; percent: number }>) || [];
      const deptRule = deptRules.find((r) => r.code === departmentCode);
      if (deptRule) price *= 1 + deptRule.percent / 100;

      if (volumeM3) {
        const volRules = (s.smartPricingVolume as Array<{ minM3: number; maxM3: number; percent: number }>) || [];
        const volRule = volRules.find((r) => volumeM3 >= r.minM3 && volumeM3 <= r.maxM3);
        if (volRule) price *= 1 + volRule.percent / 100;
      }

      const seasonRules = (s.smartPricingSeasons as Array<{ startDate: string; endDate: string; percent: number }>) || [];
      const today = new Date().toISOString().slice(0, 10);
      const seasonRule = seasonRules.find((r) => r.startDate && r.endDate && today >= r.startDate && today <= r.endDate);
      if (seasonRule) price *= 1 + seasonRule.percent / 100;
    }

    return Math.round(price * 100);
  } catch {
    const defaults: Record<string, number> = { national: 1200, entreprise: 1800, international: 2500 };
    return defaults[category] || 1200;
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Distribute a lead to matching movers. Idempotent: skips if `distributed_at`
 * is already set. Sends mover notifications + client confirmation email.
 */
export async function distributeLead(quoteId: string): Promise<DistributeResult> {
  const supabase = createUntypedAdminClient();

  const { data: quote } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (!quote) throw new Error(`Quote ${quoteId} not found`);
  if (quote.distributed_at) return { alreadyDistributed: true, matchedMovers: 0 };

  // Atomic-ish reservation: stamp distributed_at first. Subsequent callers
  // will see it set and short-circuit.
  const { data: stamped } = await supabase
    .from("quote_requests")
    .update({ distributed_at: new Date().toISOString() })
    .eq("id", quoteId)
    .is("distributed_at", null)
    .select("id")
    .single();

  if (!stamped) return { alreadyDistributed: true, matchedMovers: 0 };

  const departmentCode = (quote.from_postal_code || "").slice(0, 2);
  const category = quote.category || "national";

  // Match by department
  const { data: regionMatches } = await supabase
    .from("company_regions")
    .select("company_id, categories")
    .eq("department_code", departmentCode);

  // Match by radius
  const { data: radiusRules } = await supabase
    .from("company_radius")
    .select("company_id, lat, lng, radius_km, move_types");

  const matchedCompanyIds = new Set<string>();
  regionMatches?.forEach((m) => {
    if (m.categories?.includes(category)) matchedCompanyIds.add(m.company_id);
  });

  const fromLat = Number(quote.from_lat) || 0;
  const fromLng = Number(quote.from_lng) || 0;
  if (fromLat && fromLng && radiusRules) {
    for (const rule of radiusRules) {
      if (!rule.move_types?.includes(category)) continue;
      if (haversineKm(fromLat, fromLng, rule.lat, rule.lng) <= rule.radius_km) {
        matchedCompanyIds.add(rule.company_id);
      }
    }
  }

  const companyIds = Array.from(matchedCompanyIds).slice(0, 6);
  if (companyIds.length === 0) return { alreadyDistributed: false, matchedMovers: 0 };

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, email_contact, phone, account_status")
    .in("id", companyIds)
    .in("account_status", ["active", "trial"]);

  if (!companies || companies.length === 0) return { alreadyDistributed: false, matchedMovers: 0 };

  const priceCents = await calculatePriceCents(
    supabase,
    category,
    departmentCode,
    quote.volume_m3 ? Number(quote.volume_m3) : null
  );

  const distributions = companies.map((company) => ({
    quote_request_id: quote.id,
    company_id: company.id,
    price_cents: priceCents,
    is_trial: company.account_status === "trial",
    status: "pending",
    competitor_count: companies.length - 1,
  }));

  await supabase.from("quote_distributions").insert(distributions);

  for (const company of companies) {
    await notifyNewLead(company.id, {
      id: quote.id,
      fromCity: quote.from_city || "",
      toCity: quote.to_city || "",
      moveDate: quote.move_date || undefined,
    }).catch(() => {});

    if (company.email_contact) {
      await sendNewLeadNotification(
        company.email_contact,
        company.name,
        quote.from_city || "",
        quote.to_city || "",
        quote.id
      ).catch(() => {});
    }

    if (company.phone) {
      await sendLeadSMS(company.phone, {
        fromCity: quote.from_city || "",
        toCity: quote.to_city || "",
        moveDate: quote.move_date || undefined,
      }).catch(() => {});
    }

    await supabase.from("notifications").insert({
      company_id: company.id,
      type: "new_lead",
      title: "Nouvelle demande de devis",
      body: `${quote.from_city || "?"} → ${quote.to_city || "?"}`,
      data: { quoteId: quote.id },
    });
  }

  if (quote.client_email) {
    await sendQuoteConfirmation(
      quote.client_email,
      `${quote.client_first_name || ""} ${quote.client_last_name || ""}`.trim() || quote.client_name || "Client",
      quote.from_city || "",
      quote.to_city || "",
      quote.prospect_id
    ).catch(() => {});
  }

  return { alreadyDistributed: false, matchedMovers: companies.length };
}
```

Note: Task 1's migration added `from_lat` and `from_lng` columns and Task 6's `/api/quotes` handler persists them. So `quote.from_lat`/`from_lng` read here are real DB values. If a legacy quote has them null, `Number(null) → 0` and we fall back to department-only matching.

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/distribute-lead.ts
git commit -m "feat(lib): idempotent distributeLead helper"
```

---

## Task 6: Update POST /api/quotes to gate distribution

**Files:**
- Modify: `src/app/api/quotes/route.ts`

- [ ] **Step 1: Replace the file**

Full replacement of `src/app/api/quotes/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { generateProspectId } from "@/lib/utils";
import { sendOtpSMS } from "@/lib/smsfactor";
import { sendQuoteVerificationEmail } from "@/lib/resend";
import { distributeLead } from "@/lib/distribute-lead";
import { generateOtp, otpExpiryIso, OTP_EXPIRY_MS } from "@/lib/quote-verification";

const FEATURE_ENABLED = process.env.LEAD_VERIFICATION_ENABLED !== "false";

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_URL;
  if (url && !url.includes("localhost")) return url;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return url || "http://localhost:3000";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createUntypedAdminClient();

    const prospectId = generateProspectId();
    const departmentCode = body.fromPostalCode?.slice(0, 2) ?? "";

    const emailCode = generateOtp();
    const phoneCode = generateOtp();
    const otpExpires = otpExpiryIso();
    const nowIso = new Date().toISOString();

    const { data: quote, error: quoteError } = await supabase
      .from("quote_requests")
      .insert({
        prospect_id: prospectId,
        category: body.category ?? "national",
        move_type: body.moveType ?? "national",
        from_address: body.fromAddress,
        from_city: body.fromCity,
        from_postal_code: body.fromPostalCode,
        from_housing_type: body.fromHousingType,
        from_floor: body.fromFloor ?? 0,
        from_elevator: body.fromElevator ?? false,
        to_address: body.toAddress,
        to_city: body.toCity,
        to_postal_code: body.toPostalCode,
        to_housing_type: body.toHousingType,
        to_floor: body.toFloor ?? 0,
        to_elevator: body.toElevator ?? false,
        room_count: body.roomCount ? parseInt(body.roomCount) : null,
        volume_m3: body.volumeM3 ?? null,
        move_date: body.moveDate ?? null,
        client_salutation: body.salutation,
        client_first_name: body.firstName,
        client_last_name: body.lastName,
        client_name: `${body.firstName} ${body.lastName}`,
        client_phone: body.phone,
        client_email: body.email,
        source: "website",
        geographic_zone: departmentCode,
        status: "new",
        from_lat: body.fromLat ? parseFloat(body.fromLat) : null,
        from_lng: body.fromLng ? parseFloat(body.fromLng) : null,
        email_verification_code: emailCode,
        email_verification_expires: otpExpires,
        email_verification_last_sent_at: nowIso,
        phone_verification_code: phoneCode,
        phone_verification_expires: otpExpires,
        phone_verification_last_sent_at: nowIso,
      })
      .select()
      .single();

    if (quoteError || !quote) {
      console.error("[quotes] insert error:", quoteError);
      return NextResponse.json({ error: "Erreur lors de la création de la demande" }, { status: 500 });
    }

    // Send verification email
    let emailSent = false;
    if (body.email) {
      const verifyUrl = `${baseUrl()}/verifier-demande/${quote.id}`;
      try {
        await sendQuoteVerificationEmail(
          body.email,
          `${body.firstName || ""} ${body.lastName || ""}`.trim() || "client",
          emailCode,
          Math.round(OTP_EXPIRY_MS / 60000),
          verifyUrl
        );
        emailSent = true;
      } catch (err) {
        console.error("[quotes] email OTP send error:", err);
      }
    }

    // Send verification SMS
    let smsSent = false;
    if (body.phone) {
      try {
        await sendOtpSMS(body.phone, phoneCode);
        smsSent = true;
      } catch (err) {
        console.error("[quotes] SMS OTP send error:", err);
      }
    }

    // Feature-flag bypass: behave like the pre-feature flow.
    if (!FEATURE_ENABLED) {
      await distributeLead(quote.id).catch((err) =>
        console.error("[quotes] distributeLead error:", err)
      );
      return NextResponse.json({
        success: true,
        prospectId,
        quoteId: quote.id,
        verificationRequired: false,
        emailSent,
        smsSent,
      });
    }

    return NextResponse.json({
      success: true,
      prospectId,
      quoteId: quote.id,
      verificationRequired: true,
      emailSent,
      smsSent,
    });
  } catch (error) {
    console.error("[quotes] submission error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 3: Smoke test**

Run the dev server, submit a devis with a valid email + phone you own, and verify:

```bash
npm run dev
```

1. POST goes through (200 OK in network tab).
2. A row appears in `quote_requests` with `distributed_at = null` and both OTP codes stored.
3. No row appears in `quote_distributions` yet (query Supabase SQL editor: `SELECT * FROM quote_distributions WHERE quote_request_id = '<id>';` → empty).
4. An email with the code arrives (Resend dashboard shows send event).
5. An SMS with the code arrives (SMSFactor dashboard shows send event).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/quotes/route.ts
git commit -m "feat(quotes): gate distribution on verification, send email + SMS OTP"
```

---

## Task 7: Verification API routes (email side + resend + status)

**Files:**
- Create: `src/app/api/quotes/send-email-otp/route.ts`
- Create: `src/app/api/quotes/verify-email/route.ts`
- Create: `src/app/api/quotes/resend-phone-otp/route.ts`
- Create: `src/app/api/quotes/verification-status/route.ts`

- [ ] **Step 1: Create send-email-otp route**

Create `src/app/api/quotes/send-email-otp/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { sendQuoteVerificationEmail } from "@/lib/resend";
import {
  checkResendAllowed,
  generateOtp,
  loadQuoteForVerification,
  otpExpiryIso,
  OTP_EXPIRY_MS,
} from "@/lib/quote-verification";

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_URL;
  if (url && !url.includes("localhost")) return url;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return url || "http://localhost:3000";
}

export async function POST(request: NextRequest) {
  const { quoteId } = await request.json().catch(() => ({}));
  if (!quoteId) return NextResponse.json({ error: "quoteId requis" }, { status: 400 });

  const quote = await loadQuoteForVerification(quoteId);
  if (!quote) return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
  if (quote.email_verified) return NextResponse.json({ success: true, alreadyVerified: true });
  if (!quote.client_email)
    return NextResponse.json({ error: "Aucune adresse email enregistrée" }, { status: 400 });

  const rate = checkResendAllowed({
    lastSentAt: quote.email_verification_last_sent_at,
    attempts: quote.email_verification_attempts ?? 0,
    createdAt: quote.created_at,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives", reason: rate.reason, retryAfterSec: rate.retryAfterSec },
      { status: 429 }
    );
  }

  const code = generateOtp();
  const supabase = createUntypedAdminClient();
  await supabase
    .from("quote_requests")
    .update({
      email_verification_code: code,
      email_verification_expires: otpExpiryIso(),
      email_verification_last_sent_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  const verifyUrl = `${baseUrl()}/verifier-demande/${quoteId}`;
  try {
    await sendQuoteVerificationEmail(
      quote.client_email,
      `${quote.client_first_name || ""} ${quote.client_last_name || ""}`.trim() || "client",
      code,
      Math.round(OTP_EXPIRY_MS / 60000),
      verifyUrl
    );
  } catch (err) {
    console.error("[send-email-otp] send error:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create verify-email route**

Create `src/app/api/quotes/verify-email/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { distributeLead } from "@/lib/distribute-lead";
import { loadQuoteForVerification, verifyCode, MAX_ATTEMPTS } from "@/lib/quote-verification";

export async function POST(request: NextRequest) {
  const { quoteId, code } = await request.json().catch(() => ({}));
  if (!quoteId || !code) {
    return NextResponse.json({ error: "quoteId et code requis" }, { status: 400 });
  }

  const quote = await loadQuoteForVerification(quoteId);
  if (!quote) return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
  if (quote.email_verified) return NextResponse.json({ success: true, alreadyVerified: true });

  const attempts = quote.email_verification_attempts ?? 0;
  if (attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Trop d'essais. Demandez un nouveau code." },
      { status: 429 }
    );
  }

  const result = verifyCode(
    String(code),
    quote.email_verification_code,
    quote.email_verification_expires
  );

  const supabase = createUntypedAdminClient();

  if (!result.ok) {
    await supabase
      .from("quote_requests")
      .update({ email_verification_attempts: attempts + 1 })
      .eq("id", quoteId);
    const message =
      result.reason === "expired"
        ? "Le code a expiré. Demandez-en un nouveau."
        : "Code incorrect";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await supabase
    .from("quote_requests")
    .update({
      email_verified: true,
      email_verification_code: null,
      email_verification_expires: null,
      email_verification_attempts: 0,
    })
    .eq("id", quoteId);

  // Trigger distribution if this is the first verification to pass.
  try {
    await distributeLead(quoteId);
  } catch (err) {
    console.error("[verify-email] distributeLead error:", err);
    // Do not fail the verification — flag stays true; admin can retry.
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create resend-phone-otp route**

Create `src/app/api/quotes/resend-phone-otp/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { sendOtpSMS } from "@/lib/smsfactor";
import {
  checkResendAllowed,
  generateOtp,
  loadQuoteForVerification,
  otpExpiryIso,
} from "@/lib/quote-verification";

export async function POST(request: NextRequest) {
  const { quoteId } = await request.json().catch(() => ({}));
  if (!quoteId) return NextResponse.json({ error: "quoteId requis" }, { status: 400 });

  const quote = await loadQuoteForVerification(quoteId);
  if (!quote) return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
  if (quote.phone_verified) return NextResponse.json({ success: true, alreadyVerified: true });
  if (!quote.client_phone)
    return NextResponse.json({ error: "Aucun numéro enregistré" }, { status: 400 });

  const rate = checkResendAllowed({
    lastSentAt: quote.phone_verification_last_sent_at,
    attempts: quote.phone_verification_attempts ?? 0,
    createdAt: quote.created_at,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives", reason: rate.reason, retryAfterSec: rate.retryAfterSec },
      { status: 429 }
    );
  }

  const code = generateOtp();
  const supabase = createUntypedAdminClient();
  await supabase
    .from("quote_requests")
    .update({
      phone_verification_code: code,
      phone_verification_expires: otpExpiryIso(),
      phone_verification_last_sent_at: new Date().toISOString(),
    })
    .eq("id", quoteId);

  try {
    await sendOtpSMS(quote.client_phone, code);
  } catch (err) {
    console.error("[resend-phone-otp] send error:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Create verification-status route**

Create `src/app/api/quotes/verification-status/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  loadQuoteForVerification,
  maskEmailForDisplay,
  maskPhoneForDisplay,
  RESEND_COOLDOWN_MS,
} from "@/lib/quote-verification";

export async function POST(request: NextRequest) {
  const { quoteId } = await request.json().catch(() => ({}));
  if (!quoteId) return NextResponse.json({ error: "quoteId requis" }, { status: 400 });

  const quote = await loadQuoteForVerification(quoteId);
  if (!quote) return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });

  function cooldownSec(lastSent: string | null): number {
    if (!lastSent) return 0;
    const elapsed = Date.now() - new Date(lastSent).getTime();
    if (elapsed >= RESEND_COOLDOWN_MS) return 0;
    return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
  }

  return NextResponse.json({
    emailVerified: !!quote.email_verified,
    phoneVerified: !!quote.phone_verified,
    emailMasked: maskEmailForDisplay(quote.client_email || ""),
    phoneMasked: maskPhoneForDisplay(quote.client_phone || ""),
    emailCooldownSec: cooldownSec(quote.email_verification_last_sent_at),
    phoneCooldownSec: cooldownSec(quote.phone_verification_last_sent_at),
    distributed: !!quote.distributed_at,
  });
}
```

- [ ] **Step 5: Verify build**

Run:

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/quotes/send-email-otp src/app/api/quotes/verify-email src/app/api/quotes/resend-phone-otp src/app/api/quotes/verification-status
git commit -m "feat(api): email OTP verification routes + phone resend + status"
```

---

## Task 8: Update verify-phone route to trigger distribution

**Files:**
- Modify: `src/app/api/quotes/verify-phone/route.ts`

- [ ] **Step 1: Replace the file**

Full replacement:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { distributeLead } from "@/lib/distribute-lead";
import { loadQuoteForVerification, verifyCode, MAX_ATTEMPTS } from "@/lib/quote-verification";

export async function POST(request: NextRequest) {
  try {
    const { quoteId, code } = await request.json().catch(() => ({}));

    if (!quoteId || !code) {
      return NextResponse.json({ error: "quoteId et code requis" }, { status: 400 });
    }

    const quote = await loadQuoteForVerification(quoteId);
    if (!quote) return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    if (quote.phone_verified) return NextResponse.json({ success: true, alreadyVerified: true });

    const attempts = quote.phone_verification_attempts ?? 0;
    if (attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Trop d'essais. Demandez un nouveau code." },
        { status: 429 }
      );
    }

    const result = verifyCode(
      String(code),
      quote.phone_verification_code,
      quote.phone_verification_expires
    );

    const supabase = createUntypedAdminClient();

    if (!result.ok) {
      await supabase
        .from("quote_requests")
        .update({ phone_verification_attempts: attempts + 1 })
        .eq("id", quoteId);
      const message =
        result.reason === "expired"
          ? "Le code a expiré. Demandez-en un nouveau."
          : "Code incorrect";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await supabase
      .from("quote_requests")
      .update({
        phone_verified: true,
        phone_verification_code: null,
        phone_verification_expires: null,
        phone_verification_attempts: 0,
      })
      .eq("id", quoteId);

    try {
      await distributeLead(quoteId);
    } catch (err) {
      console.error("[verify-phone] distributeLead error:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[verify-phone] error:", error);
    return NextResponse.json({ error: "Erreur de vérification" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 3: Smoke test**

With a quote created in Task 6, POST to `/api/quotes/verify-phone` via curl:

```bash
curl -X POST http://localhost:3000/api/quotes/verify-phone \
  -H "Content-Type: application/json" \
  -d '{"quoteId":"<quote-id>","code":"<code-from-sms>"}'
```

Expected: `{"success":true}`. Verify in Supabase: `phone_verified = true`, `distributed_at` set, rows in `quote_distributions`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/quotes/verify-phone/route.ts
git commit -m "feat(api): trigger distribution on first successful phone verify"
```

---

## Task 9: /verifier-demande/[id] page

**Files:**
- Create: `src/app/(public)/verifier-demande/[id]/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/(public)/verifier-demande/[id]/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, Phone, ShieldCheck, Send } from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { cn } from "@/lib/utils";

interface Status {
  emailVerified: boolean;
  phoneVerified: boolean;
  emailMasked: string;
  phoneMasked: string;
  emailCooldownSec: number;
  phoneCooldownSec: number;
  distributed: boolean;
}

export default function VerifierDemandePage() {
  const params = useParams();
  const quoteId = params?.id as string;

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/quotes/verification-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      if (r.status === 404) {
        setNotFound(true);
        return;
      }
      if (!r.ok) return;
      const data = (await r.json()) as Status;
      setStatus(data);
      setEmailCooldown(data.emailCooldownSec);
      setPhoneCooldown(data.phoneCooldownSec);
    } catch {
      // network error — keep current state
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    if (!quoteId) return;
    refresh();
  }, [quoteId, refresh]);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setTimeout(() => setEmailCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCooldown]);

  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const t = setTimeout(() => setPhoneCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneCooldown]);

  async function submitCode(channel: "email" | "phone") {
    const code = channel === "email" ? emailOtp : phoneOtp;
    if (code.length !== 6) {
      toast.error("Saisissez le code à 6 chiffres reçu");
      return;
    }
    const setSubmitting = channel === "email" ? setEmailSubmitting : setPhoneSubmitting;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/quotes/verify-${channel}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, code }),
      });
      const body = r.ok ? await r.json() : await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(body?.error || "Code invalide");
        return;
      }
      toast.success(channel === "email" ? "Email vérifié" : "Téléphone vérifié");
      if (channel === "email") setEmailOtp("");
      else setPhoneOtp("");
      await refresh();
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend(channel: "email" | "phone") {
    const path =
      channel === "email" ? "/api/quotes/send-email-otp" : "/api/quotes/resend-phone-otp";
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const body = r.ok ? await r.json() : await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(body?.error || "Impossible d'envoyer le code");
        return;
      }
      toast.success("Nouveau code envoyé");
      if (channel === "email") setEmailCooldown(30);
      else setPhoneCooldown(30);
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-[var(--brand-green)]" />
      </div>
    );
  }

  if (notFound || !status) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold">Demande introuvable</h1>
        <p className="text-muted-foreground">
          Ce lien ne correspond à aucune demande active. Votre demande a peut-être expiré.
        </p>
        <Link
          href="/devis"
          className="rounded-lg bg-[var(--brand-green)] px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Faire une nouvelle demande
        </Link>
      </div>
    );
  }

  const anyVerified = status.emailVerified || status.phoneVerified;

  return (
    <div className="container max-w-3xl py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
            <ShieldCheck className="h-6 w-6 text-[var(--brand-green)]" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Confirmez votre demande
          </h1>
          <p className="text-sm text-muted-foreground">
            Validez au moins un canal pour que les déménageurs reçoivent votre demande.
            Valider les deux améliore la qualité du contact.
          </p>
        </div>

        {anyVerified && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-800">
            <strong>✓ Votre demande est transmise.</strong> Vous pouvez valider le second
            canal pour améliorer vos chances d&apos;être recontacté.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ChannelCard
            icon={Mail}
            title="Email"
            masked={status.emailMasked}
            verified={status.emailVerified}
            otp={emailOtp}
            onOtpChange={setEmailOtp}
            cooldown={emailCooldown}
            onSubmit={() => submitCode("email")}
            onResend={() => resend("email")}
            submitting={emailSubmitting}
          />
          <ChannelCard
            icon={Phone}
            title="Téléphone"
            masked={status.phoneMasked}
            verified={status.phoneVerified}
            otp={phoneOtp}
            onOtpChange={setPhoneOtp}
            cooldown={phoneCooldown}
            onSubmit={() => submitCode("phone")}
            onResend={() => resend("phone")}
            submitting={phoneSubmitting}
          />
        </div>
      </motion.div>
    </div>
  );
}

function ChannelCard({
  icon: Icon,
  title,
  masked,
  verified,
  otp,
  onOtpChange,
  cooldown,
  onSubmit,
  onResend,
  submitting,
}: {
  icon: typeof Mail;
  title: string;
  masked: string;
  verified: boolean;
  otp: string;
  onOtpChange: (v: string) => void;
  cooldown: number;
  onSubmit: () => void;
  onResend: () => void;
  submitting: boolean;
}) {
  return (
    <Card className={cn(verified && "border-green-200 bg-green-50/30")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon
            className={cn(
              "h-4 w-4",
              verified ? "text-[var(--brand-green)]" : "text-muted-foreground"
            )}
          />
          {title}
          {verified && (
            <CheckCircle2 className="ml-auto h-5 w-5 text-[var(--brand-green)]" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{masked}</p>
        {verified ? (
          <p className="text-sm font-medium text-[var(--brand-green-dark)]">Vérifié ✓</p>
        ) : (
          <>
            <OtpInput value={otp} onChange={onOtpChange} disabled={submitting} />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={onSubmit}
                disabled={submitting || otp.length !== 6}
                className="w-full gap-2 bg-brand-gradient text-white hover:brightness-110"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Valider
              </Button>
              <button
                type="button"
                onClick={onResend}
                disabled={cooldown > 0}
                className="text-xs font-medium text-[var(--brand-green)] transition-colors hover:text-[var(--brand-green-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : "Renvoyer le code"}
              </button>
            </div>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Send className="h-3 w-3" /> Pas reçu ? Vérifiez vos spams.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

Run:

```bash
npm run build
```

Expected: 0 errors. `/verifier-demande/[id]` appears in the build output.

- [ ] **Step 3: Commit**

```bash
git add src/app/(public)/verifier-demande
git commit -m "feat(client): /verifier-demande page with email + phone OTP"
```

---

## Task 10: Redirect /devis to verification page

**Files:**
- Modify: `src/app/(public)/devis/page.tsx`

- [ ] **Step 1: Locate the success handler**

Search the file for the fetch call to `/api/quotes`. It will be inside the submit handler and currently transitions to an inline success view.

- [ ] **Step 2: Replace the post-response logic**

Find the block that looks like:

```tsx
const res = await fetch("/api/quotes", { method: "POST", ... });
const data = await res.json();
if (res.ok && data.success) {
  setStep("success");
  setProspectId(data.prospectId);
}
```

Replace it with:

```tsx
const res = await fetch("/api/quotes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
if (!res.ok) {
  toast.error("Erreur lors de l&apos;envoi");
  return;
}
const data = await res.json();
if (!data.success) {
  toast.error(data.error || "Erreur lors de l&apos;envoi");
  return;
}
if (data.verificationRequired) {
  router.push(`/verifier-demande/${data.quoteId}`);
  return;
}
// Fallback (feature flag off): keep inline success flow
setStep("success");
setProspectId(data.prospectId);
```

If `router` isn't already imported, add at the top of the file:

```tsx
import { useRouter } from "next/navigation";
```

And inside the component function, before the submit handler:

```tsx
const router = useRouter();
```

Variable `payload` above must reference the existing form values object being sent — do not introduce a new name. If the original code inlined the body via `JSON.stringify({ ...form })`, keep the original argument and only add the post-response logic changes.

- [ ] **Step 3: Verify build + smoke test**

Run:

```bash
npm run build
```

Expected: 0 errors. Then `npm run dev`, submit a devis end-to-end, verify redirect to `/verifier-demande/<id>` and the two cards render.

- [ ] **Step 4: Commit**

```bash
git add src/app/(public)/devis/page.tsx
git commit -m "feat(devis): redirect to /verifier-demande after submit"
```

---

## Task 11: Mover-side email_verified badge

**Files:**
- Modify: `src/app/api/dashboard/overview/route.ts`
- Modify: `src/app/(dashboard)/demandes-de-devis/page.tsx`
- Modify: `src/app/(dashboard)/demandes-de-devis/[id]/page.tsx`

- [ ] **Step 1: Add emailVerified to overview API**

In `src/app/api/dashboard/overview/route.ts`, locate the lead-building map block. Find the line:

```ts
      phoneVerified: quote.phone_verified ?? false,
```

Add immediately above it:

```ts
      emailVerified: quote.email_verified ?? false,
```

- [ ] **Step 2: Surface the flag on the list**

In `src/app/(dashboard)/demandes-de-devis/page.tsx`, update the `Lead` interface to add `emailVerified`:

```ts
  emailVerified: boolean;
  phoneVerified: boolean;
```

Find the existing `{lead.phoneVerified && (...)}` block that renders the `Vérifié` badge. Immediately before it, add the email badge:

```tsx
{lead.emailVerified && (
  <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
    <ShieldCheck className="h-3 w-3" /> Email
  </span>
)}
```

And change the `phoneVerified` badge's label from `Vérifié` to `Tél` so the two are distinguishable:

```tsx
<span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
  <ShieldCheck className="h-3 w-3" /> Tél
</span>
```

- [ ] **Step 3: Surface the flag on the detail page**

In `src/app/(dashboard)/demandes-de-devis/[id]/page.tsx`, update the `Lead`/`LeadDetail` interface similarly to include `emailVerified: boolean;`. Locate the title section that renders the `Bloqué` / `Débloqué` badge and the phone `Vérifié` badge. Add an email badge alongside:

```tsx
{lead.emailVerified && (
  <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-700">
    <ShieldCheck className="h-3 w-3" /> Email vérifié
  </Badge>
)}
{lead.phoneVerified && (
  <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700">
    <ShieldCheck className="h-3 w-3" /> Tél vérifié
  </Badge>
)}
```

If `Badge` and `ShieldCheck` are already imported in the file, skip re-importing.

- [ ] **Step 4: Verify build**

Run:

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/dashboard/overview/route.ts "src/app/(dashboard)/demandes-de-devis"
git commit -m "feat(dashboard): show email_verified badge alongside phone"
```

---

## Task 12: Feature flag config + deployment checklist

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: Document the flag**

In `.env.local.example`, append:

```bash

# Lead verification — when "false", /api/quotes distributes immediately
# to movers (pre-feature behavior) for rollback without redeploy.
LEAD_VERIFICATION_ENABLED=true
```

- [ ] **Step 2: Add env vars to Vercel**

In the Vercel dashboard → Settings → Environment Variables, add for **Production + Preview + Development**:

- `LEAD_VERIFICATION_ENABLED = true`

Also confirm these are already present (they should be, per the user):

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SMSFACTOR_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 3: Push and verify deployment**

```bash
git push origin master
```

Then in Vercel dashboard, confirm the deployment is `Ready` and run a full smoke test:

1. Submit a devis with a real email + French phone number.
2. Get redirected to `/verifier-demande/<id>`.
3. Enter the email OTP (check Resend dashboard for the send).
4. See the "Votre demande est transmise" banner.
5. Enter the phone OTP (check SMSFactor for the send).
6. Both cards show "Vérifié ✓".
7. Log in as a mover whose region matches → see the lead with both badges.

- [ ] **Step 4: Commit**

```bash
git add .env.local.example
git commit -m "chore(env): document LEAD_VERIFICATION_ENABLED flag"
```

---

## Self-review checklist (to run after completing all tasks)

- [ ] Every spec requirement is covered by a task above. If not, add a task before shipping.
- [ ] No TODOs or placeholders in committed code.
- [ ] `npm run build` passes on the final commit.
- [ ] Manual smoke test completed end-to-end per Task 12 Step 3.
- [ ] `LEAD_VERIFICATION_ENABLED=true` confirmed in Vercel for Production.
- [ ] Legacy quotes (pre-migration) still visible to movers (because `distributed_at` was backfilled to `created_at`).
- [ ] A new devis submitted under the feature flag does NOT appear in `quote_distributions` until the first verification succeeds.
