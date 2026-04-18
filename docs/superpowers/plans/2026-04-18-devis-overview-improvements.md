# Devis & Apercu Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add wallet balance card to `/apercu` sidebar and replace the flat lead list on `/demandes-de-devis` with a summary banner + tabs so movers can instantly see their purchase activity.

**Architecture:** Extend `/api/dashboard/overview` to return wallet balance (same pattern as `/api/dashboard/billing`). Update both dashboard pages to consume it. All changes are UI + data aggregation — no DB migration, no new backend logic.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-04-18-devis-overview-improvements-design.md`

---

## Task 1: Extend overview API with wallet balance

**Files:**
- Modify: `src/app/api/dashboard/overview/route.ts`

- [ ] **Step 1: Add import for wallet helper**

At the top of `src/app/api/dashboard/overview/route.ts`, add to existing imports:

```ts
import { getWalletBalanceCents } from "@/lib/wallet";
```

- [ ] **Step 2: Fetch wallet balance before the final return**

Just before the final `return NextResponse.json({...})` block (around line 239), insert:

```ts
  // Wallet (only populated when refunds feature is enabled)
  const { data: settingsRow } = await admin
    .from("site_settings")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  const settings = (settingsRow?.data || {}) as { refundsEnabled?: boolean };

  let walletBalanceCents = 0;
  if (settings.refundsEnabled) {
    walletBalanceCents = await getWalletBalanceCents(admin, company.id as string);
  }
```

- [ ] **Step 3: Include wallet in the JSON response**

In the `return NextResponse.json({...})` object, add a new key alongside `stats`, `leads`, `notifications`:

```ts
    wallet: {
      enabled: !!settings.refundsEnabled,
      balanceCents: walletBalanceCents,
    },
```

The final return should look like:
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
  });
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/dashboard/overview/route.ts
git commit -m "feat(api): add wallet balance to dashboard overview"
```

---

## Task 2: Wallet card in /apercu sidebar

**Files:**
- Modify: `src/app/(dashboard)/apercu/page.tsx`

- [ ] **Step 1: Add `Wallet` icon to lucide-react imports**

Locate the existing `lucide-react` import block (around line 11). Add `Wallet` to the list:

```tsx
import {
  FileText,
  Unlock,
  TrendingUp,
  Euro,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Lock,
  MapPin,
  Activity,
  Wallet,
} from "lucide-react";
```

- [ ] **Step 2: Extend the DashboardData interface**

In the `DashboardData` interface (around line 36), after the `notifications` field, add:

```ts
  wallet?: {
    enabled: boolean;
    balanceCents: number;
  };
```

- [ ] **Step 3: Insert the wallet card above "Statut du compte"**

In the sidebar (`<div className="space-y-4">` around line 401), the first child is the "Account status" `<Card>`. Insert the wallet card **as the first child**, before the Account status card:

```tsx
          {/* Wallet balance — only shown when refunds feature is enabled */}
          {data.wallet?.enabled && (
            <Card className="border-green-200 bg-green-50/40">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-4 w-4 text-[var(--brand-green)]" />
                  Mon portefeuille
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">Solde disponible</p>
                <p className="text-3xl font-bold text-[var(--brand-green-dark)]">
                  {formatPrice(data.wallet.balanceCents)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Utilisé automatiquement sur vos prochains achats de leads.
                </p>
                <Link
                  href="/facturation"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-green)] hover:underline"
                >
                  Voir les transactions <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          )}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/apercu/page.tsx"
git commit -m "feat(dashboard): add wallet balance card to overview sidebar"
```

---

## Task 3: Summary banner + tabs on /demandes-de-devis

**Files:**
- Modify: `src/app/(dashboard)/demandes-de-devis/page.tsx`

- [ ] **Step 1: Extend the Lead interface with `unlockedAt`**

In the `Lead` interface (around line 13), after `createdAt: string;` add:
```ts
  unlockedAt: string | null;
```

