# Company Profile Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow movers to edit their company profile (name with admin validation, plus auto-synced legal status & VAT from INSEE) and let admin edit any company field — with public TVA display.

**Architecture:** Add `pending_name` column to `companies` for the name-change validation workflow. Compute French VAT from SIREN. Reuse the existing `EditableTextField` component across mover dashboard and admin views. Add Vitest with unit tests for pure functions.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind, shadcn/ui, INSEE API v3.11, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-18-company-profile-edit-design.md`

---

## Task 1: Add Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest dependencies**

Run:
```bash
npm i -D vitest@^2 @vitejs/plugin-react@^4 @testing-library/react@^16 @testing-library/jest-dom@^6 jsdom@^25
```

Expected: dependencies added to `devDependencies` in `package.json`.

- [ ] **Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 3: Create vitest.setup.ts**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 4: Add test scripts to package.json**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify Vitest runs (no tests yet)**

Run: `npm run test`
Expected: exits 0 with "No test files found".

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts
git commit -m "chore: add Vitest setup"
```

---

## Task 2: French VAT computation helper

**Files:**
- Modify: `src/lib/sirene.ts`
- Test: `src/lib/sirene.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/sirene.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeFrenchVAT } from "./sirene";

describe("computeFrenchVAT", () => {
  it("computes valid VAT from SIREN", () => {
    // SIREN 732829320 → key = (12 + 3 * (732829320 % 97)) % 97 = 44
    expect(computeFrenchVAT("732829320")).toBe("FR44732829320");
  });

  it("pads single-digit key with leading zero", () => {
    // SIREN 404833048 → key = (12 + 3 * (404833048 % 97)) % 97 = 9
    expect(computeFrenchVAT("404833048")).toBe("FR09404833048");
  });

  it("returns null for non-numeric input", () => {
    expect(computeFrenchVAT("invalid")).toBeNull();
  });

  it("returns null for wrong length", () => {
    expect(computeFrenchVAT("12345")).toBeNull();
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `npm run test -- sirene`
Expected: FAIL with `computeFrenchVAT is not a function`.

- [ ] **Step 3: Implement helper and add to SireneResult**

In `src/lib/sirene.ts`:

a) Add to the `SireneResult` interface (after the `employeeCount` line, line ~14):
```ts
  vatNumber: string | null;
```

b) Export the helper at the end of the file (after `formatLegalStatus`):
```ts
export function computeFrenchVAT(siren: string): string | null {
  if (!/^\d{9}$/.test(siren)) return null;
  const key = (12 + 3 * (parseInt(siren, 10) % 97)) % 97;
  return `FR${key.toString().padStart(2, "0")}${siren}`;
}
```

c) In `verifySiret`, populate the new field. After the `siren: unite.siren ?? etab.siret.slice(0, 9),` line, also compute the VAT — change the `return` block to include:
```ts
  const sirenValue = unite.siren ?? etab.siret.slice(0, 9);
  return {
    siret: etab.siret,
    siren: sirenValue,
    companyName: denomination,
    raisonSociale,
    address: streetParts.join(" "),
    postalCode: adresse.codePostalEtablissement ?? "",
    city: adresse.libelleCommuneEtablissement ?? "",
    legalStatus: legalStatusCode,
    legalStatusLabel: formatLegalStatus(legalStatusCode),
    naf: etab.activitePrincipaleEtablissement ?? "",
    nafLabel: etab.activitePrincipaleEtablissement ?? "",
    employeeCount: unite.trancheEffectifsUniteLegale ?? "",
    vatNumber: computeFrenchVAT(sirenValue),
    isActive:
      etab.etatAdministratifEtablissement === "A" ||
      etab.periodesEtablissement?.[0]?.etatAdministratifEtablissement === "A",
  };
```

- [ ] **Step 4: Verify test passes**

Run: `npm run test -- sirene`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sirene.ts src/lib/sirene.test.ts
git commit -m "feat(sirene): add French VAT computation from SIREN"
```

---

## Task 3: Company slug helper

