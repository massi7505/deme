# Anti-fraud leads — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Score every new lead submission against 8 deterministic detectors; when the score ≥ 50, hold the lead in `status='review_pending'` instead of distributing to movers, until an admin approves or rejects it from `/admin/leads`.

**Architecture:** Three layers, one commit each. Layer 1 = DB migration + pure detector module + unit tests (no runtime integration). Layer 2 = integrate scoring into `POST /api/quotes` + admin stats endpoint + admin leads approve/reject actions. Layer 3 = admin UI wiring (sidebar badge, status filter, detail-panel review block) + honeypot field on Step 4 form.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Supabase, Vitest, Tailwind. No new npm deps.

**Spec:** `docs/superpowers/specs/2026-04-22-anti-fraud-leads-design.md`

---

## File Structure

**Created (4):**
- `supabase/migrations/022_lead_fraud_detection.sql`
- `src/lib/fraud-detection.ts`
- `src/lib/disposable-emails.ts`
- `src/lib/fraud-detection.test.ts`

**Modified (6):**
- `src/app/api/quotes/route.ts` — integrate scoring, skip `distributeLead` when flagged
- `src/app/api/admin/leads/route.ts` — `approve_review` + `reject_review` actions
- `src/app/api/admin/stats/moderation/route.ts` — add `pendingLeadReviews` count
- `src/app/admin/layout.tsx` — badge on "Leads" sidebar entry
- `src/app/admin/leads/page.tsx` — new filter, row badge, detail-panel review block
- `src/components/quote-funnel/Step4Contact.tsx` — honeypot field + pass through to payload

---

## Task 1: Layer 1 — Migration + detector module + unit tests

### Step 1.1: Write the migration file

- [ ] Create `supabase/migrations/022_lead_fraud_detection.sql` with:

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

- [ ] Apply to Supabase:

```bash
cd /c/Users/FX507/Downloads/demenagement24
npx supabase db push
```

Expected: migration applied. If it reports "already applied" or a conflict, stop and escalate.

### Step 1.2: Create the disposable email domain list

- [ ] Create `src/lib/disposable-emails.ts`:

```ts
/**
 * Disposable / throwaway email domains. Used by fraud-detection's
 * disposable_email detector. Kept in its own file so the list can be
 * bumped without touching detection logic.
 *
 * Source: curated subset of common public lists (mailinator, yopmail,
 * guerrillamail, tempmail variants). Lowercased.
 */
export const DISPOSABLE_DOMAINS = new Set<string>([
  "10minutemail.com", "10minutemail.net", "20minutemail.com",
  "anonbox.net", "anonymbox.com", "armyspy.com",
  "binkmail.com", "bobmail.info", "bspamfree.org",
  "brefmail.com", "burnermail.io",
  "cuvox.de",
  "deadaddress.com", "despam.it", "discard.email", "discardmail.com", "dispostable.com",
  "einrot.com", "email60.com", "email-fake.com",
  "fakeinbox.com", "fake-mail.net", "fakemailgenerator.com", "fakeplace.com", "filzmail.com",
  "gmx.click", "grr.la", "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de",
  "guerrillamail.info", "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com",
  "harakirimail.com",
  "inboxalias.com", "inboxbear.com", "incognitomail.org",
  "jetable.org",
  "kurzepost.de",
  "linshiyouxiang.net",
  "mail-temp.com", "mailcatch.com", "maildrop.cc", "mailfa.tk",
  "mailforspam.com", "mailinator.com", "mailinator.net", "mailinator2.com",
  "mailmoat.com", "mailnesia.com", "mailnull.com", "mailtemp.info", "mailtothis.com",
  "mohmal.com", "mvrht.net", "mytemp.email",
  "nada.email", "noclickemail.com", "nospamfor.us", "nwldx.com",
  "objectmail.com", "oneoffemail.com", "onewaymail.com", "opentrash.com",
  "poofy.org", "pookmail.com", "proxymail.eu",
  "rcpt.at", "re-gister.com", "rmqkr.net",
  "sharklasers.com", "shieldedmail.com", "shitmail.me", "slopsbox.com", "sneakemail.com",
  "spam4.me", "spambox.us", "spamdecoy.net", "spamfree24.com", "spamfree24.eu",
  "spamfree24.info", "spamfree24.net", "spamfree24.org", "spamgourmet.com",
  "spamherelots.com", "spamhereplease.com", "spamhole.com", "spaminator.de",
  "spamthis.co.uk",
  "tafmail.com", "tagyourself.com", "teleworm.com", "teleworm.us",
  "temp-mail.org", "temp-mail.ru", "tempail.com", "tempe-mail.com",
  "tempemail.biz", "tempemail.com", "tempinbox.co.uk", "tempinbox.com",
  "tempmail.co", "tempmail.eu", "tempmail.ninja", "tempmail.us",
  "tempmailer.com", "tempmailer.de", "tempthe.net",
  "thankyou2010.com", "thisisnotmyrealemail.com", "throwaway.email",
  "throwawayemailaddress.com", "trashmail.at", "trashmail.com", "trashmail.de",
  "trashmail.me", "trashmail.net", "trashmail.ws", "trashymail.com",
  "trbvm.com", "trialmail.de",
  "upliftnow.com",
  "veryrealemail.com",
  "wegwerfmail.de", "wegwerfmail.net", "wegwerfmail.org",
  "yopmail.com", "yopmail.fr", "yopmail.net", "you-spam.com",
  "zetmail.com",
]);
```

