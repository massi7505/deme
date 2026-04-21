# Mobile UX pass on /devis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix iOS input auto-zoom, kill horizontal scroll, and align the `/devis` 4-step quote funnel with modern mobile UX standards (16px inputs, 44px touch targets, correct mobile keyboards, browser autofill, sticky action bar).

**Architecture:** Three independent layers, one commit each. Layer 1 is a global change to the `<Input>` primitive + a one-line CSS safety net — auto-benefits every form in the app. Layer 2 adds declarative HTML attributes (`inputMode`, `autoComplete`, `enterKeyHint`) to each field of the 4 steps. Layer 3 wraps the action buttons in each step with mobile-only sticky positioning that respects the iPhone safe-area.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, React Hook Form + Zod, Framer Motion. No new deps.

**Spec:** `docs/superpowers/specs/2026-04-21-devis-mobile-ux-design.md`

---

## File Structure

All changes are front-end only. No migrations, no API changes.

**Modified (6 files):**
- `src/components/ui/input.tsx` — mobile height + font-size
- `src/app/globals.css` — `html, body { overflow-x: clip }` safety net
- `src/components/quote-funnel/Step1MoveType.tsx` — volume input attributes + sticky button
- `src/components/quote-funnel/Step2Addresses.tsx` — address/city/postal attributes + sticky buttons
- `src/components/quote-funnel/Step3Details.tsx` — textarea attribute + sticky buttons
- `src/components/quote-funnel/Step4Contact.tsx` — name/phone/email attributes + sticky buttons

**No files created. No files deleted.**

---

## Task 1: Global Input primitive + horizontal-scroll safety net

**Files:**
- Modify: `src/components/ui/input.tsx:13` (the className string)
- Modify: `src/app/globals.css:42-47` (add `overflow-x: clip` inside the existing `body` selector area)

### Step 1.1: Update Input className

- [ ] Open `src/components/ui/input.tsx`
- [ ] Replace the className block inside `cn(...)` (currently line 13):

**Before:**
```tsx
"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
```

**After:**
```tsx
"flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
```

Only two changes: `h-10` → `h-11 md:h-10`, and `text-sm` → `text-base md:text-sm`. The rest of the class string is untouched.

### Step 1.2: Add global overflow-x safety net

- [ ] Open `src/app/globals.css`
- [ ] Inside the existing `@layer base` block, add a new rule after the `body { ... }` block (around line 47):

```css
  html,
  body {
    overflow-x: clip;
  }
```

Final result — the `@layer base` block now ends like this:

```css
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  html,
  body {
    overflow-x: clip;
  }
}
```

**Why `clip` not `hidden`:** `overflow: hidden` creates a new scroll container which breaks `position: sticky` and `position: fixed` on descendants. `overflow: clip` just clips without creating a container — safer.

### Step 1.3: Verify build passes

- [ ] Run: `npm run build`
- [ ] Expected: compiles successfully, no new warnings or errors
- [ ] If the build fails, read the error carefully — the change is 3 lines, the error will point directly at the offender

### Step 1.4: Manual visual smoke on 3 non-`/devis` pages

Open the dev server (`npm run dev`), Chrome DevTools device emulation (iPhone 14 Pro @ 390×844), and check:

- [ ] `/connexion` — email + password inputs look proportionate (slightly taller), no layout break around buttons below them
- [ ] `/inscription/etape-1` — form fields look OK
- [ ] `/profil-entreprise` — inputs in the company profile look OK

If any layout feels visibly broken (button wrapping weirdly, input overflowing a card), note the page but **don't fix it in this task** — create a follow-up issue. The 16px / 44px is the correct standard; any breakage elsewhere is a pre-existing fragile layout.

### Step 1.5: Commit Layer 1

- [ ] Run:

