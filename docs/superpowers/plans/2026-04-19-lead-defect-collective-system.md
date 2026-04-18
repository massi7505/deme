# Lead Defect Collective System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-flag a lead as defective when ≥ 4 movers file a hard-reason claim on it, and let the admin accept (refund all) or reject in a single click.

**Architecture:** Add a `defect_status` column to `quote_requests` so the flag lives on the lead itself. A detection helper runs after each new claim; admin actions live in `/api/admin/claims`; UI surfaces a red alert panel on `/admin/claims` + a dashboard counter.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind, shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-19-lead-defect-collective-system-design.md`

**Important:** The `claims.reason` field stores French labels (not `duplicate`/`fake` codes). The valid reasons are `"Numéro invalide"`, `"Client déjà contacté"`, `"Fausse demande"`, `"Client déjà déménagé"`, `"Doublon"`. Hard reasons (counted toward defect flag): `"Fausse demande"`, `"Doublon"`, `"Numéro invalide"`, `"Client déjà déménagé"`. The soft reason is `"Client déjà contacté"` (client unreachable — legitimate, not a lead defect).

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/016_lead_defect_flag.sql`

- [ ] **Step 1: Write migration**

```sql
-- 016_lead_defect_flag.sql
-- Adds columns to track collective-claim-driven lead defect workflow.
-- Flag is per-lead (quote_request), not per-claim, since multiple claims
-- from different movers target the same underlying lead.

ALTER TABLE quote_requests
  ADD COLUMN defect_status TEXT
    CHECK (defect_status IN ('suspected', 'confirmed_refunded', 'rejected')),
  ADD COLUMN defect_flagged_at TIMESTAMPTZ,
  ADD COLUMN defect_resolved_at TIMESTAMPTZ,
  ADD COLUMN defect_resolved_by TEXT;

CREATE INDEX quote_requests_defect_idx
  ON quote_requests (defect_status)
  WHERE defect_status IS NOT NULL;
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied to project `erbwycanjwtiqpdzaqam`.

- [ ] **Step 3: Regenerate types**

Run: `npx supabase gen types typescript --project-id=erbwycanjwtiqpdzaqam > src/types/database.types.ts`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/016_lead_defect_flag.sql src/types/database.types.ts
git commit -m "feat(db): add defect_status workflow columns to quote_requests"
```

---

## Task 2: Detection helper with unit tests