### Step 1.3: Write failing tests for sync detectors

- [ ] Create `src/lib/fraud-detection.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  isDisposableEmail,
  hasHoneypot,
  hasSuspiciousName,
  hasUrlInNotes,
  hasForeignScriptOrSpam,
  hasPostalMismatch,
  FRAUD_THRESHOLD,
  HONEYPOT_FIELD_NAME,
} from "./fraud-detection";

describe("isDisposableEmail", () => {
  it("flags a disposable domain", () => {
    expect(isDisposableEmail("user@yopmail.com")).toBe(true);
    expect(isDisposableEmail("Test@MAILINATOR.COM")).toBe(true);
  });
  it("does not flag a mainstream domain", () => {
    expect(isDisposableEmail("user@gmail.com")).toBe(false);
    expect(isDisposableEmail("foo@orange.fr")).toBe(false);
  });
  it("returns false when email is missing or malformed", () => {
    expect(isDisposableEmail(undefined)).toBe(false);
    expect(isDisposableEmail("")).toBe(false);
    expect(isDisposableEmail("not-an-email")).toBe(false);
  });
});

describe("hasHoneypot", () => {
  it("flags when honeypot field has content", () => {
    expect(hasHoneypot("anything")).toBe(true);
    expect(hasHoneypot("  padded  ")).toBe(true);
  });
  it("does not flag when empty or whitespace", () => {
    expect(hasHoneypot("")).toBe(false);
    expect(hasHoneypot("   ")).toBe(false);
    expect(hasHoneypot(undefined)).toBe(false);
  });
});

describe("hasSuspiciousName", () => {
  it("flags names with digits or symbols", () => {
    expect(hasSuspiciousName("jean3")).toBe(true);
    expect(hasSuspiciousName("jean@paul")).toBe(true);
  });
  it("flags ALL-CAPS names >= 3 chars", () => {
    expect(hasSuspiciousName("DUPONT")).toBe(true);
  });
  it("does not flag real French names", () => {
    expect(hasSuspiciousName("Jean-Pierre")).toBe(false);
    expect(hasSuspiciousName("O'Brien")).toBe(false);
    expect(hasSuspiciousName("Élise")).toBe(false);
    expect(hasSuspiciousName("Mo")).toBe(false); // short all-caps is fine
  });
  it("handles missing name", () => {
    expect(hasSuspiciousName("")).toBe(false);
    expect(hasSuspiciousName(undefined)).toBe(false);
  });
});

describe("hasUrlInNotes", () => {
  it("flags http/https URLs", () => {
    expect(hasUrlInNotes("visit https://example.com for more")).toBe(true);
    expect(hasUrlInNotes("http://foo.bar")).toBe(true);
  });
  it("flags www. prefix", () => {
    expect(hasUrlInNotes("go to www.example.com")).toBe(true);
  });
  it("flags bare TLDs", () => {
    expect(hasUrlInNotes("my site is coolshop.com")).toBe(true);
    expect(hasUrlInNotes("contact me at site.xyz")).toBe(true);
  });
  it("does not flag normal French moving notes", () => {
    expect(hasUrlInNotes("J'ai un piano fragile, merci de faire attention")).toBe(false);
    expect(hasUrlInNotes("")).toBe(false);
    expect(hasUrlInNotes(undefined)).toBe(false);
  });
});

describe("hasForeignScriptOrSpam", () => {
  it("flags Cyrillic script", () => {
    expect(hasForeignScriptOrSpam("Привет мир", "")).toBe(true);
  });
  it("flags CJK script", () => {
    expect(hasForeignScriptOrSpam("你好", "")).toBe(true);
  });
  it("flags spam keywords", () => {
    expect(hasForeignScriptOrSpam("make money with casino now", "")).toBe(true);
    expect(hasForeignScriptOrSpam("bitcoin loan", "")).toBe(true);
  });
  it("does not flag normal French content", () => {
    expect(hasForeignScriptOrSpam("Besoin d'un devis rapide", "Jean Dupont")).toBe(false);
  });
});

describe("hasPostalMismatch", () => {
  it("flags when postal department does not match city department", () => {
    // 75 is Paris; postal 06000 is Alpes-Maritimes → mismatch if city is "Paris"
    expect(hasPostalMismatch("06000", "Paris")).toBe(true);
  });
  it("does not flag matching postal / city", () => {
    expect(hasPostalMismatch("75001", "Paris")).toBe(false);
    expect(hasPostalMismatch("06000", "Nice")).toBe(false);
  });
  it("skips gracefully with incomplete data (no false positive)", () => {
    expect(hasPostalMismatch(undefined, "Paris")).toBe(false);
    expect(hasPostalMismatch("75001", undefined)).toBe(false);
    expect(hasPostalMismatch("abc", "Paris")).toBe(false);
  });
  it("does not flag when the city is unknown to us (data gap, not fraud)", () => {
    expect(hasPostalMismatch("75001", "Pouet-sur-Mer")).toBe(false);
  });
});

describe("constants", () => {
  it("threshold is 50", () => {
    expect(FRAUD_THRESHOLD).toBe(50);
  });
  it("honeypot field name is stable", () => {
    expect(HONEYPOT_FIELD_NAME).toBe("__nickname");
  });
});
```