```bash
git add src/components/ui/input.tsx src/app/globals.css
git commit -m "$(cat <<'EOF'
feat(mobile): Input primitive 16px/44px on mobile + overflow-x clip

Kills iOS Safari auto-zoom-on-focus by raising input font-size from
text-sm (14px) to text-base (16px) below md breakpoint. Also bumps
height to 44px per Apple HIG / Google Material touch-target minimum.
Desktop (≥768px) strictly unchanged via md: guards.

Adds html,body { overflow-x: clip } as a safety net for any descendant
that briefly overflows horizontally (Framer Motion step transitions
use x: 30 / x: -30 which can trigger a visible horizontal scrollbar
mid-transition on narrow viewports).
EOF
)"
```

- [ ] Push + trigger Vercel deploy:

```bash
git push
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_ScEfzxa5vgqh7w84HVr0VHO77k20/lQzqg9gaSp"
```

---

## Task 2: HTML attributes per step

All four Step components get `inputMode`, `autoComplete`, `enterKeyHint` where relevant. Purely declarative — no new JS, no new state, no CSS changes.

**Files:**
- Modify: `src/components/quote-funnel/Step1MoveType.tsx:295-304` (volume input)
- Modify: `src/components/quote-funnel/Step2Addresses.tsx` (inside `AddressSection`, multiple fields)
- Modify: `src/components/quote-funnel/Step3Details.tsx:170-175` (notes textarea)
- Modify: `src/components/quote-funnel/Step4Contact.tsx` (firstName, lastName, phone, email)

### Step 2.1: Step 1 — volume input

- [ ] Open `src/components/quote-funnel/Step1MoveType.tsx`
- [ ] Find the `<Input id="volumeM3" .../>` around line 295. Replace the whole `<Input>` block with:

```tsx
                  <Input
                    id="volumeM3"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="ex: 25"
                    {...register("volumeM3", {
                      setValueAs: (v) =>
                        v === "" || v === null || v === undefined ? undefined : Number(v),
                    })}
                  />
```

(Single additions: `inputMode="numeric"`.)

### Step 2.2: Step 2 — address block inputs

- [ ] Open `src/components/quote-funnel/Step2Addresses.tsx`

Two inputs to update inside `AddressSection`:

- [ ] **Apartment number** (around line 145) — add `autoComplete="address-line2"`:

```tsx
      <div className="space-y-2">
        <Label htmlFor={aptKey}>N° appartement / bâtiment / complément <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
        <Input
          id={aptKey}
          placeholder="ex: Apt 4B, Bât C, Escalier 2..."
          autoComplete="address-line2"
          {...register(aptKey)}
        />
      </div>
```

- [ ] **City** (around line 155) — add `autoComplete={\`${prefix === "from" ? "address-level2" : "shipping address-level2"}\`}`. To keep it simple since this isn't a checkout, use plain `autoComplete="address-level2"` on both:

```tsx
        <div className="space-y-2">
          <Label htmlFor={cityKey}>Ville</Label>
          <Input
            id={cityKey}
            placeholder="Rempli automatiquement"
            autoComplete="address-level2"
            {...register(cityKey)}
            className="bg-gray-50"
          />
          {errors[cityKey] && (
            <p className="text-sm text-red-600">{errors[cityKey]?.message}</p>
          )}
        </div>
```

- [ ] **Postal code** (around line 168) — add `inputMode="numeric"` and `autoComplete="postal-code"`:

```tsx
        <div className="space-y-2">
          <Label htmlFor={postalKey}>Code postal</Label>
          <Input
            id={postalKey}
            placeholder="Rempli automatiquement"
            maxLength={5}
            inputMode="numeric"
            autoComplete="postal-code"
            {...register(postalKey)}
            className="bg-gray-50"
          />
          {errors[postalKey] && (
            <p className="text-sm text-red-600">{errors[postalKey]?.message}</p>
          )}
        </div>
```

**Note on the main address field:** it's an `<AddressAutocomplete>`, not a plain `<Input>`. It has its own Mapbox-backed behavior. Do **not** add `autoComplete` there — it would conflict with the dropdown suggestions from Mapbox and may cause browser autofill to paste into it on top of a suggestion. Leave it alone.