- [ ] **Step 2: Add `Card`, `CardContent` usage (already imported) — compute derived values**

Just after the existing `filtered` const (around line 73), add:

```tsx
  const unlocked = leads
    .filter((l) => l.status === "unlocked")
    .sort((a, b) => {
      const ta = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      const tb = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
      return tb - ta;
    });
  const pending = leads.filter((l) => l.status !== "unlocked");
  const totalSpentCents = unlocked.reduce((s, l) => s + l.priceCents, 0);
  const lastUnlocked = unlocked[0];
```

- [ ] **Step 3: Insert the summary banner right after the title block**

After the title `<motion.div>` (ends around line 94) and **before** the `<div className="flex gap-3">` search/filter row, insert:

```tsx
      {unlocked.length > 0 && lastUnlocked && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Achetés</p>
              <p className="mt-1 text-2xl font-bold">{unlocked.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Dépensé</p>
              <p className="mt-1 text-2xl font-bold">{formatPrice(totalSpentCents)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Dernier achat</p>
              <p className="mt-1 text-sm font-semibold truncate">
                {formatLeadRoute(lastUnlocked)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatDate(lastUnlocked.unlockedAt || lastUnlocked.createdAt)}
              </p>
            </CardContent>
          </Card>
          <Link
            href={`/demandes-de-devis/${lastUnlocked.distributionId}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 text-sm font-bold text-white shadow-md shadow-green-500/20 hover:brightness-110"
          >
            Voir mon dernier achat <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
```

- [ ] **Step 4: Replace the dropdown `<select>` with a tabs bar**

Find the existing search + select block (around line 96):
```tsx
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Rechercher par ville..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="all">Tous statuts</option>
          <option value="pending">Bloqués</option>
          <option value="unlocked">Débloqués</option>
        </select>
      </div>
```

Replace it with:
```tsx
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher par ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]"
        />
      </div>

      <div className="flex gap-1 border-b">
        {[
          { key: "all", label: `Tous (${leads.length})` },
          { key: "unlocked", label: `Achetés (${unlocked.length})` },
          { key: "pending", label: `Disponibles (${pending.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              filterStatus === tab.key
                ? "border-[var(--brand-green)] text-[var(--brand-green-dark)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
```

Important: the `filterStatus` state and its filtering logic already exist — only the UI control changes. The existing filter in `.filter((l) => { ... })` handles `all | unlocked | pending` correctly.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/demandes-de-devis/page.tsx"
git commit -m "feat(dashboard): summary banner + tabs on quotes page"
```

---

## Task 4: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run tests**

Run: `npm run test`
Expected: all 7 existing tests pass (sirene + utils — nothing new).

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: 0 errors.

- [ ] **Step 3: Manual verification — `/apercu` wallet**

Run: `npm run dev`

Log in as a mover with `refundsEnabled: true` in `site_settings.data` (set via admin). Open http://localhost:3000/apercu:
- The sidebar shows "Mon portefeuille" card with balance, above "Statut du compte".

Log in (or change settings) with `refundsEnabled: false`:
- The wallet card is absent, no empty slot visible.

- [ ] **Step 4: Manual verification — `/demandes-de-devis` summary + tabs**

Open http://localhost:3000/demandes-de-devis as a mover:
- With 0 unlocked leads: no summary banner, tabs `Tous (N) / Achetés (0) / Disponibles (N)` visible.
- With ≥ 1 unlocked lead: summary banner with 3 cards (Achetés / Dépensé / Dernier achat) and a green "Voir mon dernier achat" button. Click → opens `/demandes-de-devis/{distributionId}` of the most recent purchase.
- Clicking on a tab changes the filter, list updates, and counters match the number of displayed cards.

- [ ] **Step 5: Final commit if anything drifted**

If any small fix was needed during manual QA:
```bash
git add -A
git commit -m "fix: address manual QA findings"
```

If nothing changed, skip.