### Step 1.4: Run tests — should FAIL (module doesn't exist)

- [ ] Run:

```bash
cd /c/Users/FX507/Downloads/demenagement24
npm run test -- fraud-detection
```

Expected: FAIL with "Cannot find module './fraud-detection'" or similar.

### Step 1.5: Implement the detector module

- [ ] Create `src/lib/fraud-detection.ts`:

```ts
import type { createUntypedAdminClient } from "@/lib/supabase/admin";
import { DISPOSABLE_DOMAINS } from "./disposable-emails";

type Admin = ReturnType<typeof createUntypedAdminClient>;

export const FRAUD_THRESHOLD = 50;
export const HONEYPOT_FIELD_NAME = "__nickname";

export type FraudReason = {
  code: string;
  label: string;
  weight: number;
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

export type ScoreContext = {
  supabase: Admin;
  quoteId: string;
};

// ─── Sync detectors ──────────────────────────────────────────────────────

export function isDisposableEmail(email: string | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return DISPOSABLE_DOMAINS.has(domain);
}

export function hasHoneypot(honeypot: string | undefined): boolean {
  if (!honeypot || typeof honeypot !== "string") return false;
  return honeypot.trim() !== "";
}

export function hasSuspiciousName(name: string | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  if (/\d/.test(name)) return true;
  // Allow letters (incl. French accents), space, apostrophe, hyphen only.
  if (/[^a-zA-Zà-ÿÀ-Ÿ '\-]/.test(name)) return true;
  if (name.length >= 3 && name === name.toUpperCase() && /[A-ZÀ-Ÿ]/.test(name)) return true;
  return false;
}

export function hasUrlInNotes(notes: string | undefined): boolean {
  if (!notes || typeof notes !== "string") return false;
  return /(https?:\/\/|www\.|\.(com|fr|ru|cn|xyz|click|top|info|biz)\b)/i.test(notes);
}

export function hasForeignScriptOrSpam(notes: string | undefined, name: string | undefined): boolean {
  const haystack = `${notes || ""} ${name || ""}`;
  // Cyrillic: Ѐ-ӿ, CJK unified ideographs: 一-鿿
  if (/[Ѐ-ӿ一-鿿]/.test(haystack)) return true;
  if (/\b(casino|loan|bitcoin|viagra|crypto|btc)\b/i.test(haystack)) return true;
  return false;
}

// Static postal → département map (first 2 digits of French postal code).
// Used by hasPostalMismatch. Only covers the 50 main French cities so we
// don't false-flag legitimate-but-unknown cities.
const CITY_TO_DEPARTMENT: Record<string, string> = {
  "paris": "75",
  "marseille": "13",
  "lyon": "69",
  "toulouse": "31",
  "nice": "06",
  "nantes": "44",
  "montpellier": "34",
  "strasbourg": "67",
  "bordeaux": "33",
  "lille": "59",
  "rennes": "35",
  "reims": "51",
  "saint-etienne": "42",
  "toulon": "83",
  "le havre": "76",
  "grenoble": "38",
  "dijon": "21",
  "angers": "49",
  "nimes": "30",
  "villeurbanne": "69",
  "saint-denis": "93",
  "aix-en-provence": "13",
  "clermont-ferrand": "63",
  "brest": "29",
  "tours": "37",
  "limoges": "87",
  "amiens": "80",
  "perpignan": "66",
  "metz": "57",
  "besancon": "25",
  "boulogne-billancourt": "92",
  "orleans": "45",
  "mulhouse": "68",
  "rouen": "76",
  "caen": "14",
  "nancy": "54",
  "saint-paul": "974",
  "argenteuil": "95",
  "montreuil": "93",
  "roubaix": "59",
  "tourcoing": "59",
  "nanterre": "92",
  "avignon": "84",
  "vitry-sur-seine": "94",
  "creteil": "94",
  "dunkerque": "59",
  "poitiers": "86",
  "asnieres-sur-seine": "92",
  "versailles": "78",
  "courbevoie": "92",
};

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function hasPostalMismatch(
  postalCode: string | undefined,
  city: string | undefined
): boolean {
  if (!postalCode || !city) return false;
  if (!/^\d{5}$/.test(postalCode)) return false;
  const postalDept = postalCode.slice(0, 2);
  const cityDept = CITY_TO_DEPARTMENT[normalizeCity(city)];
  if (!cityDept) return false; // city unknown → don't flag (false-positive guard)
  // Département can be 2 or 3 digits (DOM-TOM); compare prefixes.
  return !cityDept.startsWith(postalDept);
}

// ─── DB detectors ────────────────────────────────────────────────────────

async function hasDuplicatePhone7d(
  phone: string | undefined,
  ctx: ScoreContext
): Promise<boolean> {
  if (!phone) return false;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await ctx.supabase
    .from("quote_requests")
    .select("id", { count: "exact", head: true })
    .eq("client_phone", phone)
    .gte("created_at", sevenDaysAgo)
    .neq("id", ctx.quoteId);
  return (count ?? 0) > 0;
}

async function hasDuplicateEmail7d(
  email: string | undefined,
  ctx: ScoreContext
): Promise<boolean> {
  if (!email) return false;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await ctx.supabase
    .from("quote_requests")
    .select("id", { count: "exact", head: true })
    .eq("client_email", email.toLowerCase())
    .gte("created_at", sevenDaysAgo)
    .neq("id", ctx.quoteId);
  return (count ?? 0) > 0;
}

// ─── Aggregator ──────────────────────────────────────────────────────────

export async function scoreLead(
  lead: LeadInput,
  ctx: ScoreContext
): Promise<{ score: number; reasons: FraudReason[] }> {
  const reasons: FraudReason[] = [];

  // Sync checks (cheap, run first).
  if (hasHoneypot(lead.honeypot)) {
    reasons.push({ code: "honeypot_filled", label: "Bot (champ piégé rempli)", weight: 100 });
  }
  if (isDisposableEmail(lead.email)) {
    reasons.push({ code: "disposable_email", label: "Email jetable", weight: 50 });
  }
  const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
  if (hasSuspiciousName(lead.firstName) || hasSuspiciousName(lead.lastName)) {
    reasons.push({ code: "suspicious_name", label: "Nom / prénom suspect", weight: 20 });
  }
  if (hasUrlInNotes(lead.notes)) {
    reasons.push({ code: "url_in_notes", label: "URL dans les notes", weight: 40 });
  }
  if (hasForeignScriptOrSpam(lead.notes, fullName)) {
    reasons.push({ code: "foreign_script_or_spam", label: "Texte étranger / spam", weight: 35 });
  }
  if (hasPostalMismatch(lead.fromPostalCode, lead.fromCity)) {
    reasons.push({ code: "postal_mismatch", label: "Code postal / ville incohérents", weight: 30 });
  }

  // DB checks in parallel.
  const [dupPhone, dupEmail] = await Promise.all([
    hasDuplicatePhone7d(lead.phone, ctx),
    hasDuplicateEmail7d(lead.email, ctx),
  ]);
  if (dupPhone) {
    reasons.push({ code: "dup_phone_7d", label: "Téléphone déjà utilisé (<7j)", weight: 40 });
  }
  if (dupEmail) {
    reasons.push({ code: "dup_email_7d", label: "Email déjà utilisé (<7j)", weight: 35 });
  }

  const score = reasons.reduce((sum, r) => sum + r.weight, 0);
  return { score, reasons };
}
```