### Step 2.3: Step 3 — notes textarea

- [ ] Open `src/components/quote-funnel/Step3Details.tsx`
- [ ] Find the `<Textarea id="notes" .../>` around line 170. Add `enterKeyHint="done"`:

```tsx
          <Textarea
            id="notes"
            placeholder="Décrivez tout détail important pour votre déménagement..."
            rows={4}
            enterKeyHint="done"
            {...register("notes")}
          />
```

### Step 2.4: Step 4 — contact inputs

- [ ] Open `src/components/quote-funnel/Step4Contact.tsx`

Four inputs to update:

- [ ] **First name** (around line 121) — add `autoComplete="given-name"`:

```tsx
              <Input
                id="firstName"
                placeholder="Prénom"
                autoComplete="given-name"
                {...register("firstName")}
              />
```

- [ ] **Last name** (around line 132) — add `autoComplete="family-name"`:

```tsx
              <Input
                id="lastName"
                placeholder="Nom"
                autoComplete="family-name"
                {...register("lastName")}
              />
```

- [ ] **Phone** (around line 147) — add `inputMode="tel"` and `autoComplete="tel"`:

```tsx
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="06 12 34 56 78"
                {...register("phone")}
              />
```

- [ ] **Email** (around line 159) — add `inputMode="email"`, `autoComplete="email"`, `enterKeyHint="done"`:

```tsx
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                enterKeyHint="done"
                placeholder="votre@email.com"
                {...register("email")}
              />
```

### Step 2.5: Verify build passes

- [ ] Run: `npm run build`
- [ ] Expected: compiles successfully

### Step 2.6: Commit Layer 2

- [ ] Run:

```bash
git add src/components/quote-funnel/Step1MoveType.tsx src/components/quote-funnel/Step2Addresses.tsx src/components/quote-funnel/Step3Details.tsx src/components/quote-funnel/Step4Contact.tsx
git commit -m "$(cat <<'EOF'
feat(devis): mobile keyboard hints + browser autofill across all steps

Adds the missing HTML attributes that let mobile OSes pick the right
keyboard (numeric, tel, email) and let browsers propose saved values:

  Step 1 volume:      inputMode=numeric
  Step 2 apt number:  autoComplete=address-line2
  Step 2 city:        autoComplete=address-level2
  Step 2 postal:      inputMode=numeric + autoComplete=postal-code
  Step 3 notes:       enterKeyHint=done
  Step 4 first name:  autoComplete=given-name
  Step 4 last name:   autoComplete=family-name
  Step 4 phone:       inputMode=tel + autoComplete=tel
  Step 4 email:       inputMode=email + autoComplete=email + enterKeyHint=done

AddressAutocomplete (Mapbox-backed) is intentionally not touched —
adding autoComplete there conflicts with the suggestion dropdown.
EOF
)"
```

- [ ] Push + trigger deploy:

```bash
git push
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_ScEfzxa5vgqh7w84HVr0VHO77k20/lQzqg9gaSp"
```

---

## Task 3: Sticky action bar on mobile

Wrap the Retour/Suivant button row in each Step with mobile-sticky classes. Pattern is identical for Steps 2, 3, 4; Step 1 has only a "Suivant" (no "Retour").

**Files:**
- Modify: `src/components/quote-funnel/Step1MoveType.tsx:383-387` (button container)
- Modify: `src/components/quote-funnel/Step2Addresses.tsx:305-313` (button container)
- Modify: `src/components/quote-funnel/Step3Details.tsx:181-189` (button container)
- Modify: `src/components/quote-funnel/Step4Contact.tsx:201-227` (button container — longer because of loading state)

### Step 3.1: Step 1 — sticky single-button bar

- [ ] Open `src/components/quote-funnel/Step1MoveType.tsx`
- [ ] Find the button container at the end of the form (around line 383):

