# Mover onboarding checklist — design spec

**Date:** 2026-04-24
**Status:** design approved, ready for implementation plan
**Owner:** product
**Estimated effort:** ~1h

## Context & motivation

New movers land on `/apercu` with a half-empty dashboard: stats are all zero, there's an amber KYC banner if their identity isn't verified, and the rest of the layout works fine but doesn't tell them *what to do next*. The activation path today is: (1) KYC, (2) upload a logo, (3) write a description, (4) pick at least one intervention zone, (5) buy their first lead. Each step lives on a different page, and nothing guides them through the sequence.

Goal: **double new-mover activation rate** (= % of sign-ups who buy their first lead) by replacing the unstructured first-login experience with an explicit interactive checklist.

Scope: the mover-side dashboard page `/apercu` only. No changes to admin, client-facing, or other mover pages.

## Product decisions (validated with user)

| # | Decision | Choice |
|---|---|---|
| 1 | When to display the checklist | **A** — always visible at the top of `/apercu` while incomplete, disappears forever once 5/5 |
| 2 | What "first lead" means | **B** — only counted as done when the mover has *purchased* (unlocked) a lead, not merely received one |
| 3 | Detection rules for the 4 other items | approved as proposed (see Data section) |
| 4 | Relationship with the existing KYC banner | **A** — remove the amber KYC banner; the checklist item #1 replaces it |
| 5 | Behavior on clicking an unchecked item | **A** — each item is an actionable link that routes to the page where the mover can complete the step |
| visual | Visual layout | **Approach 1** — always-expanded card with vertical list of 5 items, progress bar at top, `Faire →` CTA per unchecked item |

## Architecture

### Data source — `/api/dashboard/overview`

The existing `GET /api/dashboard/overview` route (called on mount by `/apercu`) is extended to return a new top-level field `onboarding`:

```ts
onboarding: {
  complete: boolean,         // true iff all 5 items are done
  completedCount: number,    // 0..5
  items: {
    kyc:         { done: boolean, href: "/verification-identite", label: "Vérifier mon identité" },
    logo:        { done: boolean, href: "/profil-entreprise",     label: "Ajouter un logo" },
    description: { done: boolean, href: "/profil-entreprise",     label: "Rédiger une description" },
    regions:     { done: boolean, href: "/configurations",        label: "Définir mes zones d'intervention" },
    firstLead:   { done: boolean, href: "/demandes-de-devis",     label: "Acheter mon premier lead" },
  }
}
```

### Detection rules

| Item | `done === true` when |
|---|---|
| `kyc` | `company.kyc_status === 'approved'` |
| `logo` | `!!company.logo_url` (non-empty string) |
| `description` | `(company.description ?? '').trim().length >= 50` |
| `regions` | At least one row in `company_regions` OR `company_radius` for this company |
| `firstLead` | `unlockedLeads > 0` (already computed by the route for `stats`) |

The route adds two parallel `count: 'exact', head: true` queries on `company_regions` and `company_radius`. Net added cost: ~5ms. No other existing field is changed; the addition is purely additive (back-compat).

### Pure helper — `src/lib/onboarding.ts`

A pure function computes the `onboarding` payload from its inputs. This is extracted so it can be unit-tested in isolation without touching Supabase:

```ts
export function computeOnboarding(input: {
  company: { kyc_status?: string | null; logo_url?: string | null; description?: string | null };
  unlockedLeads: number;
  regionCount: number;
  radiusCount: number;
}): OnboardingData
```

`/api/dashboard/overview` calls this helper after fetching the counts.

### UI component — `src/components/dashboard/OnboardingChecklist.tsx`

A presentational client component that receives `onboarding: OnboardingData` as a prop. Does no fetching. Renders nothing when `onboarding.complete === true`.

Layout:

```
┌─────────────────────────────────────────────────────────┐
│  🎯 Finalisez votre profil                      3/5     │
│  Complétez ces étapes pour commencer à recevoir         │
│  des leads qualifiés.                                   │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░  60%                          │
├─────────────────────────────────────────────────────────┤
│  ✓  Vérifier mon identité              [FAIT]          │
│  ✓  Ajouter un logo                    [FAIT]          │
│  ✓  Rédiger une description            [FAIT]          │
│  ○  Définir mes zones d'intervention   [Faire →]       │
│  ○  Acheter mon premier lead           [Faire →]       │
└─────────────────────────────────────────────────────────┘
```