### Step 1.6: Run tests — should PASS

- [ ] Run:

```bash
cd /c/Users/FX507/Downloads/demenagement24
npm run test -- fraud-detection
```

Expected: PASS, all ~20 cases green.

### Step 1.7: Verify build passes

- [ ] Run:

```bash
npm run build
```

Expected: compile success, no new errors or warnings.

### Step 1.8: Commit + push + deploy Layer 1

- [ ] Run:

```bash
cd /c/Users/FX507/Downloads/demenagement24
git add supabase/migrations/022_lead_fraud_detection.sql src/lib/fraud-detection.ts src/lib/disposable-emails.ts src/lib/fraud-detection.test.ts
git commit -m "$(cat <<'EOF'
feat(fraud): detector module + migration + unit tests

Migration 022 adds fraud_score, fraud_reasons, reviewed_at/by on
quote_requests (non-destructive; existing rows default to 0 / []).

fraud-detection.ts exports 6 sync detectors (disposable email, honeypot,
suspicious name, URL in notes, Cyrillic/CJK/spam keywords, postal/city
mismatch against a static 50-city map) + 2 DB detectors (duplicate phone
and duplicate email over the last 7 days) + an aggregator scoreLead().

Threshold set to 50 so honeypot (100) or disposable_email (50) trips
alone, while a single soft signal like suspicious_name (20) does not.

disposable-emails.ts is a separate ~100-domain set so the list can be
refreshed without touching detection logic.

Not yet wired into /api/quotes — that's the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_ScEfzxa5vgqh7w84HVr0VHO77k20/lQzqg9gaSp"
```

---

## Task 2: Layer 2 — Integrate scoring + admin API actions

### Step 2.1: Wire scoring into POST /api/quotes

- [ ] Open `src/app/api/quotes/route.ts`
- [ ] Add this import after the existing imports:

```ts
import { scoreLead, FRAUD_THRESHOLD, HONEYPOT_FIELD_NAME } from "@/lib/fraud-detection";
```

- [ ] Find the block immediately after `if (quoteError || !quote) { ... return 500; }` (around line 95). Just before the `// Verification email only goes out when the feature is enabled;` comment, INSERT this new block:

```ts
    // Fraud detection. Silent: response stays identical whether flagged
    // or clean. A flagged lead is parked in status='review_pending' with
    // no distribution; admin approves/rejects from /admin/leads.
    try {
      const { score, reasons } = await scoreLead(
        {
          email: body.email,
          phone: body.phone,
          firstName: body.firstName,
          lastName: body.lastName,
          notes: body.notes,
          fromPostalCode: body.fromPostalCode,
          fromCity: body.fromCity,
          honeypot: body[HONEYPOT_FIELD_NAME],
        },
        { supabase, quoteId: quote.id }
      );

      if (score >= FRAUD_THRESHOLD) {
        await supabase
          .from("quote_requests")
          .update({
            status: "review_pending",
            fraud_score: score,
            fraud_reasons: reasons,
          })
          .eq("id", quote.id);
        await supabase.from("notifications").insert({
          type: "system",
          title: "Lead en attente de vérification",
          body: `Score ${score} — ${reasons.map((r) => r.label).join(", ")}`,
          data: { quoteRequestId: quote.id, fraudScore: score },
        });
      } else {
        await supabase
          .from("quote_requests")
          .update({ fraud_score: score, fraud_reasons: reasons })
          .eq("id", quote.id);
      }
      // Mark the quote object locally so the distribution guard below
      // knows whether to skip.
      (quote as Record<string, unknown>).status = score >= FRAUD_THRESHOLD ? "review_pending" : quote.status;
    } catch (err) {
      // If fraud detection throws, log and proceed as if clean. Never block
      // a legitimate lead on detector failure.
      console.error("[quotes] fraud-detection error:", err);
    }
```

