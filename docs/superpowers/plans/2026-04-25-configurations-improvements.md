# /configurations Pro-Grade Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `/configurations` from a buggy client-side config page into a pro-grade Server Component with impact preview, bulk region picker, conflict detection, mobile-responsive UI, and a real coverage map.

**Architecture:** Server Component (`page.tsx`) loads `company`, `regions`, `radiusRules`, `impactCount`, and `conflicts` in parallel via `createUntypedAdminClient()`. Renders a Client subcomponent (`ConfigurationsView.tsx`) that owns modal state and delete actions, with `router.refresh()` for post-mutation data refetch. The existing `RegionEditModal` and `CoverageMap` stay client-side but receive richer props.

**Tech Stack:** Next.js 14 App Router · Supabase admin client · Tailwind + shadcn/ui · Mapbox GL · React Hook Form (existing in modal) · lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-04-25-configurations-improvements-design.md`

**Test approach:** This codebase has no UI test infrastructure (`lib/fraud-detection.test.ts` is the only test file). Each task verifies via `npm run lint`, `npm run build`, and a documented manual check. Manual UI verification happens on the Vercel preview after each commit pushes.

---

## File Structure

**Created:**
- `src/components/dashboard/ConfigurationsView.tsx` — Client subcomponent owning modal state, delete actions, table-vs-card responsive switching
- `src/components/dashboard/ConflictBanner.tsx` — Inline component rendering a yellow warning card listing detected config issues
- `src/lib/config-conflicts.ts` — Pure conflict-detection logic (testable, used server-side from `page.tsx`)

**Modified:**
- `src/app/(dashboard)/configurations/page.tsx` — Full rewrite as Server Component
- `src/components/dashboard/CoverageMap.tsx` — Add popup-on-marker-click, auto-fit zoom, color-by-category
- `src/components/dashboard/RegionEditModal.tsx` — Add bulk-region-picker section above the alphabetical list

**Unchanged:**
- `src/app/api/dashboard/regions/route.ts` — All actions already exist
- `src/lib/utils.ts` — Already exposes `REGIONS` const + `DEPARTMENTS` const
- Database schema — No migration

---

## Commit 1 — Foundation (Tasks 1-6)

Goal: Page becomes a Server Component, all bugs fixed, radius rules visible.

### Task 1: Create ConfigurationsView client shell

**Files:**
- Create: `src/components/dashboard/ConfigurationsView.tsx`

- [ ] **Step 1: Write the new client component scaffold**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Settings2, Pencil, Target, Trash2 } from "lucide-react";
import { CoverageMap } from "@/components/dashboard/CoverageMap";
import { RegionEditModal } from "@/components/dashboard/RegionEditModal";
import { DEPARTMENTS } from "@/lib/utils";
import toast from "react-hot-toast";

interface Region {
  id: string;
  department_code: string;
  department_name: string;
  categories: string[];
}

interface RadiusRule {
  id: string;
  departure_city: string;
  lat: number;
  lng: number;
  radius_km: number;
  move_types: string[];
}

interface Props {
  regions: Region[];
  radiusRules: RadiusRule[];
  impactCount: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  national: "bg-green-100 text-green-800 border-green-200",
  entreprise: "bg-blue-100 text-blue-800 border-blue-200",
  international: "bg-purple-100 text-purple-800 border-purple-200",
};

export function ConfigurationsView({ regions, radiusRules, impactCount }: Props) {
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const uniqueCategories = Array.from(
    new Set([
      ...regions.flatMap((r) => r.categories ?? []),
      ...radiusRules.flatMap((r) => r.move_types ?? []),
    ])
  );

  async function deleteRadius(id: string, label: string) {
    if (!confirm(`Supprimer la zone autour de ${label} ?`)) return;
    const res = await fetch("/api/dashboard/regions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_radius", id }),
    });
    if (res.ok) {
      toast.success("Zone supprimée");
      router.refresh();
    } else {
      toast.error("Erreur de suppression");
    }
  }

  const mapMarkers = radiusRules.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    label: r.departure_city,
    radiusKm: r.radius_km,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Régions ciblées et catégories</h2>
        <p className="text-sm text-muted-foreground">
          Configurez vos zones d&apos;intervention et les types de déménagements que vous acceptez.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{regions.length}</span> département{regions.length !== 1 ? "s" : ""}
          {" + "}
          <span className="font-semibold text-foreground">{radiusRules.length}</span> zone{radiusRules.length !== 1 ? "s" : ""} par rayon
          {" · "}
          <span className="font-semibold text-foreground">~{impactCount}</span> lead{impactCount !== 1 ? "s" : ""} reçu{impactCount !== 1 ? "s" : ""} sur 30 jours
        </p>
      </div>

      {/* Régions par département */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-[var(--brand-green)]" /> Départements ciblés
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditModalOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        </CardHeader>
        <CardContent>
          {regions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun département configuré</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Département</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Catégories</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regions.map((region) => (
                    <TableRow key={region.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50">
                            <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
                          </div>
                          <span className="text-sm font-medium">
                            {DEPARTMENTS[region.department_code] || region.department_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{region.department_code}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {region.categories.map((cat) => (
                            <Badge key={cat} variant="outline" className={`text-[11px] capitalize ${CATEGORY_COLORS[cat] ?? ""}`}>
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zones par rayon */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-[var(--brand-green)]" /> Zones par rayon
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditModalOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        </CardHeader>
        <CardContent>
          {radiusRules.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune zone par rayon configurée</p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ville de départ</TableHead>
                    <TableHead>Rayon</TableHead>
                    <TableHead>Catégories</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {radiusRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50">
                            <Target className="h-4 w-4 text-[var(--brand-green)]" />
                          </div>
                          <span className="text-sm font-medium">{rule.departure_city}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm tabular-nums">{rule.radius_km} km</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {rule.move_types.map((cat) => (
                            <Badge key={cat} variant="outline" className={`text-[11px] capitalize ${CATEGORY_COLORS[cat] ?? ""}`}>
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                          onClick={() => deleteRadius(rule.id, rule.departure_city)}
                          aria-label={`Supprimer la zone ${rule.departure_city}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coverage map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-[var(--brand-green)]" /> Carte de couverture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CoverageMap markers={mapMarkers} />
        </CardContent>
      </Card>

      {/* Region edit modal (existing component) */}
      <RegionEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        regions={regions}
        radiusRules={radiusRules}
        onSaved={() => {
          setEditModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify lint + typecheck**

```bash
npm run lint
```

Expected: no errors related to `ConfigurationsView.tsx` (warnings about unused imports OK, will be cleaned in next tasks).

- [ ] **Step 3: Verify build compiles**

```bash
npm run build
```

Expected: build succeeds. The component isn't referenced yet so no integration error possible.

---

### Task 2: Convert page.tsx to Server Component

**Files:**
- Modify: `src/app/(dashboard)/configurations/page.tsx` (full rewrite)

- [ ] **Step 1: Replace the file content**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { ConfigurationsView } from "@/components/dashboard/ConfigurationsView";

export const dynamic = "force-dynamic";

interface Region {
  id: string;
  department_code: string;
  department_name: string;
  categories: string[];
}

interface RadiusRule {
  id: string;
  departure_city: string;
  lat: number;
  lng: number;
  radius_km: number;
  move_types: string[];
}

export default async function ConfigurationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const admin = createUntypedAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id, city")
    .eq("profile_id", user.id)
    .single();

  if (!company) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Régions ciblées et catégories</h2>
        <p className="text-sm text-muted-foreground">
          Aucune entreprise associée à votre compte. Complétez votre inscription.
        </p>
      </div>
    );
  }

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [regionsRes, radiusRulesRes, impactRes] = await Promise.all([
    admin
      .from("company_regions")
      .select("id, department_code, department_name, categories")
      .eq("company_id", company.id)
      .order("department_code"),
    admin
      .from("company_radius")
      .select("id, departure_city, lat, lng, radius_km, move_types")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
    admin
      .from("quote_distributions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .gte("created_at", since),
  ]);

  const regions = (regionsRes.data || []) as Region[];
  const radiusRules = (radiusRulesRes.data || []) as RadiusRule[];
  const impactCount = impactRes.count ?? 0;

  return (
    <ConfigurationsView
      regions={regions}
      radiusRules={radiusRules}
      impactCount={impactCount}
    />
  );
}
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```

Expected: no errors. Warnings are acceptable.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: build succeeds. The route output should now show `/configurations` as `λ` (server-rendered) instead of `○` (static).

- [ ] **Step 4: Quick sanity dev check (optional)**

If a dev server is running locally:

```bash
# In another shell
npm run dev
# Then open http://localhost:3000/configurations as logged-in mover
```

Expected: page loads, regions and radius rules display, map shows real radius markers (not Paris hardcoded). If no dev env is set up, skip — verification happens on Vercel preview after Commit 1 push.

---

### Task 3: Drop "use client" + framer + unused state — verify page is fully server-driven

This task is a sanity sweep to make sure no leftover client-side data fetching survived from the old `page.tsx`.

**Files:**
- Verify: `src/app/(dashboard)/configurations/page.tsx`

- [ ] **Step 1: Read the new page.tsx and confirm**

Run:

```bash
head -5 "src/app/(dashboard)/configurations/page.tsx"
```

Expected: no `"use client"`, no `useState`, no `useEffect`, no `motion.div`, no `framer-motion` import.

- [ ] **Step 2: Confirm imports of motion are gone in this file**

Run:

```bash
grep -n "framer-motion\|motion\\." "src/app/(dashboard)/configurations/page.tsx" || echo "OK no framer references"
```

Expected: `OK no framer references`.

---

### Task 4: Sanity check — lint clean across modified files

- [ ] **Step 1: Lint the dashboard subtree**

```bash
npx eslint "src/app/(dashboard)/configurations/**/*.{ts,tsx}" "src/components/dashboard/ConfigurationsView.tsx"
```

Expected: zero errors. Warnings about `react-hooks/exhaustive-deps` or unused vars must be fixed inline.

If unused imports remain in `ConfigurationsView.tsx` (e.g., `Settings2`), remove them.

---

### Task 5: Build succeeds end-to-end

- [ ] **Step 1: Full production build**

```bash
npm run build
```

Expected output highlights:
- `Compiled successfully`
- Route table includes `λ /configurations` (lambda — server-rendered) not `○` (static)
- No "Failed to compile" errors

Memory note: per `feedback_build_rules.md`, never edit the build to call `prisma migrate deploy` or skip checks. Just fix any actual errors that appear.

---

### Task 6: Commit + push Commit 1

- [ ] **Step 1: Stage exactly the files for Commit 1**

```bash
git add \
  "src/app/(dashboard)/configurations/page.tsx" \
  "src/components/dashboard/ConfigurationsView.tsx"
