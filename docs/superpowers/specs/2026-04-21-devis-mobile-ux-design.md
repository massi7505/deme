# Design — Mobile UX pass on `/devis` quote funnel

**Date:** 2026-04-21
**Scope:** `/devis` (4-step quote wizard) — mobile experience
**Goal:** eliminate iOS input auto-zoom, kill horizontal scroll, bring the funnel to modern mobile UX standards (touch targets, keyboard hints, autofill, sticky actions).

## Problem

The quote funnel at `/devis` is the primary lead-acquisition surface of the business. On mobile:

1. **iOS Safari auto-zooms into every text input.** The `<Input>` primitive uses `text-sm` (14px). iOS zooms on focus whenever the focused element's font-size is below 16px. This jars the user on every field change and introduces a visible "pop" that degrades perceived quality.
2. **Risk of horizontal scroll on small viewports.** Fixed `grid-cols-N` layouts in the step components may overflow on 320–360px screens, forcing left/right scrolling.
3. **Missing mobile input affordances.** No `inputMode` (so numeric fields show the alphabetical keyboard), no `autoComplete` (browser can't offer saved values), no `enterKeyHint` (Enter key says "Entrée" instead of "Suivant").
4. **Buried primary action.** The "Suivant" button sits at the bottom of long forms (Step 2 has 14 fields). The user has to scroll past the entire form to find it.
5. **Touch targets below platform standards.** `Input` has `h-10` (40px). Apple HIG and Google Material both recommend ≥ 44px.

## Out of scope

- Desktop layout (strictly unchanged — every change is guarded by a `md:` breakpoint reverting to current behaviour)
- Business logic, validation (Zod schemas, submission flow, OTP verification)
- Visual restyling (colors, typography, icons)
- The OTP verification page `/verifier-demande/[id]` — will benefit automatically from the global Input fix, but is not explicitly audited here
- Non-`/devis` pages — likewise, they benefit from the global Input fix but are not explicitly redesigned

## Architecture — three layers of change

### Layer 1 — Global Input primitive (impacts every form in the app)

**File:** `src/components/ui/input.tsx`

Raise the font-size to 16px and the height to 44px on mobile; keep current values on desktop.

- `h-10` → `h-11 md:h-10`
- `text-sm` → `text-base md:text-sm`

This eliminates the iOS auto-zoom root cause everywhere, not just in `/devis`. Low risk because the change is constrained to mobile breakpoints; desktop is byte-for-byte identical.

**Non-regression surface to smoke-test after deploy** (mobile devtools, 375px width):
- `/connexion`
- `/inscription/etape-1` through `/inscription/etape-4`
- `/profil-entreprise`
- `/admin/companies` (admin uses same `<Input>`)

### Layer 2 — HTML attributes per step (impacts `/devis` only)

Purely declarative — no new JS, no new state. Each step's inputs get the three attributes that tell the browser how to assist:

**Step 1 (`Step1MoveType`)**
- Volume m³: `inputMode="numeric"`

**Step 2 (`Step2Addresses`)** — for both "from" and "to" blocks:
| Field | `inputMode` | `autoComplete` | `enterKeyHint` |
|---|---|---|---|
| Address | (default) | `street-address` | `next` |
| Apartment number | (default) | `off` | `next` |
| City | (default) | `address-level2` | `next` |
| Postal code | `numeric` | `postal-code` | `next` |

**Step 4 (`Step4Contact`)**
| Field | `inputMode` | `autoComplete` | `enterKeyHint` |
|---|---|---|---|
| First name | (default) | `given-name` | `next` |
| Last name | (default) | `family-name` | `next` |
| Phone | `tel` | `tel` | `next` |
| Email | `email` | `email` | `done` |

Step 3 (`Step3Details`) is mostly checkboxes and a textarea (`notes`) — the textarea gets `enterKeyHint="done"`.

### Layer 3 — Sticky action bar (impacts `/devis` only, mobile only)

**Where:** the `<div>` containing the "Retour" / "Suivant" buttons at the bottom of each `Step*.tsx` form.

**Pattern:**
```tsx
<div className="
  sticky bottom-0 -mx-4 px-4 pb-[env(safe-area-inset-bottom)] pt-3
  bg-background/95 backdrop-blur border-t
  md:static md:mx-0 md:border-t-0 md:bg-transparent md:backdrop-blur-none md:pt-0
  flex justify-end gap-2
">
  {/* existing buttons */}
</div>
```

Key properties:
- `sticky` not `fixed` — stays in flow, never covers the field the user is editing
- `env(safe-area-inset-bottom)` — respects the iPhone home bar
- `bg-background/95 backdrop-blur` — content stays readable when it scrolls behind
- `md:static …` — desktop is strictly unchanged

**Companion change:** the form container (likely the `<Card>` or `<form>` wrapper inside each step) receives `pb-24 md:pb-0` so the final field is never hidden behind the sticky bar at the end of scroll.

**Footer caveat:** if any step has explanatory text below the buttons (e.g. the CGU notice in Step 4), that text must sit *above* the sticky button container, not inside it — otherwise it becomes sticky too. To verify during implementation.

## Horizontal scroll audit

Performed during implementation (reading each `Step*.tsx` in full). Expected offenders, based on current file inspection:

- **Step 1:** `grid grid-cols-3` for categories, `grid-cols-2`+ for move types, 4–5-column grid for room options. Narrowest devices (320px) may overflow. Fix by adjusting to `grid-cols-2 sm:grid-cols-3` (or `grid-cols-1 sm:grid-cols-2` where text is long).
- **Step 2:** horizontal `flex` rows combining Label + Select + Checkbox for floor/elevator. Fix: `flex-col sm:flex-row`.
- **Step 4:** likely `grid-cols-3` for salutation + first-name + last-name. Fix: `grid-cols-2 sm:grid-cols-3` with salutation spanning 2 on mobile.

**Safety net added globally** in `src/app/globals.css`:
```css
html, body { overflow-x: clip; }
```
Using `clip` rather than `hidden` avoids creating a new scroll container (which would break `position: sticky` / `fixed` on descendants and is slightly worse for performance). This is a net even if one overflow is missed.

## What does NOT change

- Validation schemas (Zod)
- Submission flow (`/api/quotes`, OTP verification, routing to `/verifier-demande/[id]`)
- Visual design tokens (colors in `globals.css`, font families, icon set)
- Any desktop layout (guarded by `md:` breakpoints throughout)
- Accessibility — explicitly not using `user-scalable=no` in the viewport meta; the 16px font fix is the a11y-correct way to stop iOS zoom

## Testing / validation plan

1. **Local build:** `npm run build` + `npm run lint` must pass with zero new warnings.
2. **Devtools mobile emulation** on the deployed preview (`https://deme-iota.vercel.app/devis`):
   - iPhone SE (375 × 667) — modern baseline
   - iPhone 14 Pro (390 × 844) — current mainstream
   - Galaxy S20 (360 × 800) — Android baseline
3. **Acceptance checks** on each emulated device:
   - Focus every input in every step → no zoom on iOS emulation
   - Scroll through every step → no horizontal scrollbar, no left/right drag
   - Verify "Suivant" button is reachable without scrolling on Step 2
   - Verify safe-area padding visible on iPhone 14 Pro emulation (bottom bar area)
4. **Keyboard/autofill spot checks** on real device (user's iPhone):
   - Postal code field → numeric pad appears
   - Phone field → tel pad appears
   - Email field → email keyboard
   - Browser offers saved contact info on first/last-name/email/phone
5. **Desktop non-regression:** open `/devis` + `/connexion` + `/admin/companies` at 1440px → visual parity with current production.

## Rollback plan

Each layer is independent:
- Layer 1 rolled back by reverting the 2-line change in `input.tsx`
- Layer 2 rolled back by removing HTML attributes — no functional impact
- Layer 3 rolled back by removing the sticky classes from each step's button container

No database migrations, no API contract changes — all changes are front-end only.

## Deliverables

1. Modified files:
   - `src/components/ui/input.tsx`
   - `src/app/globals.css`
   - `src/components/quote-funnel/Step1MoveType.tsx`
   - `src/components/quote-funnel/Step2Addresses.tsx`
   - `src/components/quote-funnel/Step3Details.tsx`
   - `src/components/quote-funnel/Step4Contact.tsx`
2. One commit per layer, so rollback is granular if needed.
3. Vercel deploy triggered after each commit via the Deploy Hook.