- [ ] Find the existing `// Feature-flag bypass: behave like the pre-feature flow.` block (around line 130) — the one containing `await distributeLead(quote.id).catch(...)`. Replace the whole `if (!FEATURE_ENABLED) { ... }` branch with:

**Before:**
```ts
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
```

**After:**
```ts
    // Feature-flag bypass: behave like the pre-feature flow (but still
    // honor the fraud hold — a flagged lead should never auto-distribute).
    if (!FEATURE_ENABLED) {
      if ((quote as Record<string, unknown>).status !== "review_pending") {
        await distributeLead(quote.id).catch((err) =>
          console.error("[quotes] distributeLead error:", err)
        );
      }
      return NextResponse.json({
        success: true,
        prospectId,
        quoteId: quote.id,
        verificationRequired: false,
        emailSent,
        smsSent,
      });
    }
```

Note: the "normal" branch (OTP verification required) does NOT call `distributeLead` directly — `distributeLead` runs later when the client confirms their OTP on `/verifier-demande/[id]`. That flow needs a guard too.

- [ ] Read `src/app/api/quotes/verify-phone/route.ts` in full to locate the existing `distributeLead(...)` call.
- [ ] Read `src/app/api/quotes/verify-email/route.ts` in full likewise.
- [ ] In each file, identify two things:
  - The variable name holding the quote request id (likely `quoteId` or `quote.id`)
  - The existing `await distributeLead(<that variable>)` call

- [ ] In each of the two files, replace the existing `distributeLead(...)` call with this guarded version (substitute `<quoteIdVar>` with the actual variable name found in the file):

```ts
      // Don't distribute a lead held by fraud detection. A flagged lead
      // in 'review_pending' needs admin approval before movers see it,
      // even after the client verifies OTP.
      const { data: currentLead } = await supabase
        .from("quote_requests")
        .select("status")
        .eq("id", <quoteIdVar>)
        .single();
      if ((currentLead as { status?: string } | null)?.status !== "review_pending") {
        await distributeLead(<quoteIdVar>).catch((err) =>
          console.error("[verify-phone] distributeLead error:", err)
        );
      }
```

For `verify-email/route.ts`, change the log prefix to `[verify-email]`. Keep every other line around the call intact (success response, error handling, etc.).

If either file does NOT currently call `distributeLead`, then distribution is not triggered on that verification route and no change is needed in that file — just document this in the commit message.

### Step 2.2: Add admin stats count for pendingLeadReviews

- [ ] Open `src/app/api/admin/stats/moderation/route.ts`
- [ ] Replace the file contents with:

```ts
import { NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Lightweight counts endpoint for admin-side moderation badges.
 * Intentionally public-readable: the numbers themselves reveal no PII
 * and the admin sidebar polls this without a token round-trip.
 */
export async function GET() {
  const supabase = createUntypedAdminClient();

  const [{ count: pendingPhotos }, { count: pendingLeadReviews }] = await Promise.all([
    supabase
      .from("company_photos")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "review_pending"),
  ]);

  return NextResponse.json({
    pendingPhotos: pendingPhotos ?? 0,
    pendingLeadReviews: pendingLeadReviews ?? 0,
  });
}
```

### Step 2.3: Add approve_review / reject_review actions

- [ ] Open `src/app/api/admin/leads/route.ts`
- [ ] Find the existing `if (body.action === "retry_distribution") { ... }` block (around line 137). Insert these two new action branches immediately BEFORE it:

```ts
  if (body.action === "approve_review") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    // Flip the lead back to 'new' and run distribution.
    const { error: upErr } = await supabase
      .from("quote_requests")
      .update({
        status: "new",
        reviewed_at: new Date().toISOString(),
        reviewed_by: "admin",
      })
      .eq("id", id)
      .eq("status", "review_pending");
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    try {
      const result = await distributeLead(id);
      return NextResponse.json({ success: true, matchedMovers: result.matchedMovers });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[admin/leads approve_review] ${id}:`, message);
      return NextResponse.json({ error: `Distribution échouée : ${message}` }, { status: 500 });
    }
  }

  if (body.action === "reject_review") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    const { error } = await supabase
      .from("quote_requests")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: "admin",
      })
      .eq("id", id)
      .eq("status", "review_pending");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

```

### Step 2.4: Verify build + tests pass

- [ ] Run:

```bash
npm run build
npm run test
```

Expected: both pass. Unit tests from Task 1 should still be green (no regression).

### Step 2.5: Commit + push + deploy Layer 2

- [ ] Run:

```bash
cd /c/Users/FX507/Downloads/demenagement24
git add src/app/api/quotes/route.ts src/app/api/quotes/verify-phone/route.ts src/app/api/quotes/verify-email/route.ts src/app/api/admin/leads/route.ts src/app/api/admin/stats/moderation/route.ts
git commit -m "$(cat <<'EOF'
feat(fraud): integrate scoring into quote submission + admin review API

