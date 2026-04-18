# Améliorations `/demandes-de-devis` et `/apercu`

**Date**: 2026-04-18
**Statut**: spec validée

## Contexte

- **`/demandes-de-devis`** — liste plate avec un simple filtre dropdown. Le déménageur a du mal à distinguer rapidement ses leads déjà achetés de ceux encore disponibles, et ne voit pas en un coup d'œil son activité d'achat.
- **`/apercu`** — ne montre pas le solde du portefeuille. Le solde n'apparaît que sur `/facturation`, ce qui est un détour inutile pour le déménageur.

## Objectif

1. Sur `/demandes-de-devis` : afficher un bandeau résumé (achats totaux, dépense totale, dernier achat + bouton CTA) et remplacer le dropdown par des onglets `Tous / Achetés / Disponibles` avec compteurs.
2. Sur `/apercu` : ajouter une carte « Mon portefeuille — Solde disponible » dans la sidebar droite, au-dessus de « Statut du compte ».

## Décisions de design

| # | Question | Décision |
|---|----------|----------|
| 1 | Séparer bought vs not bought sur `/demandes-de-devis` | Onglets + bandeau résumé |
| 2 | Placement de la carte portefeuille sur `/apercu` | Sidebar droite (au-dessus de « Statut du compte ») |
| 3 | Contenu du bandeau résumé | 3 mini-cartes + bouton « Voir mon dernier achat » |

## Architecture

### 1. API `/api/dashboard/overview`

Ajouter le solde du portefeuille à la réponse, en suivant le pattern existant de `/api/dashboard/billing`:

```ts
wallet: {
  enabled: boolean,
  balanceCents: number,
}
```

Logique serveur :
- Lire `site_settings.data.refundsEnabled`.
- Si activé → appeler `getWalletBalanceCents(admin, company.id)` depuis `@/lib/wallet`.
- Sinon → `{ enabled: false, balanceCents: 0 }`.

L'historique des transactions wallet n'est PAS renvoyé ici (on veut une réponse compacte pour le dashboard — l'historique reste sur `/facturation`).

### 2. `/apercu` — carte portefeuille

Dans `src/app/(dashboard)/apercu/page.tsx` :

- Étendre l'interface `DashboardData` :
  ```ts
  wallet?: { enabled: boolean; balanceCents: number };
  ```
- Ajouter l'import `Wallet` depuis `lucide-react`.
- Dans la sidebar droite (`<div className="space-y-4">` autour de la ligne 401), au-dessus de la carte « Statut du compte », insérer :

```tsx
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

Si `wallet.enabled === false`, la carte n'apparaît pas (pas de trou visible).

### 3. `/demandes-de-devis` — bandeau résumé + onglets

Dans `src/app/(dashboard)/demandes-de-devis/page.tsx` :

#### Extension de l'interface `Lead`

L'API `/api/dashboard/overview` renvoie déjà `unlockedAt` sur chaque lead (voir `overview/route.ts` ligne 101). Ajouter ce champ à l'interface `Lead` locale :

```ts
interface Lead {
  // ... champs existants ...
  unlockedAt: string | null;
}
```

#### Calculs dérivés (dans le composant)

```ts
const unlocked = leads
  .filter((l) => l.status === "unlocked")
  .sort((a, b) => {
    const ta = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
    const tb = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
    return tb - ta;
  });
const pending = leads.filter((l) => l.status !== "unlocked");
const totalSpentCents = unlocked.reduce((s, l) => s + l.priceCents, 0);
const lastUnlocked = unlocked[0]; // plus récent par unlockedAt
```

#### Bandeau résumé (sous le titre, avant la barre de recherche)

Conditionnel — ne s'affiche que si `unlocked.length > 0` :

```tsx
{unlocked.length > 0 && (
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

Import à ajouter : `ArrowRight` depuis `lucide-react` (déjà importé dans le fichier).

#### Onglets (remplacent le dropdown `<select>`)

Supprimer le `<select value={filterStatus}>...</select>` et le remplacer par une barre d'onglets sous la barre de recherche :

```tsx
<div className="relative flex-1">
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

La logique de filtrage existante (`if (filterStatus === "unlocked" && l.status !== "unlocked") return false;`) fonctionne sans modification.

La structure responsive :
- Mobile : la `div.flex` wrapping `<input>` devient simple (pas besoin du `flex gap-3`).
- Desktop : la barre de recherche prend 100% de la largeur sur sa propre ligne, puis les onglets en dessous.

## Tests & vérification

Pas de nouveaux tests unitaires — les changements sont UI + simples `filter`/`reduce`. Les helpers utilisés (`formatPrice`, `formatDate`, `formatLeadRoute`) sont triviaux ou déjà couverts.

Vérification :
- `npm run build` → 0 erreur.
- `npm run test` → 7 tests existants passent.
- Test manuel :
  1. `/apercu` avec wallet activé → carte portefeuille visible, solde correct.
  2. `/apercu` avec wallet désactivé (`refundsEnabled: false`) → carte absente.
  3. `/demandes-de-devis` avec 0 achat → pas de bandeau, onglets visibles.
  4. `/demandes-de-devis` avec ≥ 1 achat → bandeau 3 cartes + bouton CTA. Clic CTA ouvre `/demandes-de-devis/{distributionId}` du dernier achat.
  5. Clic sur onglets → filtre change, compteurs cohérents avec le nombre de cartes affichées.

## Hors scope

- Groupement des leads « par semaine » ou « par mois » dans la liste.
- Graphique ou timeline des achats sur `/demandes-de-devis`.
- Affichage de l'historique des transactions wallet sur `/apercu` (reste sur `/facturation`).
- Carte « Mon portefeuille » sur mobile en version pleine largeur différente (la sidebar passe naturellement en dessous sur mobile via la grille `lg:grid-cols-3`).