**Files:**
- Modify: `src/lib/utils.ts`
- Test: `src/lib/utils.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/utils.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { generateCompanySlug, slugify } from "./utils";

describe("slugify", () => {
  it("normalizes accents", () => {
    expect(slugify("Café Déménagement")).toBe("cafe-demenagement");
  });
});

describe("generateCompanySlug", () => {
  it("returns slug with 8-char suffix", () => {
    const result = generateCompanySlug("Mon Entreprise SARL");
    expect(result).toMatch(/^mon-entreprise-sarl-[a-z0-9]{8}$/);
  });

  it("normalizes accents", () => {
    const result = generateCompanySlug("Déménagement Café");
    expect(result).toMatch(/^demenagement-cafe-[a-z0-9]{8}$/);
  });
});
```

- [ ] **Step 2: Verify test fails**

Run: `npm run test -- utils`
Expected: FAIL — `generateCompanySlug is not a function`. (`slugify` test should pass since it already exists.)

- [ ] **Step 3: Add helper to src/lib/utils.ts**

After the existing `slugify` function (line ~67), add:
```ts
export function generateCompanySlug(name: string): string {
  const suffix = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${slugify(name)}-${suffix}`;
}
```

- [ ] **Step 4: Verify tests pass**

Run: `npm run test -- utils`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat(utils): add generateCompanySlug helper"
```

---

## Task 4: Database migration for pending name

**Files:**
- Create: `supabase/migrations/002_company_name_change_request.sql`

- [ ] **Step 1: Create migration**

```sql
-- 002_company_name_change_request.sql
-- Adds pending_name fields to support the mover-side name-change request
-- workflow with admin validation.

ALTER TABLE companies
  ADD COLUMN pending_name TEXT,
  ADD COLUMN pending_name_requested_at TIMESTAMPTZ;

CREATE INDEX companies_pending_name_idx
  ON companies (pending_name_requested_at)
  WHERE pending_name IS NOT NULL;
```

- [ ] **Step 2: Push migration to Supabase**

Run: `npx supabase db push`
Expected: migration applied to project `erbwycanjwtiqpdzaqam`.

- [ ] **Step 3: Regenerate TypeScript types**

Run:
```bash
npx supabase gen types typescript --project-id=erbwycanjwtiqpdzaqam > src/types/database.types.ts
```
Expected: file updated with `pending_name` / `pending_name_requested_at` on the `companies` row type.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_company_name_change_request.sql src/types/database.types.ts
git commit -m "feat(db): add pending_name workflow columns to companies"
```

---

## Task 5: Public API exposes vat_number

**Files:**
- Modify: `src/app/api/public/movers/[slug]/route.ts`

- [ ] **Step 1: Add vat_number to SELECT**

In `src/app/api/public/movers/[slug]/route.ts` line 12, change:
```ts
      id, name, slug, city, postal_code, logo_url, description,
      rating, review_count, is_verified, account_status,
      employee_count, legal_status, siret, website,
```
to:
```ts
      id, name, slug, city, postal_code, logo_url, description,
      rating, review_count, is_verified, account_status,
      employee_count, legal_status, siret, vat_number, website,
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build passes with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/public/movers/[slug]/route.ts
git commit -m "feat(api): expose vat_number on public mover endpoint"
```

---

## Task 6: Public mover page displays VAT

**Files:**
- Modify: `src/app/(public)/entreprises-demenagement/[slug]/page.tsx`

- [ ] **Step 1: Add vat_number to Company type**

In the `Company` interface (line ~20), after `siret: string;` add:
```ts
  vat_number: string | null;
```

- [ ] **Step 2: Add VAT card to "Informations légales" section**

In the same file, find the `<section>` block with `<h2>Informations légales</h2>` (around line 252). Inside the `<div className="mt-4 grid gap-4 sm:grid-cols-3">`, after the `{company.legal_status && (...)}` block and before the `{company.employee_count && (...)}` block, add:
```tsx
                {company.vat_number && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">N° TVA intracommunautaire</p>
                      <p className="font-mono text-sm font-medium">{company.vat_number}</p>
                    </CardContent>
                  </Card>
                )}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/entreprises-demenagement/[slug]/page.tsx"
git commit -m "feat(public): display VAT number on mover profile page"
```

---

## Task 7: Extract reusable EditableTextField component

**Files:**
- Create: `src/components/shared/EditableField.tsx`
- Modify: `src/app/(dashboard)/profil-entreprise/page.tsx`

- [ ] **Step 1: Create shared EditableTextField**

Create `src/components/shared/EditableField.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Pencil } from "lucide-react";