POST /api/quotes now runs scoreLead() after inserting the draft lead;
if score >= 50, the lead is marked status='review_pending' with no
distribution. OTP still fires (email + SMS) so the client's verification
remains independent of fraud flagging. Response is identical in both
branches to stay silent to the client.

verify-phone and verify-email now guard against calling distributeLead
on a lead still in review_pending — fraud hold survives OTP success,
only admin can lift it.

/api/admin/stats/moderation adds a pendingLeadReviews count for the
upcoming sidebar badge. /api/admin/leads adds approve_review (flips
status=new + calls distributeLead) and reject_review (status=rejected)
actions, both with reviewed_at/by audit fields.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_ScEfzxa5vgqh7w84HVr0VHO77k20/lQzqg9gaSp"
```

---

## Task 3: Layer 3 — Admin UI + Step 4 honeypot

### Step 3.1: Sidebar badge for pendingLeadReviews

- [ ] Open `src/app/admin/layout.tsx`
- [ ] Find the `useState` line for `pendingPhotos` (around line 55):

**Before:**
```tsx
  const [pendingPhotos, setPendingPhotos] = useState(0);
```

**After:**
```tsx
  const [pendingPhotos, setPendingPhotos] = useState(0);
  const [pendingLeadReviews, setPendingLeadReviews] = useState(0);
```

- [ ] Find the `.then((d) => { ... setPendingPhotos(d.pendingPhotos || 0) ...})` block inside the polling useEffect. Replace with:

**Before:**
```tsx
        .then((d) => {
          if (!cancelled && d) setPendingPhotos(d.pendingPhotos || 0);
        })
```

**After:**
```tsx
        .then((d) => {
          if (!cancelled && d) {
            setPendingPhotos(d.pendingPhotos || 0);
            setPendingLeadReviews(d.pendingLeadReviews || 0);
          }
        })
```

- [ ] Find the badge computation line in the `ADMIN_NAV.map(...)`:

**Before:**
```tsx
          const badge = item.href === "/admin/companies" && pendingPhotos > 0 ? pendingPhotos : 0;
```

**After:**
```tsx
          let badge = 0;
          let badgeTitle = "";
          if (item.href === "/admin/companies" && pendingPhotos > 0) {
            badge = pendingPhotos;
            badgeTitle = `${badge} photo${badge > 1 ? "s" : ""} à modérer`;
          } else if (item.href === "/admin/leads" && pendingLeadReviews > 0) {
            badge = pendingLeadReviews;
            badgeTitle = `${badge} lead${badge > 1 ? "s" : ""} à vérifier`;
          }
```

- [ ] In the JSX just below, update the badge element to use `badgeTitle`:

**Before:**
```tsx
              {badge > 0 && (
                <span
                  className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow-sm ring-2 ring-red-500/30 animate-pulse"
                  title={`${badge} photo${badge > 1 ? "s" : ""} à modérer`}
                >
                  {badge}
                </span>
              )}
```

**After:**
```tsx
              {badge > 0 && (
                <span
                  className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow-sm ring-2 ring-red-500/30 animate-pulse"
                  title={badgeTitle}
                >
                  {badge}
                </span>
              )}
```

### Step 3.2: Leads page — extend Lead interface + statusMap

- [ ] Open `src/app/admin/leads/page.tsx`
- [ ] In the `Lead` interface (around line 23-59), add these two properties before the closing `}`:

```tsx
  fraud_score: number | null;
  fraud_reasons: Array<{ code: string; label: string; weight: number }> | null;
```

- [ ] Below the existing `statusMap` (around line 68-74), add the two new statuses:

**Before:**
```tsx
const statusMap: Record<string, { label: string; color: string }> = {
  new: { label: "Nouveau", color: "bg-blue-50 text-blue-700" },
  active: { label: "Actif", color: "bg-green-50 text-green-700" },
  blocked: { label: "Bloqué", color: "bg-red-50 text-red-700" },
  completed: { label: "Terminé", color: "bg-gray-100 text-gray-600" },
  archived: { label: "Archivé", color: "bg-gray-100 text-gray-500" },
};
```

**After:**
```tsx
const statusMap: Record<string, { label: string; color: string }> = {
  new: { label: "Nouveau", color: "bg-blue-50 text-blue-700" },
  active: { label: "Actif", color: "bg-green-50 text-green-700" },
  blocked: { label: "Bloqué", color: "bg-red-50 text-red-700" },
  completed: { label: "Terminé", color: "bg-gray-100 text-gray-600" },
  archived: { label: "Archivé", color: "bg-gray-100 text-gray-500" },
  review_pending: { label: "À vérifier", color: "bg-orange-50 text-orange-700" },
  rejected: { label: "Rejeté", color: "bg-gray-100 text-gray-500" },
};
```

### Step 3.3: Add approve/reject handlers in leads page

- [ ] In the same file, find the end of the other action handlers (search for `handleDelete` or `handleRetryDistribution` if they exist). Add these two new functions just after the existing handlers (and above the return/JSX):

```tsx
  async function handleApproveReview(id: string) {
    if (!confirm("Approuver ce lead et le distribuer aux déménageurs ?")) return;
    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve_review", id }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Lead approuvé — ${data.matchedMovers ?? 0} déménageur(s) matché(s)`);
      fetchLeads();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur lors de l'approbation");
    }
  }

  async function handleRejectReview(id: string) {
    if (!confirm("Rejeter ce lead ? Il ne sera pas distribué.")) return;
    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject_review", id }),
    });
    if (res.ok) {
      toast.success("Lead rejeté");
      fetchLeads();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Erreur lors du rejet");
    }
  }