git status
```

Expected: only those 2 files staged, nothing else.

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
refactor(configurations): convert to Server Component + fix map bugs

The mover-facing config page (which decides which leads they receive)
had three real bugs and was 100% client-side:

- The Mapbox marker was hardcoded to Paris coords for every mover
  (lat: 48.8566, lng: 2.3522) regardless of their actual address.
- The configured radius_rules were fetched from the API but only
  rendered inside the edit modal, never on the page itself.
- The map showed a single fake marker on Paris with a 30 km radius
  unrelated to any real configured zone.

This commit:
- Converts page.tsx to a Server Component that loads company,
  company_regions, company_radius and a 30-day distribution count
  in parallel via createUntypedAdminClient(). Adds export const
  dynamic = "force-dynamic" so router.refresh() after edits picks
  up the latest data.
- Splits the interactive parts (modal state, delete actions) into
  a new ConfigurationsView.tsx client subcomponent, mirroring the
  RSC-shell-plus-Client-island pattern used recently on /contact,
  /blog/[slug] and /reclamation.
- Renders a new "Zones par rayon" Card with a delete button per
  rule (POST /api/dashboard/regions action: remove_radius, then
  router.refresh()).
- Plots the Coverage map with real markers from radius_rules
  (lat/lng/radius_km/city), fixing the three bugs above.
- Adds an inline stats sentence in the header showing
  "N départements + M zones par rayon · ~K leads reçus sur 30 jours"
  so the mover sees the actual impact of their config.

Drops framer-motion from the page header in passing (consistent
with recent SEO commits removing Framer for LCP).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit created, hash printed.

- [ ] **Step 3: Push**

```bash
git push origin master
```

Expected: push succeeds, Vercel build kicks off.

- [ ] **Step 4: After Vercel deploy is READY, browser verify**

Manual check on https://deme-iota.vercel.app/configurations as a logged-in mover:

1. Page loads in a single SSR pass (view-source shows the full HTML with regions/rayons already populated).
2. "Départements ciblés" Card lists configured regions with their categories.
3. "Zones par rayon" Card lists radius rules; clicking 🗑️ shows a confirm dialog, then the row disappears after `router.refresh()` re-renders.
4. "Carte de couverture" Card shows markers and circles for each radius rule (not Paris hardcoded). Empty if no radius rules configured.
5. Header shows the inline stats sentence with real numbers.

If any of those fail, open an issue task before proceeding to Commit 2.

---

## Commit 2 — Pro features (Tasks 7-10)

Goal: bulk region picker, conflict detection banner, map polish.

### Task 7: Add conflict-detection module

**Files:**
- Create: `src/lib/config-conflicts.ts`

- [ ] **Step 1: Write the module**

```ts
interface RegionLite {
  department_code: string;
  categories: string[];
}