export function EditableTextField({
  label,
  value,
  icon,
  placeholder,
  multiline,
  onSave,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  placeholder?: string;
  multiline?: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(current);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-1 space-y-2">
          {multiline ? (
            <textarea
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-[var(--brand-green)]"
            />
          ) : (
            <input
              type="text"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-[var(--brand-green)]"
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1 h-7 text-xs">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              OK
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCurrent(value);
                setEditing(false);
              }}
              className="h-7 text-xs"
            >
              Annuler
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {icon}
        <p className="text-sm font-medium">
          {value || <span className="text-muted-foreground/60">Non renseigné</span>}
        </p>
        <button
          onClick={() => {
            setCurrent(value);
            setEditing(true);
          }}
          className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace local definition in profil-entreprise**

In `src/app/(dashboard)/profil-entreprise/page.tsx`:

a) Remove the local `EditableTextField` function (lines ~952-1017). Keep `EditableField` (the dropdown variant) — it stays local.

b) At the top of the file, add an import next to the other component imports (around line 33):
```tsx
import { EditableTextField } from "@/components/shared/EditableField";
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors. The mover dashboard renders identically.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/EditableField.tsx "src/app/(dashboard)/profil-entreprise/page.tsx"
git commit -m "refactor(shared): extract EditableTextField for reuse"
```

---

## Task 8: Mover API — request_name_change action

**Files:**
- Modify: `src/app/api/dashboard/profile/route.ts`

- [ ] **Step 1: Add the action handler**

In `src/app/api/dashboard/profile/route.ts`, after the `delete_photo` action block (around line 127, just before the `// Update company fields` comment), insert:

```ts
  // Request a company name change (admin must approve)
  if (body.action === "request_name_change") {
    const requested = (body.requested_name || "").toString().trim();
    if (!requested) {
      return NextResponse.json(
        { error: "Le nouveau nom est requis" },
        { status: 400 }
      );
    }
    if (requested === (company.name || "").trim()) {
      return NextResponse.json(
        { error: "Le nouveau nom est identique au nom actuel" },
        { status: 400 }
      );
    }
    if (company.pending_name) {
      return NextResponse.json(
        { error: "Une demande de changement de nom est déjà en cours" },
        { status: 409 }
      );
    }
    const { data, error } = await admin
      .from("companies")
      .update({
        pending_name: requested,
        pending_name_requested_at: new Date().toISOString(),
      })
      .eq("id", company.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/profile/route.ts
git commit -m "feat(api): add request_name_change action for movers"
```

---

## Task 9: Mover API — sync_from_insee action

**Files:**
- Modify: `src/app/api/dashboard/profile/route.ts`

- [ ] **Step 1: Add import**

At the top of `src/app/api/dashboard/profile/route.ts`, add to existing imports:
```ts
import { verifySiret } from "@/lib/sirene";
```

- [ ] **Step 2: Add action handler**

Just below the `request_name_change` block added in Task 8, insert:

```ts
  // Sync legal_status + vat_number from INSEE
  if (body.action === "sync_from_insee") {
    if (!company.siret) {
      return NextResponse.json(
        { error: "SIRET manquant" },
        { status: 400 }
      );
    }
    const result = await verifySiret(company.siret);
    if (!result) {
      return NextResponse.json(
        { error: "SIRET introuvable à l'INSEE" },
        { status: 404 }
      );
    }
    const { data, error } = await admin
      .from("companies")
      .update({
        legal_status: result.legalStatusLabel,
        vat_number: result.vatNumber,
      })
      .eq("id", company.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/profile/route.ts
git commit -m "feat(api): add sync_from_insee action for movers"
```

---

## Task 10: Mover dashboard — pending name banner

**Files:**
- Modify: `src/app/(dashboard)/profil-entreprise/page.tsx`

- [ ] **Step 1: Extend Company interface**

In the `Company` interface (line ~39), add:
```ts
  vat_number?: string | null;
  pending_name?: string | null;
  pending_name_requested_at?: string | null;
```

- [ ] **Step 2: Add formatDate import (if missing)**

At the top of the file, ensure `formatDate` is imported. If not present, change the `import { cn } from "@/lib/utils";` line to:
```ts
import { cn, formatDate } from "@/lib/utils";
```

- [ ] **Step 3: Add banner before "Infos entreprise" card**

Find the `{/* Company info */}` motion.div block (around line 791). Just **before** that block, insert:

```tsx
      {/* Pending name change request */}
      {company.pending_name && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="flex items-start gap-3 p-4">
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Demande de changement de nom en attente
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  Nouveau nom demandé : <strong>{company.pending_name}</strong>
                  {company.pending_name_requested_at && (
                    <> — soumise le {formatDate(company.pending_name_requested_at)}</>
                  )}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  En attente de validation par un administrateur.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/profil-entreprise/page.tsx"
git commit -m "feat(dashboard): show pending name change banner"
```

---

## Task 11: Mover dashboard — name request UI + INSEE sync button + VAT/legal display

**Files:**
- Modify: `src/app/(dashboard)/profil-entreprise/page.tsx`

- [ ] **Step 1: Replace the static name + add legal fields in the header**

The current header card (around line 387) only displays `{company.name}` as text. Inside the `<div className="text-center sm:text-left">`, replace the `<h3 className="text-xl font-bold">{company.name}</h3>` line with this block (which uses an inline-edit toggle that calls `request_name_change`):

```tsx
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h3 className="text-xl font-bold">{company.name}</h3>
                  {!company.pending_name && (
                    <button
                      onClick={async () => {
                        const newName = window.prompt(
                          "Nouveau nom d'entreprise (sera soumis à validation admin) :",
                          company.name
                        );
                        if (!newName || newName.trim() === company.name.trim()) return;
                        const res = await fetch("/api/dashboard/profile", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "request_name_change",
                            requested_name: newName.trim(),
                          }),
                        });
                        if (res.ok) {
                          toast.success("Demande envoyée à l'administrateur");
                          fetchProfile();
                        } else {
                          const data = await res.json();
                          toast.error(data.error || "Erreur");
                        }
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Demander un changement de nom"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
```

- [ ] **Step 2: Add VAT, legal status (read-only) and INSEE sync button to "Infos entreprise" card**

In the `{/* Company info */}` motion.div, find the `<div className="grid gap-4 sm:grid-cols-3">` block. Add a state hook + handler at the top of the component (right next to other `useState` calls, around line 142):
```tsx
  const [syncingInsee, setSyncingInsee] = useState(false);

  async function handleSyncFromInsee() {
    setSyncingInsee(true);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_from_insee" }),
      });
      if (res.ok) {
        toast.success("Statut juridique et TVA mis à jour depuis l'INSEE");
        fetchProfile();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur de synchronisation");
      }
    } finally {
      setSyncingInsee(false);
    }
  }
```

Then in the JSX, after the existing `<div>` that displays `Statut juridique`, add a new VAT block, and add the sync button as a new grid cell. Replace the entire `<div className="grid gap-4 sm:grid-cols-3">...</div>` content with:

```tsx
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">SIRET</p>
                <p className="mt-1 text-sm font-medium font-mono">{company.siret || "Non renseigné"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Statut juridique</p>
                <p className="mt-1 text-sm font-medium">{company.legal_status || "Non renseigné"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">N° TVA intracommunautaire</p>
                <p className="mt-1 text-sm font-medium font-mono">{company.vat_number || "Non renseigné"}</p>
              </div>
              <EditableField
                label="Effectifs"
                value={company.employee_count || ""}
                icon={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
                options={[
                  { value: "1", label: "1 personne" },
                  { value: "3", label: "2-5 personnes" },
                  { value: "8", label: "6-10 personnes" },
                  { value: "18", label: "11-25 personnes" },
                  { value: "38", label: "26-50 personnes" },
                  { value: "75", label: "51-100 personnes" },
                  { value: "150", label: "Plus de 100 personnes" },
                ]}
                displayValue={(v: string) => {
                  const n = parseInt(v);
                  if (!n) return v;
                  if (n <= 1) return "1 personne";
                  if (n <= 5) return "2-5 personnes";
                  if (n <= 10) return "6-10 personnes";
                  if (n <= 25) return "11-25 personnes";
                  if (n <= 50) return "26-50 personnes";
                  if (n <= 100) return "51-100 personnes";
                  return "100+ personnes";
                }}
                onSave={async (val) => {
                  const res = await fetch("/api/dashboard/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ employee_count: parseInt(val) }),
                  });
                  if (res.ok) { toast.success("Effectifs mis à jour"); fetchProfile(); }
                  else toast.error("Erreur");
                }}
              />
              <EditableTextField
                label="Téléphone"
                value={company.phone || ""}
                icon={<Phone className="h-3.5 w-3.5 text-muted-foreground" />}
                placeholder="+33 6 12 34 56 78"
                onSave={async (val) => {
                  const res = await fetch("/api/dashboard/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone: val }),
                  });
                  if (res.ok) { toast.success("Téléphone mis à jour"); fetchProfile(); }
                  else toast.error("Erreur");
                }}
              />
              <EditableTextField
                label="Email de contact"
                value={company.email_contact || ""}
                icon={<Mail className="h-3.5 w-3.5 text-muted-foreground" />}
                placeholder="contact@votreentreprise.fr"
                onSave={async (val) => {
                  const res = await fetch("/api/dashboard/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email_contact: val }),
                  });
                  if (res.ok) { toast.success("Email mis à jour"); fetchProfile(); }
                  else toast.error("Erreur");
                }}
              />
              <EditableTextField
                label="Site web"
                value={company.website || ""}
                icon={<Globe className="h-3.5 w-3.5 text-muted-foreground" />}
                placeholder="https://votreentreprise.fr"
                onSave={async (val) => {
                  const res = await fetch("/api/dashboard/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ website: val }),
                  });
                  if (res.ok) { toast.success("Site web mis à jour"); fetchProfile(); }
                  else toast.error("Erreur");
                }}
              />
            </div>
            <div className="mt-4 flex items-center gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncFromInsee}
                disabled={syncingInsee || !company.siret}
                className="gap-1.5"
              >
                {syncingInsee ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Building2 className="h-3.5 w-3.5" />
                )}
                Re-synchroniser depuis INSEE
              </Button>
              <span className="text-xs text-muted-foreground">
                Met à jour statut juridique et TVA
              </span>
            </div>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/profil-entreprise/page.tsx"
git commit -m "feat(dashboard): name change request + INSEE sync UI"
```

---

## Task 12: Admin API — update_field action

**Files:**
- Modify: `src/app/api/admin/companies/route.ts`

- [ ] **Step 1: Add action handler**

In `src/app/api/admin/companies/route.ts`, after the `reactivate` block (around line 91, before the `// Delete company` comment), insert:

```ts
  // Update an arbitrary editable field on a company
  if (body.action === "update_field") {
    const ALLOWED = new Set([
      "name",
      "siret",
      "vat_number",
      "legal_status",
      "employee_count",
      "address",
      "city",
      "postal_code",
      "phone",
      "email_contact",
      "email_billing",
      "website",
      "description",
    ]);
    const field = (body.field || "").toString();
    if (!ALLOWED.has(field)) {
      return NextResponse.json(
        { error: `Champ '${field}' non modifiable` },
        { status: 400 }
      );
    }
    let value: unknown = body.value;
    if (field === "employee_count") {
      const parsed = parseInt(String(value), 10);
      value = Number.isFinite(parsed) ? parsed : null;
    } else if (typeof value === "string") {
      const trimmed = value.trim();
      value = trimmed === "" ? null : trimmed;
    }
    const { error } = await supabase
      .from("companies")
      .update({ [field]: value })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/companies/route.ts
git commit -m "feat(api): add update_field action for admin"
```

---

## Task 13: Admin API — approve/reject name change

**Files:**
- Modify: `src/app/api/admin/companies/route.ts`

- [ ] **Step 1: Add import**

At the top of `src/app/api/admin/companies/route.ts`, add:
```ts
import { generateCompanySlug } from "@/lib/utils";
```

- [ ] **Step 2: Add action handlers**

Just below the `update_field` block from Task 12, insert:

```ts
  // Approve a pending name change: copy pending_name → name + regen slug
  if (body.action === "approve_name_change") {
    const { data: target } = await supabase
      .from("companies")
      .select("id, pending_name")
      .eq("id", body.id)
      .single();
    if (!target?.pending_name) {
      return NextResponse.json(
        { error: "Aucune demande en attente" },
        { status: 400 }
      );
    }
    const newSlug = generateCompanySlug(target.pending_name);
    const { error } = await supabase
      .from("companies")
      .update({
        name: target.pending_name,
        slug: newSlug,
        pending_name: null,
        pending_name_requested_at: null,
      })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, slug: newSlug });
  }

  // Reject a pending name change: clear the request
  if (body.action === "reject_name_change") {
    const { error } = await supabase
      .from("companies")
      .update({
        pending_name: null,
        pending_name_requested_at: null,
      })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/companies/route.ts
git commit -m "feat(api): add approve/reject name change actions for admin"
```