```

### Step 3.4: Add status filter + row badge + detail review block

These three UI additions are in `src/app/admin/leads/page.tsx`. The file is long so locate each section by its existing anchor:

- [ ] **Status filter dropdown:** search for the `<select>` containing `<option value="all">Tous</option>`. Add a new option below the existing options:

```tsx
<option value="review_pending">À vérifier</option>
```

- [ ] **Row badge for review_pending:** in the table row rendering, find where the lead status is displayed (look for `statusMap[lead.status]`). Immediately after the status badge, add:

```tsx
{lead.status === "review_pending" && typeof lead.fraud_score === "number" && (
  <span className="ml-1 inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-800">
    🚩 {lead.fraud_score}
  </span>
)}
```

- [ ] **Detail panel review block:** in the detail view (probably a side drawer or inline panel when `selectedLead` is set), find the top of the detail content. Add this block at the top of the detail JSX, inside a conditional:

```tsx
{selectedLead.status === "review_pending" && (
  <div className="mb-4 rounded-lg border-2 border-orange-300 bg-orange-50 p-4">
    <h3 className="flex items-center gap-2 text-sm font-bold text-orange-900">
      🚩 Lead en attente de vérification — Score {selectedLead.fraud_score ?? 0}
    </h3>
    {Array.isArray(selectedLead.fraud_reasons) && selectedLead.fraud_reasons.length > 0 && (
      <ul className="mt-2 space-y-1 text-xs text-orange-800">
        {selectedLead.fraud_reasons.map((r) => (
          <li key={r.code}>• {r.label} <span className="opacity-60">({r.weight})</span></li>
        ))}
      </ul>
    )}
    <div className="mt-3 flex gap-2">
      <button
        onClick={() => handleApproveReview(selectedLead.id)}
        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
      >
        ✓ Approuver et distribuer
      </button>
      <button
        onClick={() => handleRejectReview(selectedLead.id)}
        className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
      >
        ✗ Rejeter
      </button>
    </div>
  </div>
)}
```

### Step 3.5: Step 4 Contact form honeypot

- [ ] Open `src/components/quote-funnel/Step4Contact.tsx`
- [ ] Find the `step4Schema` Zod object (around line 18). Add a `__nickname` optional field to the schema:

**Before:**
```ts
const step4Schema = z.object({
  salutation: z.enum(["M.", "Mme"], {
    message: "Veuillez sélectionner une civilité",
  }),
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z
    .string()
    .regex(
      /^(?:(?:\+33|0033|0)\s?[1-9])(?:[\s.-]?\d{2}){4}$/,
      "Numéro de téléphone français invalide (ex: 06 12 34 56 78)"
    ),
  email: z.string().email("Adresse email invalide"),
  acceptCgu: z.literal(true, {
    message: "Vous devez accepter les conditions générales d'utilisation",
  }),
});
```

**After:**
```ts
const step4Schema = z.object({
  salutation: z.enum(["M.", "Mme"], {
    message: "Veuillez sélectionner une civilité",
  }),
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z
    .string()
    .regex(
      /^(?:(?:\+33|0033|0)\s?[1-9])(?:[\s.-]?\d{2}){4}$/,
      "Numéro de téléphone français invalide (ex: 06 12 34 56 78)"
    ),
  email: z.string().email("Adresse email invalide"),
  acceptCgu: z.literal(true, {
    message: "Vous devez accepter les conditions générales d'utilisation",
  }),
  __nickname: z.string().optional(),
});
```

- [ ] In the `defaultValues` of `useForm` (around line 67-74), add `__nickname: ""`:

**Before:**
```tsx
    defaultValues: {
      salutation: defaultValues?.salutation,
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      acceptCgu: defaultValues?.acceptCgu ?? (false as unknown as true),
    },
```

**After:**
```tsx
    defaultValues: {
      salutation: defaultValues?.salutation,
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      acceptCgu: defaultValues?.acceptCgu ?? (false as unknown as true),
      __nickname: "",
    },