interface RadiusLite {
  departure_city: string;
  move_types: string[];
}

export type ConfigConflict =
  | { type: "empty"; message: string }
  | { type: "empty_category"; message: string };

/**
 * Pure function — detects misconfigurations in a mover's lead-targeting
 * setup. Called server-side from /configurations/page.tsx.
 *
 * V1 ships only the high-confidence rules (no zone, empty categories).
 * The "department × radius redundancy" rule is intentionally skipped:
 * we have lat/lng on radius rules but no reverse geocoding, so we
 * cannot reliably know which department a given lat/lng falls in.
 */
export function detectConflicts(
  regions: RegionLite[],
  radiusRules: RadiusLite[]
): ConfigConflict[] {
  const conflicts: ConfigConflict[] = [];

  if (regions.length === 0 && radiusRules.length === 0) {
    conflicts.push({
      type: "empty",
      message:
        "Aucune zone configurée — vous ne recevrez aucun lead. Ajoutez au moins un département ou une zone par rayon.",
    });
  }

  for (const r of regions) {
    if (!r.categories || r.categories.length === 0) {
      conflicts.push({
        type: "empty_category",
        message: `Le département ${r.department_code} n'a aucune catégorie cochée — il ne reçoit aucun lead.`,
      });
    }
  }

  for (const r of radiusRules) {
    if (!r.move_types || r.move_types.length === 0) {
      conflicts.push({
        type: "empty_category",
        message: `La zone autour de ${r.departure_city} n'a aucune catégorie cochée — elle ne reçoit aucun lead.`,
      });
    }
  }

  return conflicts;
}
```

- [ ] **Step 2: Verify lint**

```bash
npx eslint "src/lib/config-conflicts.ts"
```

Expected: zero errors.

---

### Task 8: Wire conflict detection into page.tsx + render ConflictBanner

**Files:**
- Create: `src/components/dashboard/ConflictBanner.tsx`
- Modify: `src/app/(dashboard)/configurations/page.tsx`
- Modify: `src/components/dashboard/ConfigurationsView.tsx`

- [ ] **Step 1: Create the banner component**

`src/components/dashboard/ConflictBanner.tsx`:

```tsx
import { AlertTriangle } from "lucide-react";
import type { ConfigConflict } from "@/lib/config-conflicts";