---

## Task 14: Admin UI — pending fields on Company type + list banner

**Files:**
- Modify: `src/app/admin/companies/page.tsx`

- [ ] **Step 1: Extend Company interface**

In `src/app/admin/companies/page.tsx`, in the `Company` interface (line ~21), add after `is_verified: boolean;`:
```ts
  pending_name: string | null;
  pending_name_requested_at: string | null;
```

- [ ] **Step 2: Add list-view banner above the table**

Find the list-view return block (around line 924, after the `// ─── LIST VIEW ───` comment). Just after the search/filter `<div className="flex gap-3">` block (line ~954), before `<div className="overflow-hidden rounded-xl border bg-white shadow-sm">`, insert:

```tsx
      {(() => {
        const pending = companies.filter((c) => c.pending_name);
        if (pending.length === 0) return null;
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-sm font-semibold text-amber-900">
              ⚠ {pending.length} demande{pending.length > 1 ? "s" : ""} de changement de nom à valider
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pending.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompany(c)}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100"
                >
                  {c.name} → {c.pending_name}
                </button>
              ))}
            </div>
          </div>
        );
      })()}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/companies/page.tsx
git commit -m "feat(admin): show pending name change banner on list"
```

---

## Task 15: Admin UI — detail-view name change banner with approve/reject

**Files:**
- Modify: `src/app/admin/companies/page.tsx`

- [ ] **Step 1: Add banner to detail view**

In the detail view block (`if (selectedCompany)`, around line 530), find the `<div className="grid gap-6 lg:grid-cols-3">` (around line 618). Just **before** it, add:

```tsx
        {c.pending_name && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Demande de changement de nom
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  Actuel : <strong>{c.name}</strong>
                </p>
                <p className="text-xs text-amber-800">
                  Demandé : <strong>{c.pending_name}</strong>
                </p>
                {c.pending_name_requested_at && (
                  <p className="mt-1 text-[11px] text-amber-700">
                    Soumis le {formatDateShort(c.pending_name_requested_at)}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    if (!confirm(`Approuver « ${c.pending_name} » ? L'URL publique va changer.`)) return;
                    const res = await fetch("/api/admin/companies", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "approve_name_change", id: c.id }),
                    });
                    if (res.ok) { toast.success("Nom approuvé"); fetchCompanies(); }
                    else toast.error("Erreur");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approuver
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Rejeter cette demande ?")) return;
                    const res = await fetch("/api/admin/companies", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "reject_name_change", id: c.id }),
                    });
                    if (res.ok) { toast.success("Demande rejetée"); fetchCompanies(); }
                    else toast.error("Erreur");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-3.5 w-3.5" /> Rejeter
                </button>
              </div>
            </div>
          </div>
        )}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/companies/page.tsx
git commit -m "feat(admin): approve/reject name change banner on detail view"
```

---

## Task 16: Admin UI — replace static fields with editable ones

**Files:**
- Modify: `src/app/admin/companies/page.tsx`

- [ ] **Step 1: Add helper for inline edits**

At the top of the file, add to existing imports:
```ts
import { EditableTextField } from "@/components/shared/EditableField";
```

Then, inside the `AdminCompanies` component (next to other helpers like `handleAction`), add:

```tsx
  async function updateField(id: string, field: string, value: string) {
    const res = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_field", id, field, value }),
    });
    if (res.ok) { toast.success("Mis à jour"); fetchCompanies(); }
    else { const d = await res.json(); toast.error(d.error || "Erreur"); }
  }