```

- [ ] Find the `<form onSubmit={handleSubmit(onNext)} ...>` opening tag. Immediately after the form opening tag, insert the hidden honeypot input:

```tsx
        {/* Honeypot — bots that auto-fill every field will trip this. Hidden from humans. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0, pointerEvents: "none" }}
          {...register("__nickname")}
        />
```

- [ ] Update the outer `QuoteFormData` type in `src/app/(public)/devis/page.tsx` to pass the honeypot through. Find the `QuoteFormData` interface (around line 21). Add at the bottom (before the closing `}`):

```tsx
  __nickname?: string;
```

- [ ] In the same file, find `handleStep4` (around line 98-170). Find the fetch call to `/api/quotes`. In the JSON body, add the honeypot field:

**Before:**
```tsx
          body: JSON.stringify({
            category: completeData.category,
            moveType: completeData.moveType,
            ...
            notes: completeData.notes,
          }),
```

**After:**
```tsx
          body: JSON.stringify({
            category: completeData.category,
            moveType: completeData.moveType,
            ...
            notes: completeData.notes,
            __nickname: completeData.__nickname,
          }),
```

Find the exact insertion point: directly after the existing `notes: completeData.notes,` line, add `__nickname: completeData.__nickname,`.

### Step 3.6: Verify build + tests

- [ ] Run:

```bash
npm run build
npm run test
```

Expected: both pass.

### Step 3.7: Commit + push + deploy Layer 3

- [ ] Run:

```bash
cd /c/Users/FX507/Downloads/demenagement24
git add src/app/admin/layout.tsx src/app/admin/leads/page.tsx src/components/quote-funnel/Step4Contact.tsx "src/app/(public)/devis/page.tsx"
git commit -m "$(cat <<'EOF'
feat(fraud): admin UI for leads to verify + honeypot on quote form

Sidebar "Leads" entry gets a pulsing red badge whenever
pendingLeadReviews > 0 (same visual as photo moderation).

/admin/leads gains:
  - "À vérifier" filter option
  - Orange 🚩 badge on rows whose status is review_pending
  - Detail panel top block listing score, triggered detectors, and
    Approuver / Rejeter buttons wired to the new admin API actions

Step4Contact.tsx gains an absolutely-positioned off-screen honeypot
input registered as __nickname. tabIndex=-1, aria-hidden, pointer-
events:none — invisible to users and assistive tech but present for
bots that fill every field. The value is threaded through
QuoteFormData → POST /api/quotes body → fraud-detection honeypot check.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_ScEfzxa5vgqh7w84HVr0VHO77k20/lQzqg9gaSp"
```

---

## Task 4: Validation

After deploy (wait ~2 min), on `https://deme-iota.vercel.app`:

### Step 4.1: Happy path — clean lead

- [ ] Open incognito browser
- [ ] Go through `/devis` with real-looking info: legitimate email (gmail/outlook), real French phone, real city + postal matching, normal notes
- [ ] Submit
- [ ] Admin `/admin/leads` — new lead appears with `fraud_score: 0`, status `Nouveau`, no 🚩 badge
- [ ] Movers receive the distribution (check `quote_distributions` count = 6 or the matched count)

### Step 4.2: Disposable email → held

- [ ] `/devis` with `user@yopmail.com`
- [ ] Submit → client sees normal success
- [ ] Admin `/admin/leads`:
  - Sidebar "Leads" badge shows 1 (red pulsing)
  - Filter to "À vérifier" → the lead is there
  - Row shows 🚩 50
  - Detail panel top block: "Email jetable (50)"
  - Click Approuver → lead becomes `Nouveau`, distributions created
  - (Repeat on a second flagged lead) Click Rejeter → lead becomes `Rejeté`, no distributions

### Step 4.3: Honeypot trips 100

- [ ] Using devtools, inspect `/devis` step 4, find the hidden `__nickname` input, paste a value ("bot-fill")
- [ ] Submit
- [ ] Admin: lead flagged with score 100 → `honeypot_filled`

### Step 4.4: Duplicate phone 7d

- [ ] Submit lead A with phone `06 12 34 56 78`
- [ ] Wait 30 s, submit lead B with the same phone (different email)
- [ ] Admin: lead B flagged `dup_phone_7d` (40). If combined with another signal ≥ 10, lead B is review_pending; otherwise it's just annotated with score but still distributed (score < 50).

### Step 4.5: Silent to client

- [ ] Compare the response JSON and HTTP status between a clean and a flagged submission — should be indistinguishable (same shape, same 200).

### Step 4.6: Admin reject does not re-distribute

- [ ] Reject a review_pending lead → status becomes `Rejeté`
- [ ] Check `quote_distributions` table for that lead id → count remains 0

### Step 4.7: Fraud-detection failure is non-blocking

- [ ] Temporarily break the code (in dev only, do NOT deploy): make `scoreLead` throw. Submit a lead.
- [ ] It should still succeed with status `new` (the try/catch logs but doesn't block).
- [ ] Revert the break.

---

## Self-review

- [ ] All 3 commits pushed to `origin/master`
- [ ] 3 Vercel deploys triggered
- [ ] Unit tests still pass (14 original + ~20 new fraud-detection cases = 34 total)
- [ ] Clean lead end-to-end works (Task 4.1)
- [ ] Flagged lead end-to-end works (Task 4.2)
- [ ] Silent detection verified (Task 4.5)

## Rollback

Each layer is independently revertible:
- Layer 3 revert → UI gone, but API + detector still flag. Admin can use DB-level queries to approve.
- Layer 2 revert → detector exists but unused; no lead gets flagged. Existing review_pending leads stay parked (need manual DB update or re-deploy of Layer 2 + UI).
- Layer 1 revert → fraud_score / fraud_reasons columns remain (non-destructive). Code references them only in later layers.

Soft emergency switch (add if needed): env var `LEAD_FRAUD_DETECTION_ENABLED=false` at the top of `scoreLead()` to short-circuit to `{score: 0, reasons: []}`.

## Done

After all Task 4 checkboxes pass, upstream anti-fraud is live: bad leads don't reach movers without admin eyes on them, and clean leads sail through as always.
