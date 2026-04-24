# Mover Onboarding Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5-item activation checklist at the top of `/apercu` that replaces the existing KYC amber banner and disappears once the mover has completed KYC, logo, description, zones, and first paid lead.

**Architecture:** Pure helper `computeOnboarding()` in `src/lib/onboarding.ts` derives the checklist payload from company + lead + region counts. The existing `GET /api/dashboard/overview` route runs two added count queries, calls the helper, and appends an `onboarding` field to its response. A presentational client component `OnboardingChecklist` reads that payload from the `/apercu` page and renders the card (or nothing, if complete). The amber KYC banner on `/apercu` is removed — its role is absorbed by the checklist's first item.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (via `createUntypedAdminClient`), Tailwind CSS, shadcn Card primitives, `framer-motion` for mount animations, Vitest for unit tests, `lucide-react` for icons.

**Spec:** `docs/superpowers/specs/2026-04-24-mover-onboarding-checklist-design.md`

---

## File structure

| File | Role |
|---|---|
| `src/lib/onboarding.ts` | **New.** Pure `computeOnboarding(input)` helper + `OnboardingData`/`OnboardingItem`/`OnboardingInput` types. Zero Supabase imports. |
| `src/lib/onboarding.test.ts` | **New.** Vitest unit tests for the pure helper. |
| `src/app/api/dashboard/overview/route.ts` | **Modify.** Add two count queries (`company_regions`, `company_radius`), call `computeOnboarding`, return `onboarding` in the JSON response. |
| `src/components/dashboard/OnboardingChecklist.tsx` | **New.** Presentational client component. Props: `{ onboarding: OnboardingData }`. Renders nothing when `complete === true`. |
| `src/app/(dashboard)/apercu/page.tsx` | **Modify.** Extend `DashboardData` with `onboarding?: OnboardingData`. Render `<OnboardingChecklist />` below the greeting. Remove the amber KYC banner block. |

---

## Task 1: Pure helper + tests

**Files:**
- Create: `src/lib/onboarding.ts`
- Create: `src/lib/onboarding.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/onboarding.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeOnboarding } from "./onboarding";

const EMPTY = {
  company: { kyc_status: null, logo_url: null, description: null },
  unlockedLeads: 0,
  regionCount: 0,
  radiusCount: 0,
};

describe("computeOnboarding", () => {
  it("returns all items false when nothing is filled", () => {
    const out = computeOnboarding(EMPTY);
    expect(out.complete).toBe(false);
    expect(out.completedCount).toBe(0);
    expect(out.items.kyc.done).toBe(false);
    expect(out.items.logo.done).toBe(false);
    expect(out.items.description.done).toBe(false);
    expect(out.items.regions.done).toBe(false);
    expect(out.items.firstLead.done).toBe(false);
  });

  it("marks kyc done only when status is 'approved'", () => {
    for (const status of ["pending", "in_review", "rejected", "", null]) {
      const out = computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, kyc_status: status as string | null } });
      expect(out.items.kyc.done).toBe(false);
    }
    const ok = computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, kyc_status: "approved" } });
    expect(ok.items.kyc.done).toBe(true);
    expect(ok.completedCount).toBe(1);
  });

  it("marks logo done when logo_url is a non-empty string", () => {
    const out = computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, logo_url: "https://example.com/logo.png" } });
    expect(out.items.logo.done).toBe(true);
  });

  it("marks description done only at >= 50 trimmed characters", () => {
    const short = "x".repeat(49);
    const exactly = "x".repeat(50);
    const withWhitespace = "  " + "x".repeat(50) + "  ";
    expect(computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, description: short } }).items.description.done).toBe(false);
    expect(computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, description: exactly } }).items.description.done).toBe(true);
    expect(computeOnboarding({ ...EMPTY, company: { ...EMPTY.company, description: withWhitespace } }).items.description.done).toBe(true);
  });

  it("marks regions done on OR of regionCount and radiusCount", () => {
    expect(computeOnboarding({ ...EMPTY, regionCount: 1 }).items.regions.done).toBe(true);
    expect(computeOnboarding({ ...EMPTY, radiusCount: 1 }).items.regions.done).toBe(true);
    expect(computeOnboarding({ ...EMPTY, regionCount: 3, radiusCount: 2 }).items.regions.done).toBe(true);
    expect(computeOnboarding({ ...EMPTY, regionCount: 0, radiusCount: 0 }).items.regions.done).toBe(false);
  });

  it("marks firstLead done when unlockedLeads > 0", () => {
    expect(computeOnboarding({ ...EMPTY, unlockedLeads: 1 }).items.firstLead.done).toBe(true);
    expect(computeOnboarding({ ...EMPTY, unlockedLeads: 0 }).items.firstLead.done).toBe(false);
  });

  it("reports complete = true only when all 5 items are done", () => {
    const out = computeOnboarding({
      company: { kyc_status: "approved", logo_url: "x", description: "x".repeat(50) },
      unlockedLeads: 1,
      regionCount: 1,
      radiusCount: 0,
    });
    expect(out.complete).toBe(true);
    expect(out.completedCount).toBe(5);
  });

  it("exposes stable hrefs and labels on every item", () => {
    const out = computeOnboarding(EMPTY);
    expect(out.items.kyc.href).toBe("/verification-identite");
    expect(out.items.logo.href).toBe("/profil-entreprise");
    expect(out.items.description.href).toBe("/profil-entreprise");
    expect(out.items.regions.href).toBe("/configurations");
    expect(out.items.firstLead.href).toBe("/demandes-de-devis");
    expect(out.items.kyc.label).toBe("Vérifier mon identité");
    expect(out.items.logo.label).toBe("Ajouter un logo");
    expect(out.items.description.label).toBe("Rédiger une description");
    expect(out.items.regions.label).toBe("Définir mes zones d'intervention");
    expect(out.items.firstLead.label).toBe("Acheter mon premier lead");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/onboarding.test.ts`