```

- [ ] **Step 2: Replace "Informations entreprise" grid with editable fields**

In the detail view, find the `{/* Infos entreprise */}` block (around line 621). Replace the entire `<div className="grid gap-3 p-5 text-sm sm:grid-cols-2">...</div>` content with:

```tsx
              <div className="grid gap-4 p-5 text-sm sm:grid-cols-2">
                <EditableTextField
                  label="Nom"
                  value={c.name || ""}
                  onSave={(v) => updateField(c.id, "name", v)}
                />
                <EditableTextField
                  label="SIRET"
                  value={c.siret || ""}
                  onSave={(v) => updateField(c.id, "siret", v)}
                />
                <EditableTextField
                  label="Adresse"
                  value={c.address || ""}
                  onSave={(v) => updateField(c.id, "address", v)}
                />
                <EditableTextField
                  label="Code postal"
                  value={c.postal_code || ""}
                  onSave={(v) => updateField(c.id, "postal_code", v)}
                />
                <EditableTextField
                  label="Ville"
                  value={c.city || ""}
                  onSave={(v) => updateField(c.id, "city", v)}
                />
                <EditableTextField
                  label="Statut juridique"
                  value={c.legal_status || ""}
                  onSave={(v) => updateField(c.id, "legal_status", v)}
                />
                <EditableTextField
                  label="Effectif"
                  value={c.employee_count?.toString() || ""}
                  onSave={(v) => updateField(c.id, "employee_count", v)}
                />
                <EditableTextField
                  label="N° TVA"
                  value={c.vat_number || ""}
                  onSave={(v) => updateField(c.id, "vat_number", v)}
                />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Slug (auto)</p>
                  <p className="mt-1 font-mono text-xs">{c.slug}</p>
                </div>
              </div>
```

- [ ] **Step 3: Replace "Contact" grid with editable fields**

In the same detail view, find `{/* Contact */}` block (around line 636). Replace the entire `<div className="grid gap-3 p-5 text-sm sm:grid-cols-2">...</div>` content with:

```tsx
              <div className="grid gap-4 p-5 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Responsable</p>
                  <p className="mt-1 text-sm font-medium">{c.profiles?.full_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Email responsable (auth)</p>
                  <p className="mt-1 text-sm font-medium">{c.profiles?.email || "—"}</p>
                </div>
                <EditableTextField
                  label="Email contact"
                  value={c.email_contact || ""}
                  onSave={(v) => updateField(c.id, "email_contact", v)}
                />
                <EditableTextField
                  label="Email facturation"
                  value={c.email_billing || ""}
                  onSave={(v) => updateField(c.id, "email_billing", v)}
                />
                <EditableTextField
                  label="Téléphone"
                  value={c.phone || ""}
                  onSave={(v) => updateField(c.id, "phone", v)}
                />
                <EditableTextField
                  label="Site web"
                  value={c.website || ""}
                  onSave={(v) => updateField(c.id, "website", v)}
                />
              </div>
```

- [ ] **Step 4: Replace "Description" block with editable field**

Find the `{/* Description */}` block (around line 649). Replace the entire `{c.description && (...)}` block with (always shown now, even if empty):

```tsx
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-3"><h3 className="text-sm font-semibold">Description</h3></div>
              <div className="p-5">
                <EditableTextField
                  label=""
                  value={c.description || ""}
                  multiline
                  onSave={(v) => updateField(c.id, "description", v)}
                />
              </div>
            </div>
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/companies/page.tsx
git commit -m "feat(admin): inline edit for all company fields"
```

---

## Task 17: Final verification — full test + build + manual checks

**Files:** none (verification only)

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: all tests pass (sirene + utils).

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: 0 TypeScript / lint errors, 66+ pages generated.

- [ ] **Step 3: Run dev server and test the 3 manual flows**

Run: `npm run dev`

Then in the browser:

1. **Mover requests name change**:
   - Log in as a mover, go to `/profil-entreprise`.
   - Click the pencil next to the company name → enter a new name → confirm.
   - Page reloads → amber banner appears: « Demande de changement de nom en attente: ... ».
   - The pencil button is gone while pending.

2. **Admin processes the request**:
   - Log in as admin, go to `/admin/companies`.
   - Top-of-list amber banner shows the count and the company → click it.
   - Detail view shows the request banner with **Approuver** / **Rejeter**.
   - Click **Approuver** → confirm.
   - List refreshes; the company's name in the list shows the new name.
   - Open `/entreprises-demenagement/<old-slug>` → 404. Open the new slug → success.

3. **Mover re-syncs INSEE**:
   - Back as mover, `/profil-entreprise`.
   - Click **Re-synchroniser depuis INSEE**.
   - Toast: « Statut juridique et TVA mis à jour depuis l'INSEE ».
   - Statut juridique and N° TVA fields show fresh values.
   - Open the public profile → the « N° TVA intracommunautaire » card is visible.

- [ ] **Step 4: Final commit if any drift was fixed**

If steps revealed any small fix, commit it:
```bash
git add -A
git commit -m "fix: address manual QA findings"
```

If nothing was changed, skip.