export function ConflictBanner({ conflicts }: { conflicts: ConfigConflict[] }) {
  if (conflicts.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-amber-900">
            {conflicts.length === 1
              ? "Un problème détecté dans votre configuration"
              : `${conflicts.length} problèmes détectés dans votre configuration`}
          </p>
          <ul className="list-disc space-y-1 pl-4 text-sm text-amber-800">
            {conflicts.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update page.tsx to detect conflicts and pass to view**

Modify `src/app/(dashboard)/configurations/page.tsx` — add the import, run `detectConflicts`, pass via prop:

Add import at top:

```tsx
import { detectConflicts } from "@/lib/config-conflicts";
```

After the parallel data fetch, before the `return`:

```tsx
const conflicts = detectConflicts(regions, radiusRules);
```

Update the JSX return:

```tsx
return (
  <ConfigurationsView
    regions={regions}
    radiusRules={radiusRules}
    impactCount={impactCount}
    conflicts={conflicts}
  />
);
```

- [ ] **Step 3: Update ConfigurationsView to accept and render conflicts**

Modify `src/components/dashboard/ConfigurationsView.tsx`:

Add import:

```tsx
import type { ConfigConflict } from "@/lib/config-conflicts";
import { ConflictBanner } from "@/components/dashboard/ConflictBanner";
```

Update the `Props` interface:

```tsx
interface Props {
  regions: Region[];
  radiusRules: RadiusRule[];
  impactCount: number;
  conflicts: ConfigConflict[];
}
```

Update the function signature:

```tsx
export function ConfigurationsView({ regions, radiusRules, impactCount, conflicts }: Props) {
```

Insert the banner right after the Header div (before `{/* Régions par département */}`):

```tsx
<ConflictBanner conflicts={conflicts} />
```

- [ ] **Step 4: Verify lint + build**

```bash
npm run lint && npm run build
```

Expected: clean.

---

### Task 9: Map polish — popup, auto-fit, color by category

**Files:**
- Modify: `src/components/dashboard/CoverageMap.tsx`
- Modify: `src/components/dashboard/ConfigurationsView.tsx` (pass `categories` field through)

- [ ] **Step 1: Extend the marker type and pass categories**

In `src/components/dashboard/ConfigurationsView.tsx`, change the `mapMarkers` declaration:

```tsx
const mapMarkers = radiusRules.map((r) => ({
  lat: r.lat,
  lng: r.lng,
  label: r.departure_city,
  radiusKm: r.radius_km,
  categories: r.move_types,
}));
```

- [ ] **Step 2: Update CoverageMap props + behavior**

Replace the contents of `src/components/dashboard/CoverageMap.tsx` with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const DEFAULT_CENTER: [number, number] = [2.3522, 46.6034];
const DEFAULT_ZOOM = 5;

const CATEGORY_FILL: Record<string, { fill: string; line: string }> = {
  national: { fill: "#22c55e", line: "#16a34a" },
  entreprise: { fill: "#3b82f6", line: "#2563eb" },
  international: { fill: "#a855f7", line: "#9333ea" },
};

interface Marker {
  lat: number;
  lng: number;
  label?: string;
  radiusKm?: number;
  categories?: string[];
}

export function CoverageMap({
  markers = [],
  className = "",
}: {
  markers?: Marker[];
  className?: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      setError("Token Mapbox non configuré");
      return;
    }

    if (!mapContainer.current || mapRef.current) return;

    let map: mapboxgl.Map;

    async function initMap() {
      const mapboxgl = (await import("mapbox-gl")).default;
      // @ts-expect-error — CSS import for mapbox styles
      await import("mapbox-gl/dist/mapbox-gl.css").catch(() => {});

      const center: [number, number] =
        markers.length > 0 ? [markers[0].lng, markers[0].lat] : DEFAULT_CENTER;
      const zoom = markers.length > 0 ? 8 : DEFAULT_ZOOM;

      map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center,
        zoom,
        accessToken: MAPBOX_TOKEN!,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", () => {
        setLoaded(true);
        mapRef.current = map;

        const bounds = new mapboxgl.LngLatBounds();

        markers.forEach((m, idx) => {
          const primaryCat = m.categories?.[0] ?? "national";
          const colors = CATEGORY_FILL[primaryCat] ?? CATEGORY_FILL.national;

          // Marker
          const popupHtml = `
            <div style="font-family:system-ui;font-size:12px;line-height:1.4">
              <strong>${m.label ?? "Zone"}</strong>
              ${m.radiusKm ? `<br/>Rayon ${m.radiusKm} km` : ""}
              ${m.categories?.length ? `<br/>Catégories : ${m.categories.join(", ")}` : ""}
            </div>
          `;

          new mapboxgl.Marker({ color: colors.line })
            .setLngLat([m.lng, m.lat])
            .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(popupHtml))
            .addTo(map);

          bounds.extend([m.lng, m.lat]);

          // Radius circle
          if (m.radiusKm) {
            const points = 64;
            const km = m.radiusKm;
            const coords: [number, number][] = [];
            for (let i = 0; i < points; i++) {
              const angle = (i / points) * 2 * Math.PI;
              const dx = km / (111.32 * Math.cos((m.lat * Math.PI) / 180));
              const dy = km / 110.574;
              coords.push([
                m.lng + dx * Math.cos(angle),
                m.lat + dy * Math.sin(angle),
              ]);
              bounds.extend([
                m.lng + dx * Math.cos(angle),
                m.lat + dy * Math.sin(angle),
              ]);
            }
            coords.push(coords[0]);

            const sourceId = `radius-${idx}-${m.lat}-${m.lng}`;
            map.addSource(sourceId, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "Polygon", coordinates: [coords] },
              },
            });

            map.addLayer({
              id: `${sourceId}-fill`,
              type: "fill",
              source: sourceId,
              paint: { "fill-color": colors.fill, "fill-opacity": 0.12 },
            });

            map.addLayer({
              id: `${sourceId}-border`,
              type: "line",
              source: sourceId,
              paint: { "line-color": colors.line, "line-width": 2 },
            });
          }
        });

        // Auto-fit zoom to all markers + circles
        if (markers.length > 1) {
          map.fitBounds(bounds, { padding: 40, maxZoom: 11 });
        } else if (markers.length === 1 && markers[0].radiusKm) {
          map.fitBounds(bounds, { padding: 40, maxZoom: 11 });
        }
      });
    }

    initMap().catch((err) => {
      console.error("Map init error:", err);
      setError("Erreur de chargement de la carte");
    });

    return () => {
      map?.remove();
      mapRef.current = null;
    };
  }, [markers]);

  if (!MAPBOX_TOKEN || error) {
    return (
      <div
        className={`flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-muted/30 ${className}`}
      >
        <div className="text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "Ajoutez NEXT_PUBLIC_MAPBOX_TOKEN dans .env.local"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      )}
      <div ref={mapContainer} className="h-64 w-full" />
    </div>
  );
}
```

- [ ] **Step 3: Verify lint + build**

```bash
npm run lint && npm run build
```

Expected: clean.

---

### Task 10: Bulk region picker in RegionEditModal

**Files:**
- Modify: `src/components/dashboard/RegionEditModal.tsx`

This task adds a bulk-toggle UI block above the alphabetical departments list. Each French region is a button that toggles all its départements at once.

- [ ] **Step 1: Read the current modal to find the right insertion point**

Run:

```bash
grep -n "department_code\|onDepartmentToggle\|REGIONS\|<Dialog" "src/components/dashboard/RegionEditModal.tsx" | head -30
```

Note: the modal manages selected department codes in local state. The bulk picker reads from `REGIONS` const in `@/lib/utils` and toggles a region's departments by toggling the local set.

- [ ] **Step 2: Add the bulk picker section**

Inside `RegionEditModal.tsx`, add the import:

```tsx
import { REGIONS } from "@/lib/utils";
```

Add a helper computing the bulk-state of each region (none / partial / all). Place it near the top of the component (assuming the modal already exposes a `selectedDepartments` set/state and a `setSelectedDepartments` setter — adapt the names to whatever the actual modal uses):

```tsx
function regionState(deptsInRegion: string[], selected: Set<string>): "none" | "partial" | "all" {
  const present = deptsInRegion.filter((d) => selected.has(d)).length;
  if (present === 0) return "none";
  if (present === deptsInRegion.length) return "all";
  return "partial";
}