Specifics:
- **Header** — title "Finalisez votre profil" + right-aligned `N/5` counter. One-line subtitle. Brand-green progress bar (`--brand-green`), full width.
- **Items** — 5 stacked rows, fixed display order (kyc → logo → description → regions → firstLead). No dynamic reordering when an item is completed (avoids visual jump). Each row:
  - Left icon: filled green ✓ if done, empty grey ○ otherwise
  - Label: black if pending, grey with strikethrough if done
  - Right CTA: `Faire →` link (brand-green) if pending, grey `✓ Fait` badge if done
- **Animation** — fade-in + slide-from-top on mount via `framer-motion` (matches existing `/apercu` stat cards pattern). No special animation when an item transitions to done — the ✓ is simply present on the next page mount.
- **Responsive** — mobile (<640px): card stays full-width, items wrap their label on two lines if needed, CTA remains on the right. Subtitle may be truncated/hidden on narrow viewports.

### Integration in `/apercu`

In `src/app/(dashboard)/apercu/page.tsx`:
- Import `OnboardingChecklist`.
- Render it just below the greeting (line ~166), passing `data.onboarding`.
- The component self-hides when complete — no conditional in the page.
- **Remove** the amber KYC banner block (current lines ~167–192). The checklist KYC item replaces it.

## Edge cases & behavior

- **Regression after completion** — if a mover later deletes their logo, their `description` drops below 50 chars, or they delete all regions, the corresponding item returns to `done: false` and the checklist reappears. This is **intentional**: the profile is no longer complete, and we surface that.
- **Suspended account** (`account_status = 'suspended'`) — the checklist still renders normally. Account-status messaging is a separate concern (out of scope for this spec); the checklist is a profile-completeness view, not an account-status view.
- **No "I've seen 5/5" flag needed** — the 5 items themselves are the source of truth. KYC `approved` does not regress. Logo/description/regions can regress but in that case showing the checklist again is correct.
- **No confetti / toast at 5/5** — completion of the 5th step (first lead purchased) already triggers the Mollie payment success flow (email, receipt). Adding a celebration animation on the checklist would be redundant and noisy.

## Files touched

| File | Change |
|---|---|
| `src/app/api/dashboard/overview/route.ts` | Add `onboarding` field to the response, compute it via `computeOnboarding` after two added count queries |
| `src/lib/onboarding.ts` | **New** — pure `computeOnboarding(input)` helper + `OnboardingData` type |
| `src/components/dashboard/OnboardingChecklist.tsx` | **New** — presentational card component |
| `src/app/(dashboard)/apercu/page.tsx` | Import + render the checklist; remove the amber KYC banner (lines ~167–192) |
| `src/lib/onboarding.test.ts` | **New** — unit tests for `computeOnboarding`, colocated with the helper per existing vitest convention (see `src/lib/utils.test.ts`, `src/lib/sirene.test.ts`) |

## Testing

Vitest unit tests on `computeOnboarding`:

1. All inputs "empty" → all 5 items `done: false`, `complete: false`, `completedCount: 0`.
2. Each of the 5 items individually flipped to `done: true` → only that item reports done, `complete: false`, `completedCount: 1`.
3. Description of exactly 49 chars → `description.done: false`; exactly 50 chars → `done: true` (boundary).
4. `regions.done` = true when only `regionCount > 0`, only `radiusCount > 0`, or both (logical OR).
5. All 5 done → `complete: true`, `completedCount: 5`.

No E2E test. The UI component is a thin data→DOM mapper with no logic; covering it via unit tests on the pure helper is sufficient.

## Non-goals (explicit YAGNI)

- No persistent "checklist dismissed by user" flag. Once done, the checklist disappears on its own; it never needs to be manually hidden before that.
- No admin-side analytics of "which step movers get stuck on". That is valuable but belongs to a separate dashboard feature.
- No server-side redirect if the mover is incomplete. They can still navigate the full dashboard.
- No email nudge triggered by incomplete checklist. Separate spec if we want that.
- No A/B test scaffolding. If we want to measure activation lift, we compare cohorts by sign-up date (before/after this ships).

## Success criteria

Qualitative: a brand-new mover landing on `/apercu` for the first time sees exactly 5 clear next steps with 1-click navigation to each.

Quantitative (to verify post-ship, after ≥2 weeks of data): **% of movers purchasing their first lead within 7 days of sign-up should measurably increase** vs. the pre-ship cohort. Baseline to be pulled from `quote_distributions` + `profiles.created_at` at deploy time.