**Before:**
```tsx
        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="px-8" disabled={!category || !moveType || !roomCount}>
            Suivant
          </Button>
        </div>
```

**After:**
```tsx
        <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:mx-0 md:border-t-0 md:bg-transparent md:px-0 md:pb-0 md:pt-4 md:backdrop-blur-none">
          <Button type="submit" size="lg" className="px-8" disabled={!category || !moveType || !roomCount}>
            Suivant
          </Button>
        </div>
```

**What the classes do, in order:**
- `sticky bottom-0` — sticks to viewport bottom on mobile
- `-mx-4 px-4` — pulls the bar edge-to-edge on mobile (negates the parent `px-4`) then re-adds internal padding
- `flex justify-end gap-2` — single button on the right (was `justify-end pt-4` before)
- `border-t` — subtle top border so the bar visually separates from form content scrolling behind
- `bg-background/95 backdrop-blur` — semi-opaque glass effect; content stays readable underneath
- `pb-[max(1rem,env(safe-area-inset-bottom))]` — at least 1rem, or the iPhone home-bar safe area, whichever is bigger
- `pt-3` — compact top padding on mobile
- `md:static md:mx-0 md:border-t-0 md:bg-transparent md:px-0 md:pb-0 md:pt-4 md:backdrop-blur-none` — on desktop, revert to `static`, original spacing, no border, no blur → **pixel-identical to current desktop layout**

### Step 3.2: Step 2 — sticky two-button bar

- [ ] Open `src/components/quote-funnel/Step2Addresses.tsx`
- [ ] Find the button container (around line 305):

**Before:**
```tsx
        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            Retour
          </Button>
          <Button type="submit" size="lg" className="px-8">
            Suivant
          </Button>
        </div>
```

**After:**
```tsx
        {/* Navigation */}
        <div className="sticky bottom-0 -mx-4 flex justify-between gap-2 border-t bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:mx-0 md:border-t-0 md:bg-transparent md:px-0 md:pb-0 md:pt-4 md:backdrop-blur-none">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            Retour
          </Button>
          <Button type="submit" size="lg" className="px-8">
            Suivant
          </Button>
        </div>
```

(Same class swap as Step 1 but keeping `justify-between`.)

### Step 3.3: Step 3 — sticky two-button bar

- [ ] Open `src/components/quote-funnel/Step3Details.tsx`
- [ ] Find the button container (around line 181):

**Before:**
```tsx
        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            Retour
          </Button>
          <Button type="submit" size="lg" className="px-8">
            Suivant
          </Button>
        </div>
```

**After:**
```tsx
        {/* Navigation */}
        <div className="sticky bottom-0 -mx-4 flex justify-between gap-2 border-t bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:mx-0 md:border-t-0 md:bg-transparent md:px-0 md:pb-0 md:pt-4 md:backdrop-blur-none">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            Retour
          </Button>
          <Button type="submit" size="lg" className="px-8">
            Suivant
          </Button>
        </div>
```

### Step 3.4: Step 4 — sticky two-button bar (with submit loading state)

- [ ] Open `src/components/quote-funnel/Step4Contact.tsx`
- [ ] Find the button container (around line 201):

**Before:**
```tsx
        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            Retour
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-green-600 to-green-700 px-8 text-white shadow-lg shadow-green-200 hover:from-green-700 hover:to-green-800"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Envoi en cours...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Envoyer ma demande
              </span>
            )}
          </Button>
        </div>
```

**After:** only the outer `<div>` className changes — button contents are identical:
```tsx
        {/* Navigation */}
        <div className="sticky bottom-0 -mx-4 flex justify-between gap-2 border-t bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:mx-0 md:border-t-0 md:bg-transparent md:px-0 md:pb-0 md:pt-4 md:backdrop-blur-none">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            Retour
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-green-600 to-green-700 px-8 text-white shadow-lg shadow-green-200 hover:from-green-700 hover:to-green-800"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Envoi en cours...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Envoyer ma demande
              </span>
            )}
          </Button>
        </div>
```