**Files:**
- Create: `src/lib/defect-detection.ts`
- Create: `src/lib/defect-detection.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/defect-detection.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isHardReason, shouldFlagDefect, HARD_REASONS, DEFECT_THRESHOLD } from "./defect-detection";

describe("isHardReason", () => {
  it("returns true for hard reasons", () => {
    expect(isHardReason("Fausse demande")).toBe(true);
    expect(isHardReason("Doublon")).toBe(true);
    expect(isHardReason("Numéro invalide")).toBe(true);
    expect(isHardReason("Client déjà déménagé")).toBe(true);
  });

  it("returns false for soft reasons", () => {
    expect(isHardReason("Client déjà contacté")).toBe(false);
  });

  it("returns false for unknown reasons", () => {
    expect(isHardReason("foo")).toBe(false);
    expect(isHardReason("")).toBe(false);
  });
});

describe("shouldFlagDefect", () => {
  it("flags when at or above threshold", () => {
    expect(shouldFlagDefect(DEFECT_THRESHOLD)).toBe(true);
    expect(shouldFlagDefect(DEFECT_THRESHOLD + 1)).toBe(true);
  });

  it("does not flag below threshold", () => {
    expect(shouldFlagDefect(DEFECT_THRESHOLD - 1)).toBe(false);
    expect(shouldFlagDefect(0)).toBe(false);
  });
});

describe("constants", () => {
  it("threshold is 4", () => {
    expect(DEFECT_THRESHOLD).toBe(4);
  });
  it("hard reasons set has 4 entries", () => {
    expect(HARD_REASONS.size).toBe(4);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm run test -- defect-detection`
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/lib/defect-detection.ts`:

```ts
import type { createUntypedAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createUntypedAdminClient>;

/**
 * French labels stored in `claims.reason`. Mapping is intentional:
 * these four indicate a factual defect of the lead itself. "Client déjà
 * contacté" is excluded — that's legitimate friction (client picked another
 * mover, unreachable, etc.) and doesn't mean the lead was bad.
 */
export const HARD_REASONS = new Set<string>([
  "Fausse demande",
  "Doublon",
  "Numéro invalide",
  "Client déjà déménagé",
]);

export const DEFECT_THRESHOLD = 4;

export function isHardReason(reason: string): boolean {
  return HARD_REASONS.has(reason);
}

export function shouldFlagDefect(hardClaimCount: number): boolean {
  return hardClaimCount >= DEFECT_THRESHOLD;
}

/**
 * After a new claim is filed, count hard-reason pending claims on the
 * underlying lead. If the count crosses the threshold and the lead isn't
 * already flagged/resolved, flag it and notify the admin.
 * Idempotent — calling twice won't create duplicate flags or notifications.
 */
export async function checkAndFlagDefectiveLead(
  admin: Admin,
  quoteRequestId: string
): Promise<{ flagged: boolean; count: number }> {
  const { data: distributions } = await admin
    .from("quote_distributions")
    .select("id")
    .eq("quote_request_id", quoteRequestId);

  const distIds = ((distributions || []) as Array<{ id: string }>).map((d) => d.id);
  if (distIds.length === 0) return { flagged: false, count: 0 };

  const { count: rawCount } = await admin
    .from("claims")
    .select("id", { count: "exact", head: true })
    .in("quote_distribution_id", distIds)
    .in("reason", Array.from(HARD_REASONS))
    .eq("status", "pending");

  const count = rawCount ?? 0;
  if (!shouldFlagDefect(count)) return { flagged: false, count };

  const { data: lead } = await admin
    .from("quote_requests")
    .select("defect_status")
    .eq("id", quoteRequestId)
    .single();

  if ((lead as { defect_status: string | null } | null)?.defect_status) {
    return { flagged: false, count };
  }

  await admin
    .from("quote_requests")
    .update({
      defect_status: "suspected",
      defect_flagged_at: new Date().toISOString(),
    })
    .eq("id", quoteRequestId);

  await admin.from("notifications").insert({
    type: "system",
    title: "Lead confirmé défectueux",
    body: `${count} signalements sur le même lead — validation requise`,
    data: { quoteRequestId, claimCount: count },
  });

  return { flagged: true, count };
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npm run test -- defect-detection`
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/defect-detection.ts src/lib/defect-detection.test.ts
git commit -m "feat(lib): collective lead defect detection helper"
```

---

## Task 3: Hook detection into claim creation

**Files:**
- Modify: `src/app/api/dashboard/claims/route.ts`

- [ ] **Step 1: Add imports**

At the top of `src/app/api/dashboard/claims/route.ts`, add to existing imports:

```ts
import { checkAndFlagDefectiveLead, isHardReason } from "@/lib/defect-detection";
```

- [ ] **Step 2: Call detection after claim insert**

After the `// Send confirmation email to mover + notify admin` block (around line 98) and before the final `return NextResponse.json({ success: true, claim });`, insert:

```ts
    // Collective defect detection — only for hard-reason claims.
    // Runs best-effort: failure should not break claim creation.
    if (claim && isHardReason(reason)) {
      try {
        const { data: dist } = await admin
          .from("quote_distributions")
          .select("quote_request_id")
          .eq("id", distributionId)
          .single();
        if (dist?.quote_request_id) {
          await checkAndFlagDefectiveLead(admin, dist.quote_request_id as string);
        }
      } catch (err) {
        console.error("[Claim] defect detection failed:", err);
      }
    }
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/claims/route.ts
git commit -m "feat(api): trigger defect detection on hard-reason claims"
```

---

## Task 4: Admin actions — accept_defect and reject_defect

**Files:**
- Modify: `src/app/api/admin/claims/route.ts`

- [ ] **Step 1: Add the accept_defect action**

In `src/app/api/admin/claims/route.ts`, inside the `POST` function, before the final `return NextResponse.json({ error: "Action inconnue" }, { status: 400 });` (or before the existing last branch — place it alongside the other `if (body.action === ...)` blocks):

```ts
  // Accept collective defect: refund all unlocked buyers + resolve all claims
  if (body.action === "accept_defect") {
    const quoteRequestId = body.quoteRequestId as string | undefined;
    if (!quoteRequestId) {
      return NextResponse.json({ error: "quoteRequestId requis" }, { status: 400 });
    }

    // 1. Find all unlocked distributions on this lead
    const { data: dists } = await supabase
      .from("quote_distributions")
      .select("id, company_id, price_cents")
      .eq("quote_request_id", quoteRequestId)
      .eq("status", "unlocked");

    const distributions = (dists || []) as Array<{ id: string; company_id: string; price_cents: number }>;
    if (distributions.length === 0) {
      return NextResponse.json({ error: "Aucune distribution à rembourser" }, { status: 400 });
    }

    // 2. Credit each mover's wallet for the amount they paid
    let refundedCount = 0;
    for (const d of distributions) {
      // Find the paid transaction for this distribution
      const { data: txn } = await supabase
        .from("transactions")
        .select("id, amount_cents")
        .eq("quote_distribution_id", d.id)
        .eq("status", "paid")
        .in("type", ["unlock", "lead_purchase"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const refundCents = (txn as { id: string; amount_cents: number } | null)?.amount_cents || d.price_cents;
      if (refundCents <= 0) continue;

      // Credit the wallet directly — this is a system-confirmed defect,
      // so we bypass the per-transaction percentage cap (which is for
      // discretionary "geste commercial" refunds).
      await supabase.from("wallet_transactions").insert({
        company_id: d.company_id,
        amount_cents: refundCents,
        type: "refund",
        reason: "Lead défectueux confirmé collectivement",
        quote_distribution_id: d.id,
        source_transaction_id: (txn as { id: string } | null)?.id || null,
      });

      // Mark source transaction as refunded (if exists)
      if ((txn as { id: string } | null)?.id) {
        await supabase
          .from("transactions")
          .update({ status: "refunded" })
          .eq("id", (txn as { id: string }).id);
      }

      // Notify the mover
      await supabase.from("notifications").insert({
        company_id: d.company_id,
        type: "refund",
        title: "Remboursement automatique",
        body: `Lead défectueux confirmé — ${(refundCents / 100).toFixed(2)} € crédités sur votre portefeuille`,
        data: { quoteRequestId, distributionId: d.id, amountCents: refundCents },
      });

      refundedCount += 1;
    }

    // 3. Resolve all pending claims on this lead's distributions
    const distIds = distributions.map((d) => d.id);
    await supabase
      .from("claims")
      .update({
        status: "approved",
        admin_note: "Lead défectueux confirmé collectivement",
        resolved_at: new Date().toISOString(),
      })
      .in("quote_distribution_id", distIds)
      .eq("status", "pending");

    // 4. Mark the lead as confirmed_refunded
    await supabase
      .from("quote_requests")
      .update({
        defect_status: "confirmed_refunded",
        defect_resolved_at: new Date().toISOString(),
        defect_resolved_by: "admin",
      })
      .eq("id", quoteRequestId);

    return NextResponse.json({ success: true, refundedCount });
  }

  // Reject collective defect: remove the flag, claims stay pending
  if (body.action === "reject_defect") {
    const quoteRequestId = body.quoteRequestId as string | undefined;
    if (!quoteRequestId) {
      return NextResponse.json({ error: "quoteRequestId requis" }, { status: 400 });
    }

    await supabase
      .from("quote_requests")
      .update({
        defect_status: "rejected",
        defect_resolved_at: new Date().toISOString(),
        defect_resolved_by: "admin",
      })
      .eq("id", quoteRequestId);

    return NextResponse.json({ success: true });
  }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/claims/route.ts
git commit -m "feat(api): admin accept/reject defect actions with collective refund"
```

---

## Task 5: Enrich GET /api/admin/claims with defectiveLeads

**Files:**
- Modify: `src/app/api/admin/claims/route.ts`

- [ ] **Step 1: Add defectiveLeads to the GET response**

In `src/app/api/admin/claims/route.ts`, the GET function currently returns `NextResponse.json(enriched)` — a plain array. Change it to return `{ claims, defectiveLeads }`:

Locate the final `return NextResponse.json(enriched);` of the GET function (around line 101). Replace it with:

```ts
  // Fetch suspected defective leads with their details + full claims breakdown
  const { data: defectLeads } = await supabase
    .from("quote_requests")
    .select("id, from_city, to_city, category, defect_flagged_at")
    .eq("defect_status", "suspected")
    .order("defect_flagged_at", { ascending: false });

  const defectLeadList = ((defectLeads || []) as Array<{
    id: string;
    from_city: string | null;
    to_city: string | null;
    category: string | null;
    defect_flagged_at: string;
  }>);

  const defectiveLeads = defectLeadList.map((lead) => {
    const leadClaims = enriched.filter(
      (c: Record<string, unknown>) =>
        c.quote_request_id === lead.id && c.status === "pending"
    );
    const reasonsBreakdown: Record<string, number> = {};
    for (const c of leadClaims) {
      const reason = (c as { reason: string }).reason;
      reasonsBreakdown[reason] = (reasonsBreakdown[reason] || 0) + 1;
    }
    const totalRefundCents = leadClaims.reduce(
      (sum, c) => sum + ((c as { amount_cents: number }).amount_cents || 0),
      0
    );
    return {
      quoteRequestId: lead.id,
      fromCity: lead.from_city,
      toCity: lead.to_city,
      category: lead.category,
      flaggedAt: lead.defect_flagged_at,
      reasonsBreakdown,
      totalRefundCents,
      claims: leadClaims.map((c) => ({
        id: (c as { id: string }).id,
        companyId: (c as { company_id: string }).company_id,
        companyName: (c as { company_name: string }).company_name,
        reason: (c as { reason: string }).reason,
        amountCents: (c as { amount_cents: number }).amount_cents,
      })),
    };
  });

  return NextResponse.json({ claims: enriched, defectiveLeads });
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/claims/route.ts
git commit -m "feat(api): return defectiveLeads summary on admin claims GET"
```

---

## Task 6: Update admin claims page to consume new response shape + show panel

**Files:**
- Modify: `src/app/admin/claims/page.tsx`

- [ ] **Step 1: Find where claims are fetched**

Look in `src/app/admin/claims/page.tsx` for the `fetch("/api/admin/claims")` call (it likely calls `.json()` and sets state with an array).

The previous shape was `Claim[]`. New shape is `{ claims: Claim[], defectiveLeads: DefectiveLead[] }`.

Update the type definitions and fetch logic. First, near the other interface definitions at the top of the file, add:

```ts
interface DefectiveLead {
  quoteRequestId: string;
  fromCity: string | null;
  toCity: string | null;
  category: string | null;
  flaggedAt: string;
  reasonsBreakdown: Record<string, number>;
  totalRefundCents: number;
  claims: Array<{
    id: string;
    companyId: string;
    companyName: string;
    reason: string;
    amountCents: number;
  }>;
}
```

- [ ] **Step 2: Add state for defectiveLeads**

Near other `useState` calls in the component (e.g. `useState<Claim[]>([])`), add:

```ts
  const [defectiveLeads, setDefectiveLeads] = useState<DefectiveLead[]>([]);
```

- [ ] **Step 3: Update the fetch function**

Find the fetch call. It looks like:
```ts
const res = await fetch("/api/admin/claims");
if (res.ok) setClaims(await res.json());
```

Replace with:
```ts
const res = await fetch("/api/admin/claims");
if (res.ok) {
  const data = await res.json();
  // Backward-compat: if the endpoint still returns an array, use it
  if (Array.isArray(data)) {
    setClaims(data);
    setDefectiveLeads([]);
  } else {
    setClaims(data.claims || []);
    setDefectiveLeads(data.defectiveLeads || []);
  }
}
```

- [ ] **Step 4: Add action handlers**

Near other action handlers (like `handleStatusUpdate`), add:

```ts
  async function handleAcceptDefect(quoteRequestId: string, claimCount: number) {
    if (!confirm(`Rembourser tous les ${claimCount} claims de ce lead ? Action définitive.`)) return;
    const res = await fetch("/api/admin/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept_defect", quoteRequestId }),
    });
    if (res.ok) {
      const d = await res.json();
      toast.success(`${d.refundedCount} remboursements effectués`);
      fetchClaims();
    } else {
      const err = await res.json();
      toast.error(err.error || "Erreur");
    }
  }

  async function handleRejectDefect(quoteRequestId: string) {
    if (!confirm("Refuser la détection collective ? Les claims resteront à traiter individuellement.")) return;
    const res = await fetch("/api/admin/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject_defect", quoteRequestId }),
    });
    if (res.ok) {
      toast.success("Détection refusée");
      fetchClaims();
    } else {
      toast.error("Erreur");
    }
  }
```

Note: the function that refetches claims may be named differently. If it's `loadClaims` or `fetchClaims`, use that name — find the existing fetch function and call it.

- [ ] **Step 5: Render the defective-leads panel**

Near the top of the page JSX (after the page title, before the main claims list), insert:

```tsx
      {defectiveLeads.length > 0 && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50/80 p-5 shadow-sm">
          <p className="text-base font-bold text-red-900">
            🚨 {defectiveLeads.length} lead{defectiveLeads.length > 1 ? "s" : ""} confirmé{defectiveLeads.length > 1 ? "s" : ""} défectueux — validation requise
          </p>
          <div className="mt-3 space-y-3">
            {defectiveLeads.map((lead) => (
              <div key={lead.quoteRequestId} className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold">
                  {lead.fromCity || "?"} → {lead.toCity || "?"}
                  {lead.category && <span className="ml-2 text-xs font-normal text-muted-foreground">{lead.category}</span>}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Flagué le {new Date(lead.flaggedAt).toLocaleString("fr-FR")}
                </p>
                <p className="mt-1 text-xs">
                  {lead.claims.length} signalements : {Object.entries(lead.reasonsBreakdown)
                    .map(([r, n]) => `${n} × ${r}`)
                    .join(" · ")}
                </p>
                <p className="mt-1 text-xs">
                  Remboursement total : <strong>{(lead.totalRefundCents / 100).toFixed(2)} €</strong>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Movers : {lead.claims.map((c) => c.companyName).join(", ")}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAcceptDefect(lead.quoteRequestId, lead.claims.length)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                  >
                    ✓ Rembourser tous
                  </button>
                  <button
                    onClick={() => handleRejectDefect(lead.quoteRequestId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    ✗ Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
```

Place this JSX block inside the main return, typically after the h2 title and before the claims table/grid.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/claims/page.tsx
git commit -m "feat(admin): defective-leads panel with accept/reject on claims page"
```

---

## Task 7: Admin dashboard counter

**Files:**
- Modify: `src/app/api/admin/stats/route.ts`
- Modify: `src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Add defectCount to stats API**

Open `src/app/api/admin/stats/route.ts`. Find the GET handler and its final `return NextResponse.json({...})`. Add a count of suspected defective leads.

Before the `return`, insert:

```ts
  const { count: defectCount } = await supabase
    .from("quote_requests")
    .select("id", { count: "exact", head: true })
    .eq("defect_status", "suspected");
```

Then add to the returned object:

```ts
    defectCount: defectCount ?? 0,
```

- [ ] **Step 2: Display counter on admin dashboard**

Open `src/app/admin/dashboard/page.tsx`. Find where `stats` are destructured or displayed.

Add a new conditional block in the dashboard UI (near other stat blocks). The exact location depends on the file layout — a good place is immediately after the main stats grid. Insert:

```tsx
            {(stats?.defectCount ?? 0) > 0 && (
              <Link
                href="/admin/claims"
                className="block rounded-xl border-2 border-red-300 bg-red-50 p-4 hover:bg-red-100"
              >
                <p className="text-sm font-semibold text-red-900">
                  🚨 {stats.defectCount} lead{stats.defectCount > 1 ? "s" : ""} défectueux à valider
                </p>
                <p className="mt-1 text-xs text-red-700">
                  Cliquez pour examiner et décider
                </p>
              </Link>
            )}
```

If `Link` isn't imported at the top, add:
```ts
import Link from "next/link";
```

If `stats` is typed with a strict interface, add `defectCount?: number;` to that interface.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/stats/route.ts src/app/admin/dashboard/page.tsx
git commit -m "feat(admin): defect count banner on dashboard"
```

---

## Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: 7 previous tests + 7 new defect-detection tests = 14 passing.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Manual scenario walkthrough**

Run: `npm run dev`

Seed test data (via psql/Supabase UI or real movers):
1. Create a lead + distribute to 5 movers, they all unlock and pay.
2. 3 movers file claims with reason `"Doublon"` → check `/admin/claims` → no red panel, no dashboard counter.
3. 4th mover files `"Fausse demande"` → refresh `/admin/claims` → red panel shows the lead with 4 claims; `/admin/dashboard` shows the red banner.
4. Click **Rembourser tous** → confirm → toast shows `4 remboursements effectués`. The 4 movers each get a wallet credit and an in-app notification. Lead's `defect_status` becomes `confirmed_refunded`. Red panel empties.
5. Second lead scenario: 4 hard claims → click **Refuser** → panel empties, claims remain `pending`, dashboard counter decrements.

- [ ] **Step 4: Cleanup commit if needed**

If any manual test revealed a tweak, commit it:
```bash
git add -A
git commit -m "fix: manual QA adjustments"
```
Otherwise skip.
