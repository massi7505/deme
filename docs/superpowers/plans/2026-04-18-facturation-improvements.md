# Facturation Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `/facturation` UX — remove dead button, add annual total, search + period filter, pagination, and CSV export.

**Architecture:** Pure UI + small API summary extension. No DB changes, no new dependencies. Reuses existing `downloadCSV` helper and existing pagination pattern from `/demandes-de-devis`.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-04-18-facturation-improvements-design.md`

---

## Task 1: Add `yearTotalCents` to billing API

**Files:**
- Modify: `src/app/api/dashboard/billing/route.ts`

- [ ] **Step 1: Compute year total alongside month total**

In `src/app/api/dashboard/billing/route.ts`, find the section starting with `// Calculate monthly summary` (around line 49). After the existing `firstOfMonth` constant, add:

```ts
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
```

- [ ] **Step 2: Compute paid year transactions**

Right after the `thisMonthPaid` const, add:

```ts
  const thisYearPaid = (transactions || []).filter(
    (t: Record<string, unknown>) =>
      t.status === "paid" &&
      (t.created_at as string) >= startOfYear &&
      (t.amount_cents as number) > 0
  );
```

- [ ] **Step 3: Compute year total (deduplicated like month)**

After the `unlockTotal` block (which finishes deduplicating monthly distributions), add:

```ts
  // Year total — same dedup rule as month
  const seenYearDistributions = new Set<string>();
  let yearTotal = 0;
  for (const t of thisYearPaid) {
    if (t.type === "subscription") {
      yearTotal += (t.amount_cents as number) || 0;
      continue;
    }
    if (t.type !== "unlock" && t.type !== "lead_purchase") continue;
    const distId = t.quote_distribution_id as string;
    if (distId && seenYearDistributions.has(distId)) continue;
    if (distId) seenYearDistributions.add(distId);
    yearTotal += (t.amount_cents as number) || 0;
  }
```

- [ ] **Step 4: Add yearTotalCents to the response**

In the `return NextResponse.json({...})` block, locate the `summary` object:

```ts
    summary: {
      totalCents: subscriptionTotal + unlockTotal,
      subscriptionCents: subscriptionTotal,
      unlockCents: unlockTotal,
    },
```

Change it to:
```ts
    summary: {
      totalCents: subscriptionTotal + unlockTotal,
      subscriptionCents: subscriptionTotal,
      unlockCents: unlockTotal,
      yearTotalCents: yearTotal,
    },
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/dashboard/billing/route.ts
git commit -m "feat(api): add yearTotalCents to billing summary"
```

---

## Task 2: Update Summary interface + display year total

**Files:**
- Modify: `src/app/(dashboard)/facturation/page.tsx`

- [ ] **Step 1: Extend Summary interface**

In `src/app/(dashboard)/facturation/page.tsx`, locate the `Summary` interface (around line 65-71). Change it to:

```ts
interface Summary {
  totalCents: number;
  subscriptionCents: number;
  unlockCents: number;
  yearTotalCents: number;
}
```

- [ ] **Step 2: Rename CardTitle and add year total**

Find the "Résumé du mois" card (around line 296). Inside its `<CardTitle>`, change:
```tsx
                Résumé du mois
```
to:
```tsx
                Résumé
```

- [ ] **Step 3: Insert year total below month total**

In the same card's `<CardContent>`, find this block:
```tsx
              <div>
                <p className="text-xs text-muted-foreground">
                  Total dépensé ce mois
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {formatPrice(summary?.totalCents || 0)}
                </p>
              </div>
              <Separator />
```

Change it to:
```tsx
              <div>
                <p className="text-xs text-muted-foreground">
                  Total dépensé ce mois
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {formatPrice(summary?.totalCents || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Total dépensé en {new Date().getFullYear()}
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatPrice(summary?.yearTotalCents || 0)}
                </p>
              </div>
              <Separator />
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/facturation/page.tsx"
git commit -m "feat(facturation): show annual total in summary card"
```

---

## Task 3: Remove dead "Changer de forfait" button

**Files:**
- Modify: `src/app/(dashboard)/facturation/page.tsx`

- [ ] **Step 1: Delete the button**

In `src/app/(dashboard)/facturation/page.tsx`, find the "Abonnement actuel" card (around line 261). Inside its `<CardContent>`, locate and delete this block entirely:

```tsx
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Changer de forfait
              </Button>
```

- [ ] **Step 2: Remove `ArrowUpRight` from imports if no other usage**

Run a quick check from the project root: search for other usages of `ArrowUpRight` in this file.