### Step 3.5: Verify build passes

- [ ] Run: `npm run build`
- [ ] Expected: compiles successfully

### Step 3.6: Commit Layer 3

- [ ] Run:

```bash
git add src/components/quote-funnel/Step1MoveType.tsx src/components/quote-funnel/Step2Addresses.tsx src/components/quote-funnel/Step3Details.tsx src/components/quote-funnel/Step4Contact.tsx
git commit -m "$(cat <<'EOF'
feat(devis): sticky action bar on mobile, respecting iPhone safe-area

Each Step's Retour/Suivant button row now sticks to the viewport bottom
on mobile. The bar has:
  - backdrop-blur + bg-background/95 so form content stays legible
    when scrolling behind
  - pb-[max(1rem,env(safe-area-inset-bottom))] so the buttons clear
    the iPhone home bar
  - full md: reset so desktop is byte-for-byte identical to before

Fixes the UX pain where, on long forms (Step 2 = 14 fields), users had
to scroll the full form before seeing the Suivant button.
EOF
)"
```

- [ ] Push + trigger deploy:

```bash
git push
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_ScEfzxa5vgqh7w84HVr0VHO77k20/lQzqg9gaSp"
```

---

## Task 4: Validation on the deployed preview

Wait ~2 minutes for the Vercel deploy to finish, then run these checks on `https://deme-iota.vercel.app/devis`.

### Step 4.1: Chrome DevTools emulation — iPhone 14 Pro (390×844)

- [ ] Open `/devis` with Responsive mode set to iPhone 14 Pro
- [ ] Focus every input across Steps 1→2→3→4. **None should cause a zoom.**
- [ ] Scroll through Step 2 entirely. **No horizontal scrollbar should ever appear.**
- [ ] On Step 2, the "Suivant" button should always be reachable without scrolling to the bottom.
- [ ] Visually confirm: bottom safe-area padding visible (buttons clear the bottom edge of the device frame).

### Step 4.2: Chrome DevTools emulation — Galaxy S20 (360×800)

- [ ] Switch emulation to Galaxy S20 or a 360px custom width
- [ ] Repeat the Step 1→4 walkthrough
- [ ] **No horizontal scroll, buttons still sticky.**

### Step 4.3: Desktop non-regression (1440px)

- [ ] Resize the viewport to 1440px (or exit mobile emulation)
- [ ] Open `/devis`
- [ ] **Action bar is NOT sticky on desktop** — it sits at the bottom of each step as before
- [ ] Inputs have the same height/font as before (40px / 14px)
- [ ] `/connexion` and `/admin/companies` still look normal

### Step 4.4: Real-device spot check (user's iPhone)

Ask the user (Massi) to open `https://deme-iota.vercel.app/devis` on his iPhone and confirm:

- [ ] No zoom when focusing any field
- [ ] Postal code field → numeric pad appears
- [ ] Phone field → tel pad appears
- [ ] Email field → email keyboard
- [ ] Browser offers saved contact info on first-name / email / phone

### Step 4.5: If a regression is found

- [ ] Isolate which of the 3 commits introduced it with `git log --oneline -6`
- [ ] Revert that specific commit: `git revert <sha>`
- [ ] Re-deploy
- [ ] Each layer was designed to be independently reversible — only revert the offending one, not the whole plan

---

## Self-review checklist (for the implementer)

Before closing out the plan, confirm:

- [ ] All 3 commits pushed to `origin/master`
- [ ] 3 Vercel deploys triggered
- [ ] DevTools mobile emulation passes all checks in Task 4.1 and 4.2
- [ ] Desktop unchanged per Task 4.3
- [ ] User has validated real-device behavior per Task 4.4

## Done

After all boxes are checked, the mobile UX of `/devis` is brought to modern standards with zero functional regressions on desktop or on other pages.