function toggleRegion(deptsInRegion: string[], selected: Set<string>): Set<string> {
  const next = new Set(selected);
  const state = regionState(deptsInRegion, next);
  if (state === "all") {
    deptsInRegion.forEach((d) => next.delete(d));
  } else {
    deptsInRegion.forEach((d) => next.add(d));
  }
  return next;
}
```

Add the JSX block right before the alphabetical departments list (the existing UI that lists 75, 77, etc.):

```tsx
<div className="space-y-2 rounded-lg border bg-muted/30 p-3">
  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Sélection rapide par région française
  </p>
  <div className="flex flex-wrap gap-1.5">
    {Object.entries(REGIONS).map(([regionName, deptCodes]) => {
      const state = regionState(deptCodes, selectedDepartments);
      const present = deptCodes.filter((d) => selectedDepartments.has(d)).length;
      return (
        <button
          key={regionName}
          type="button"
          onClick={() => setSelectedDepartments(toggleRegion(deptCodes, selectedDepartments))}
          className={
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
            (state === "all"
              ? "border-green-500 bg-green-500 text-white"
              : state === "partial"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-gray-200 bg-white text-gray-700 hover:border-green-200")
          }
          aria-pressed={state === "all"}
        >
          {regionName}{" "}
          <span className="opacity-70">
            ({present}/{deptCodes.length})
          </span>
        </button>
      );
    })}
  </div>
</div>
```

**Note**: The exact prop and state names (`selectedDepartments`, `setSelectedDepartments`) depend on the actual modal implementation. Adapt to whatever the modal uses for its internal selection state — read the file end to end before pasting.

- [ ] **Step 3: Verify lint + build**

```bash
npm run lint && npm run build
```

Expected: clean. Any TypeScript error about set vs array is a sign the existing modal uses an array — adapt the helper to operate on the same type.

- [ ] **Step 4: Manual sanity (browser)**

If a dev server runs, open the modal, click "Île-de-France", verify all 8 départements (75, 77, 78, 91, 92, 93, 94, 95) tick at once. Click again, all untick.

---

### Task 11: Commit + push Commit 2

- [ ] **Step 1: Stage exactly the Commit 2 files**

```bash
git add \
  "src/lib/config-conflicts.ts" \
  "src/components/dashboard/ConflictBanner.tsx" \
  "src/components/dashboard/CoverageMap.tsx" \
  "src/components/dashboard/RegionEditModal.tsx" \
  "src/app/(dashboard)/configurations/page.tsx" \
  "src/components/dashboard/ConfigurationsView.tsx"
git status
```

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(configurations): conflict detection + bulk region picker + map polish

Three pro-grade upgrades on top of the SSR foundation:

- Conflict detection (src/lib/config-conflicts.ts): pure server-side
  function flagging two high-confidence misconfigs — (1) zero zones
  configured (mover receives nothing), (2) zone with empty categories
  array (configured but matches no lead). Surfaced via a yellow
  ConflictBanner above the cards. The "department × radius redundancy"
  rule is intentionally skipped V1 — it would need reverse geocoding
  on lat/lng which we don't have.

- Bulk region picker in RegionEditModal: 13 buttons (one per French
  région) above the alphabetical departments list. Click "Île-de-France"
  to toggle all 8 IDF départements at once (75, 77, 78, 91, 92, 93,
  94, 95). Indicator shows "8/8" or "3/8" partial state. Reuses the
  REGIONS const from src/lib/utils.

- Map polish in CoverageMap: each marker gets a popup on click
  (city + radius + categories), the map auto-fits its bounds to all
  markers + circles via fitBounds(), and the radius circles take a
  category-driven color (national=green, entreprise=blue,
  international=purple).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin master
```

- [ ] **Step 3: After Vercel READY, browser verify**

On https://deme-iota.vercel.app/configurations:

1. As a mover with NO config: yellow ConflictBanner appears with "Aucune zone configurée".
2. As a mover with a region but no categories: ConflictBanner says "Le département XX n'a aucune catégorie cochée".
3. Open the edit modal → see the "Sélection rapide par région française" block above the deps list. Click "Île-de-France" → 8 departements ticked. Click again → all unticked.
4. With a radius rule configured: marker on the map → click → popup shows city, "Rayon X km", "Catégories : ...".
5. With multiple radius rules: the map auto-zooms to fit them all (no longer stuck at a single fixed zoom).

---

## Commit 3 — Polish (Tasks 12-14)

Goal: Mobile responsive, empty state CTAs upgraded.

### Task 12: Empty state CTAs

**Files:**
- Modify: `src/components/dashboard/ConfigurationsView.tsx`

- [ ] **Step 1: Replace the two empty-state `<p>` placeholders with rich blocks**

In `ConfigurationsView.tsx`, replace the regions empty state:

```tsx
// Before:
<p className="py-8 text-center text-sm text-muted-foreground">Aucun département configuré</p>

// After:
<div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
    <MapPin className="h-6 w-6 text-[var(--brand-green)]" />
  </div>
  <div className="space-y-1">
    <p className="text-sm font-semibold text-foreground">Aucun département ciblé</p>
    <p className="text-sm text-muted-foreground">
      Ajoutez les départements où vous souhaitez recevoir des leads.
    </p>
  </div>
  <Button size="sm" onClick={() => setEditModalOpen(true)} className="gap-1.5">
    <Pencil className="h-3.5 w-3.5" /> Configurer mes départements
  </Button>
</div>
```

And replace the radius rules empty state:

```tsx
// Before:
<p className="py-8 text-center text-sm text-muted-foreground">Aucune zone par rayon configurée</p>

// After:
<div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
    <Target className="h-6 w-6 text-[var(--brand-green)]" />
  </div>
  <div className="space-y-1">
    <p className="text-sm font-semibold text-foreground">Aucune zone par rayon</p>
    <p className="text-sm text-muted-foreground">
      Définissez un rayon autour d&apos;une ville pour cibler une zone précise.
    </p>
  </div>
  <Button size="sm" onClick={() => setEditModalOpen(true)} className="gap-1.5">
    <Pencil className="h-3.5 w-3.5" /> Ajouter une zone par rayon
  </Button>
</div>
```

- [ ] **Step 2: Verify lint + build**

```bash
npm run lint && npm run build
```

---

### Task 13: Mobile responsive — tables become cards

**Files:**
- Modify: `src/components/dashboard/ConfigurationsView.tsx`

For each of the two tables (Départements and Zones par rayon), wrap the existing `<Table>` element in `<div className="hidden sm:block">` and add a `<div className="space-y-2 sm:hidden">` mobile cards rendering.

- [ ] **Step 1: Refactor the Départements table block**

Find the Départements table block (currently `<div className="rounded-lg border"><Table>...</Table></div>`) and replace it with:

```tsx
<>
  {/* Desktop table */}
  <div className="hidden rounded-lg border sm:block">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Département</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Catégories</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {regions.map((region) => (
          <TableRow key={region.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50">
                  <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
                </div>
                <span className="text-sm font-medium">
                  {DEPARTMENTS[region.department_code] || region.department_name}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <span className="font-mono text-xs text-muted-foreground">{region.department_code}</span>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1.5">
                {region.categories.map((cat) => (
                  <Badge key={cat} variant="outline" className={`text-[11px] capitalize ${CATEGORY_COLORS[cat] ?? ""}`}>
                    {cat}
                  </Badge>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>

  {/* Mobile cards */}
  <div className="space-y-2 sm:hidden">
    {regions.map((region) => (
      <div key={region.id} className="flex items-start gap-3 rounded-lg border p-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-green-50">
          <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">
              {DEPARTMENTS[region.department_code] || region.department_name}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{region.department_code}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {region.categories.map((cat) => (
              <Badge key={cat} variant="outline" className={`text-[10px] capitalize ${CATEGORY_COLORS[cat] ?? ""}`}>
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
</>
```

- [ ] **Step 2: Refactor the Zones par rayon table block**

Find the Zones par rayon table block and replace with:

```tsx
<>
  {/* Desktop table */}
  <div className="hidden rounded-lg border sm:block">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ville de départ</TableHead>
          <TableHead>Rayon</TableHead>
          <TableHead>Catégories</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {radiusRules.map((rule) => (
          <TableRow key={rule.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50">
                  <Target className="h-4 w-4 text-[var(--brand-green)]" />
                </div>
                <span className="text-sm font-medium">{rule.departure_city}</span>
              </div>
            </TableCell>
            <TableCell>
              <span className="text-sm tabular-nums">{rule.radius_km} km</span>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1.5">
                {rule.move_types.map((cat) => (
                  <Badge key={cat} variant="outline" className={`text-[11px] capitalize ${CATEGORY_COLORS[cat] ?? ""}`}>
                    {cat}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                onClick={() => deleteRadius(rule.id, rule.departure_city)}
                aria-label={`Supprimer la zone ${rule.departure_city}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>

  {/* Mobile cards */}
  <div className="space-y-2 sm:hidden">
    {radiusRules.map((rule) => (
      <div key={rule.id} className="flex items-start gap-3 rounded-lg border p-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-green-50">
          <Target className="h-4 w-4 text-[var(--brand-green)]" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">{rule.departure_city}</span>
            <span className="text-sm tabular-nums text-muted-foreground">{rule.radius_km} km</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {rule.move_types.map((cat) => (
              <Badge key={cat} variant="outline" className={`text-[10px] capitalize ${CATEGORY_COLORS[cat] ?? ""}`}>
                {cat}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 flex-shrink-0 p-0 text-muted-foreground hover:text-red-600"
          onClick={() => deleteRadius(rule.id, rule.departure_city)}
          aria-label={`Supprimer la zone ${rule.departure_city}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ))}
  </div>
</>
```

- [ ] **Step 3: Verify lint + build**

```bash
npm run lint && npm run build
```

---

### Task 14: Commit + push Commit 3, manual mobile verification

- [ ] **Step 1: Stage Commit 3 files**

```bash
git add "src/components/dashboard/ConfigurationsView.tsx"
git status
```

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
polish(configurations): mobile-responsive cards + empty state CTAs

The two tables now collapse into stacked cards on viewports below sm
(< 640px) so movers running their business from a phone don't have
to deal with horizontal scroll on tables. Desktop layout unchanged.

Empty states upgraded from a single muted line to icon + headline +
sub + primary CTA button that opens the edit modal directly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push origin master
```

- [ ] **Step 3: Manual mobile check**

Open Chrome DevTools, set device to iPhone SE (375 × 667), reload https://deme-iota.vercel.app/configurations:

1. The "Départements ciblés" Card shows stacked cards (no horizontal scroll on a table).
2. The "Zones par rayon" Card shows stacked cards with a 🗑️ delete button at the right edge of each card.
3. Empty states (when applicable) show the icon + CTA button.
4. The map fits horizontally without overflow.
5. The CTA buttons are tappable (44 × 44px target — eyeball it; the `size="sm"` button on shadcn is ~32px which is fine for non-critical actions).

If anything overflows, fix inline.

---

## Self-Review

### Spec coverage check

- ✅ Server Component conversion → Tasks 1–2
- ✅ Bug 1+3 (map markers fake Paris) → Task 1 (`mapMarkers` from `radiusRules`)
- ✅ Bug 2 (radius rules invisible) → Task 1 (new "Zones par rayon" Card with delete)
- ✅ Stats inline header (count + impact preview) → Task 1 (header sentence)
- ✅ Impact preview server-side count → Task 2 (`impactRes` parallel fetch)
- ✅ Bulk region picker → Task 10
- ✅ Conflict detection (rules 2 + 3, rule 1 skipped) → Tasks 7–8
- ✅ ConflictBanner UI → Task 8
- ✅ Map polish (popup, auto-fit, color by category) → Task 9
- ✅ Empty states with CTAs → Task 12
- ✅ Mobile responsive → Task 13
- ✅ Drop framer-motion → Task 3 (verification step)
- ✅ Commit splits 1 / 2 / 3 → Tasks 6, 11, 14
- ❌ Tooltip on category badges (mentioned in Commit 3 of spec). NOT in plan. Decision: drop — adds a shadcn tooltip provider wiring for marginal value. Acceptable scope cut.

### Placeholder scan

- No "TBD", "TODO", "implement later" anywhere in tasks.
- Step 2 of Task 10 has a note: "the exact prop and state names depend on the actual modal implementation. Adapt..." — this is honest scope warning, not a placeholder. The implementer needs to read the modal first; the helpers and JSX are concrete.
- All commit messages, code blocks, and verification commands are complete.

### Type consistency

- `Region` and `RadiusRule` interfaces are duplicated between `page.tsx` and `ConfigurationsView.tsx`. Acceptable for an initial plan; the implementer can extract into a shared types module if desired (out of scope here).
- `ConfigConflict` type defined in `src/lib/config-conflicts.ts` and imported in `ConflictBanner.tsx` and `ConfigurationsView.tsx` — consistent.
- `Marker` interface defined inline in `CoverageMap.tsx` — extra `categories?: string[]` field added consistently with the props passed by `ConfigurationsView`.

No further fixes needed.