If `ArrowUpRight` is no longer used in `facturation/page.tsx` after step 1 (search the full file), remove it from the `lucide-react` import block at the top (around line 22-32). Otherwise leave it.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors. (If `ArrowUpRight` removal triggered a different file's lint, restore it — only this file matters.)

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/facturation/page.tsx"
git commit -m "chore(facturation): remove dead 'Changer de forfait' button"
```

---

## Task 4: Add search field + period filter + filter pipeline

**Files:**
- Modify: `src/app/(dashboard)/facturation/page.tsx`

- [ ] **Step 1: Add new state hooks**

In the component (right after `const [statusFilter, setStatusFilter] = useState<string>("all");` around line 98), add:

```tsx
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "7d" | "30d" | "90d" | "year">("all");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
```

- [ ] **Step 2: Add reset-page useEffect**

After the existing `useEffect` that calls `fetchBilling` (around line 118), add:

```tsx
  useEffect(() => {
    setPage(1);
  }, [search, periodFilter, statusFilter]);
```

- [ ] **Step 3: Compute the filter+pagination pipeline**

Just after `if (loading) { ... }` early return (around line 128), and **before** the `return (` of the page JSX, add:

```tsx
  const filtered = transactions
    .filter((t) => statusFilter === "all" || t.status === statusFilter)
    .filter((t) => {
      if (periodFilter === "all") return true;
      if (periodFilter === "year") {
        return new Date(t.created_at).getFullYear() === new Date().getFullYear();
      }
      const days = ({ "7d": 7, "30d": 30, "90d": 90 } as const)[periodFilter];
      return new Date(t.created_at).getTime() >= Date.now() - days * 86400000;
    })
    .filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (t.description || "").toLowerCase().includes(q) ||
        (t.invoice_number || "").toLowerCase().includes(q) ||
        (t.mollie_payment_id || "").toLowerCase().includes(q)
      );
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
```

- [ ] **Step 4: Add `Search` and `ChevronLeft` / `ChevronRight` to imports**

In the `lucide-react` import block at the top (around line 22-32), add `Search`, `ChevronLeft`, `ChevronRight`:
```tsx
import {
  Receipt,
  CreditCard,
  Calendar,
  Download,
  Euro,
  CheckCircle2,
  Clock,
  Loader2,
  FileX,
  Wallet,
  ArrowDownLeft,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
```

(Note: `ArrowUpRight` may have been removed in Task 3 — keep that removal. The list above assumes Task 3 already ran. If `ArrowUpRight` is still present, leave it.)

- [ ] **Step 5: Insert search + period bar above status filter**

Find the existing status filter block in the "Historique des transactions" card. It starts with `{/* Status filter */}` and `{transactions.length > 0 && (` (around line 354). **Just before** that block, insert:

```tsx
            {transactions.length > 0 && (
              <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Rechercher (description, N° facture, ID Mollie)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]"
                  />
                </div>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as "all" | "7d" | "30d" | "90d" | "year")}
                  className="rounded-lg border bg-white px-3 py-2 text-sm"
                >
                  <option value="all">Toutes périodes</option>
                  <option value="7d">7 derniers jours</option>
                  <option value="30d">30 derniers jours</option>
                  <option value="90d">90 derniers jours</option>
                  <option value="year">Cette année</option>
                </select>
              </div>
            )}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/facturation/page.tsx"
git commit -m "feat(facturation): add search and period filter on transactions"
```

---

## Task 5: Use paginated list + add pagination controls

**Files:**
- Modify: `src/app/(dashboard)/facturation/page.tsx`

- [ ] **Step 1: Replace desktop table iteration**

Find the `<TableBody>` block (around line 403). The current code is:
```tsx
                    <TableBody>
                      {transactions.filter((t) => statusFilter === "all" || t.status === statusFilter).map((txn) => {
```

Change it to:
```tsx
                    <TableBody>
                      {paginated.map((txn) => {
```

- [ ] **Step 2: Replace mobile list iteration**

Find the mobile cards block (around line 492). The current code is:
```tsx
                <div className="space-y-3 md:hidden">
                  {transactions.filter((t) => statusFilter === "all" || t.status === statusFilter).map((txn) => {
```

Change it to:
```tsx
                <div className="space-y-3 md:hidden">
                  {paginated.map((txn) => {
```

- [ ] **Step 3: Insert pagination controls after the mobile cards block**

Find the closing `</div>` of the mobile cards block (the `<div className="space-y-3 md:hidden">...</div>`). It's followed by the closing `</>` of the `transactions.length === 0 ? ... : (...)` ternary.

**Just before that closing `</>`** (i.e., after the mobile `</div>`), insert:

```tsx
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Précédent
                      </Button>
                      <span className="px-2 text-sm font-medium">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="gap-1"
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/facturation/page.tsx"
git commit -m "feat(facturation): paginate transaction history (20/page)"
```

---

## Task 6: Add CSV export button

**Files:**
- Modify: `src/app/(dashboard)/facturation/page.tsx`

- [ ] **Step 1: Add downloadCSV import**

At the top of the file, after the existing `import { cn, formatDate, formatPrice } from "@/lib/utils";` (line ~16), add:
```tsx
import { downloadCSV } from "@/lib/csv-export";
```

- [ ] **Step 2: Convert transactions card header to flex layout with CSV button**

Find the "Historique des transactions" card header (around line 345). Currently:
```tsx
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-[var(--brand-green)]" />
              Historique des transactions
            </CardTitle>
          </CardHeader>
```

Change to:
```tsx
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-[var(--brand-green)]" />
              Historique des transactions
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={filtered.length === 0}
              onClick={() => {
                const rows = filtered.map((t) => ({
                  Date: formatDateTime(t.created_at),
                  Type: t.type,
                  Description: t.description || "",
                  Montant: (Math.abs(t.amount_cents) / 100).toFixed(2),
                  Statut: t.status,
                  "N° facture": t.invoice_number || "",
                }));
                downloadCSV(rows, "transactions");
              }}
            >
              <Download className="h-3.5 w-3.5" /> Exporter CSV
            </Button>
          </CardHeader>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/facturation/page.tsx"
git commit -m "feat(facturation): export filtered transactions as CSV"
```

---

## Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run tests**

Run: `npm run test`
Expected: 7 tests pass.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`

On `/facturation`:
- "Changer de forfait" button absent.
- "Résumé" card shows 2 totals (mois + année).
- Search bar + period select visible above status filters when ≥ 1 transaction.
- Type "FAC-2026" → list narrows.
- Pick "30 derniers jours" + status "Payé" → list narrows further.
- With ≥ 21 transactions: pagination shown ("X-Y de Z" + Précédent/Suivant). Navigation works.
- "Exporter CSV" downloads a file with the currently filtered set (not the entire history).
- Reset filters → page jumps back to 1.

- [ ] **Step 4: Final commit if any drift**

If anything was off:
```bash
git add -A
git commit -m "fix: address manual QA findings"
```

Otherwise skip.