Expected: FAIL with `Cannot find module './onboarding'` (or similar import error from vitest).

- [ ] **Step 3: Implement `computeOnboarding`**

Create `src/lib/onboarding.ts`:

```ts
export interface OnboardingItem {
  done: boolean;
  href: string;
  label: string;
}

export interface OnboardingData {
  complete: boolean;
  completedCount: number;
  items: {
    kyc: OnboardingItem;
    logo: OnboardingItem;
    description: OnboardingItem;
    regions: OnboardingItem;
    firstLead: OnboardingItem;
  };
}

export interface OnboardingInput {
  company: {
    kyc_status?: string | null;
    logo_url?: string | null;
    description?: string | null;
  };
  unlockedLeads: number;
  regionCount: number;
  radiusCount: number;
}

const DESCRIPTION_MIN_CHARS = 50;

export function computeOnboarding(input: OnboardingInput): OnboardingData {
  const items: OnboardingData["items"] = {
    kyc: {
      done: input.company.kyc_status === "approved",
      href: "/verification-identite",
      label: "Vérifier mon identité",
    },
    logo: {
      done: typeof input.company.logo_url === "string" && input.company.logo_url.length > 0,
      href: "/profil-entreprise",
      label: "Ajouter un logo",
    },
    description: {
      done: (input.company.description ?? "").trim().length >= DESCRIPTION_MIN_CHARS,
      href: "/profil-entreprise",
      label: "Rédiger une description",
    },
    regions: {
      done: input.regionCount > 0 || input.radiusCount > 0,
      href: "/configurations",
      label: "Définir mes zones d'intervention",
    },
    firstLead: {
      done: input.unlockedLeads > 0,
      href: "/demandes-de-devis",
      label: "Acheter mon premier lead",
    },
  };

  const completedCount = Object.values(items).filter((i) => i.done).length;
  return {
    complete: completedCount === 5,
    completedCount,
    items,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/onboarding.test.ts`
Expected: PASS — 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/onboarding.ts src/lib/onboarding.test.ts
git commit -m "feat(onboarding): pure computeOnboarding helper + unit tests"
```

---

## Task 2: Extend `/api/dashboard/overview` to return the onboarding payload

**Files:**
- Modify: `src/app/api/dashboard/overview/route.ts`

- [ ] **Step 1: Add the import**

At the top of `src/app/api/dashboard/overview/route.ts`, add this import near the other `@/lib/*` imports (around line 6):

```ts
import { computeOnboarding } from "@/lib/onboarding";
```

- [ ] **Step 2: Add the two count queries + compute `onboarding`**

Locate the `unlockedLeads` variable (currently computed at roughly line 149 as `const unlockedLeads = leads.filter((l) => l.status === "unlocked").length;`). **Immediately after** that line, insert:

```ts
  // Onboarding checklist — 2 parallel count queries (regions + radius) then derive
  // the 5-item payload from the company/leads already loaded above.
  const [{ count: regionCount }, { count: radiusCount }] = await Promise.all([
    admin
      .from("company_regions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
    admin
      .from("company_radius")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
  ]);

  const onboarding = computeOnboarding({
    company: {
      kyc_status: company.kyc_status as string | null | undefined,
      logo_url: company.logo_url as string | null | undefined,
      description: company.description as string | null | undefined,
    },
    unlockedLeads,
    regionCount: regionCount ?? 0,
    radiusCount: radiusCount ?? 0,
  });
```

- [ ] **Step 3: Add `onboarding` to the JSON response**

At the end of the route, locate the `return NextResponse.json({ ... })` call (currently around line 279). Add `onboarding,` as a new field inside the returned object, after `wallet`:

```ts
  return NextResponse.json({
    profile,
    company,
    leads,
    stats: {
      totalLeads,
      unlockedLeads,
      pendingLeads,
      conversionRate,
      revenue,
      revenue30d,
      leads30d,
      unlocked30d,
      avgLeadPriceCents,
      topCities,
      activity30d,
    },
    notifications: notifications || [],
    wallet: {
      enabled: !!settings.refundsEnabled,
      balanceCents: walletBalanceCents,
    },
    onboarding,
    spentCents,
    pendingCents,
  });
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (The route already has pre-existing warnings unrelated to this change; verify your edits didn't add any.)

- [ ] **Step 5: Smoke-test the route manually**

Run: `npm run dev`
Open `http://localhost:3000/apercu` in a browser while logged in as a mover.
Open DevTools → Network → click the `overview` request → Response tab.
Expected: the JSON body now contains an `onboarding` object with `complete`, `completedCount`, and `items.{kyc,logo,description,regions,firstLead}` each having `done`, `href`, `label`.

Stop the dev server (Ctrl-C) before committing.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/dashboard/overview/route.ts
git commit -m "feat(api/dashboard/overview): return onboarding checklist payload"
```

---

## Task 3: Create the `OnboardingChecklist` component

**Files:**
- Create: `src/components/dashboard/OnboardingChecklist.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/dashboard/OnboardingChecklist.tsx`:

```tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ArrowRight, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OnboardingData, OnboardingItem } from "@/lib/onboarding";

const ITEM_ORDER: Array<keyof OnboardingData["items"]> = [
  "kyc",
  "logo",
  "description",
  "regions",
  "firstLead",
];

export function OnboardingChecklist({ onboarding }: { onboarding: OnboardingData }) {
  if (onboarding.complete) return null;

  const { completedCount, items } = onboarding;
  const percent = Math.round((completedCount / 5) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-green-200 bg-green-50/40">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-green)]/10">
                <Target className="h-5 w-5 text-[var(--brand-green-dark)]" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  Finalisez votre profil
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Complétez ces étapes pour commencer à recevoir des leads qualifiés.
                </p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-bold text-[var(--brand-green-dark)]">
              {completedCount}/5
            </span>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--brand-green)] transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>

          <ul className="mt-4 divide-y divide-border/60">
            {ITEM_ORDER.map((key) => (
              <ChecklistRow key={key} item={items[key]} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ChecklistRow({ item }: { item: OnboardingItem }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {item.done ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--brand-green)]" />
        ) : (
          <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
        )}
        <span
          className={cn(
            "truncate text-sm",
            item.done
              ? "text-muted-foreground line-through"
              : "font-medium text-foreground"
          )}
        >
          {item.label}
        </span>
      </div>
      {item.done ? (
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
          ✓ Fait
        </span>
      ) : (
        <Link
          href={item.href}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[var(--brand-green)] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[var(--brand-green-dark)]"
        >
          Faire
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </li>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/OnboardingChecklist.tsx
git commit -m "feat(dashboard): OnboardingChecklist presentational card"
```

---

## Task 4: Wire the checklist into `/apercu` + remove the KYC banner

**Files:**
- Modify: `src/app/(dashboard)/apercu/page.tsx`

- [ ] **Step 1: Extend the `DashboardData` interface**

In `src/app/(dashboard)/apercu/page.tsx`, add the import near the other `@/*` imports at the top:

```tsx
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import type { OnboardingData } from "@/lib/onboarding";
```

Find the `DashboardData` interface (starts around line 37) and add `onboarding` as an optional field:

```ts
interface DashboardData {
  company: Record<string, unknown>;
  leads: Lead[];
  stats: {
    totalLeads: number;
    unlockedLeads: number;
    conversionRate: number;
    revenue: number;
    revenue30d: number;
    leads30d: number;
    unlocked30d: number;
    avgLeadPriceCents: number;
    topCities: TopCity[];
    activity30d: ActivityPoint[];
  };
  notifications: Record<string, unknown>[];
  wallet?: {
    enabled: boolean;
    balanceCents: number;
  };
  onboarding?: OnboardingData;
}
```

- [ ] **Step 2: Remove the KYC amber banner**

In the same file, delete the entire KYC banner block (currently roughly lines 167 to 192 inside the JSX). That block starts with:

```tsx
      {kycStatus !== "approved" && (
        <motion.div
```

and ends with the matching `</motion.div>` + `)}`. Delete the whole block including both lines.

- [ ] **Step 3: Render `OnboardingChecklist` below the greeting**

Still in the same file, locate the greeting `motion.div` that contains `<h2>Aperçu</h2>` (around line 160). Immediately after that closing `</motion.div>`, add:

```tsx
      {data.onboarding && <OnboardingChecklist onboarding={data.onboarding} />}
```

- [ ] **Step 4: Remove the now-unused `kycStatus` local (if no other reference remains)**

Search the file for remaining uses of `kycStatus`. There is still one inside the "Statut du compte" sidebar card (around the old line 466). **Keep** that block as-is — the sidebar card is a separate concern and still needs `kycStatus`. Therefore **do not** remove the `const kycStatus = company.kyc_status as string;` declaration.

Confirm by running: `grep -n "kycStatus" src/app/\(dashboard\)/apercu/page.tsx`
Expected: still at least one match (the sidebar card). If zero matches, the const becomes dead code and should be removed; otherwise leave it.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Manual browser test**

Run: `npm run dev`

Test matrix — for each scenario, refresh `/apercu` and verify:

| Scenario | Expected |
|---|---|
| Fresh mover: `kyc_status='pending'`, no logo, no description, no regions, no unlocked leads | Card shown with 0/5, progress bar empty, 5 "Faire →" buttons. No amber KYC banner. |
| Mover with KYC approved only | Card shown with 1/5, KYC row shows "✓ Fait", 4 "Faire →" buttons remain. |
| Mover with 4 items done, no unlocked lead | Card shown with 4/5, only "Acheter mon premier lead" has a "Faire →" button pointing to `/demandes-de-devis`. |
| Mover with all 5 done | **No card rendered.** Layout starts directly with stats grid. |
| Click "Faire →" on each unchecked item | Navigates to the correct page: `/verification-identite`, `/profil-entreprise`, `/profil-entreprise`, `/configurations`, `/demandes-de-devis`. |

If you don't have DB rows matching each scenario, use the Supabase Studio SQL editor to temporarily flip fields on your own company row and refresh, then revert at the end.

Stop the dev server (Ctrl-C) before committing.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/apercu/page.tsx
git commit -m "feat(apercu): render onboarding checklist, drop standalone KYC banner"
```

---

## Task 5: Final verification + push

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all tests pass, including the new 7 `computeOnboarding` tests.

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: zero new warnings/errors in the 5 touched files.

- [ ] **Step 4: Review commit history**

Run: `git log --oneline origin/master..HEAD`
Expected: 4 commits, in order — helper, route, component, wire-up.

- [ ] **Step 5: Push**

```bash
git push
```
