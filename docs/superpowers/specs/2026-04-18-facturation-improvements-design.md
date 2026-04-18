# Améliorations `/facturation`

**Date**: 2026-04-18
**Statut**: spec validée

## Contexte

La page `/facturation` (déménageur) affiche déjà un wallet, un résumé du mois, un plan d'abonnement et un historique de transactions. Cinq problèmes UX :
1. Bouton « Changer de forfait » non câblé (action morte).
2. Aucune pagination sur l'historique — page très longue dès quelques dizaines de transactions.
3. Pas de recherche ni de filtre par période.
4. Pas d'export CSV (les admins l'ont, pas les déménageurs).
5. Pas de total annuel — uniquement le mensuel, peu utile pour la comptabilité.

## Objectif

Améliorer l'usabilité de `/facturation` pour un déménageur qui veut suivre sa comptabilité, retrouver une transaction précise, et exporter ses données.

## Décisions de design

| # | Question | Décision |
|---|----------|----------|
| 1 | Bouton « Changer de forfait » | **Supprimer** (pas de système multi-plan aujourd'hui) |
| 2 | Pagination | Classique 20/page (Précédent/Suivant + compteur) |
| 3a | Filtres recherche | Champ texte (description / N° facture / ID Mollie) + sélecteur période (Tout / 7j / 30j / 90j / Cette année) |
| 3b | Export CSV | Bouton à côté du titre, exporte les transactions filtrées |
| 3c | Total annuel | Nouvelle ligne dans la carte « Résumé » |

## Architecture

### 1. API `/api/dashboard/billing`

Étendre le bloc `summary` retourné :

```ts
summary: {
  totalCents,           // existant : total mois
  subscriptionCents,    // existant
  unlockCents,          // existant
  yearTotalCents,       // NOUVEAU : total année courante
}
```

**Calcul `yearTotalCents`** : même règle que `totalCents` mois (somme des transactions `paid` avec `amount_cents > 0`, dédupliquées par `quote_distribution_id` quand présent), mais filtrées sur l'année courante (`new Date(t.created_at).getFullYear() === new Date().getFullYear()`).

Réutiliser le même `seenDistributions` pattern qui existe déjà dans la route. Itérer une seule fois sur `transactions` (déjà chargées) pour calculer mois + année simultanément.

### 2. UI changements `src/app/(dashboard)/facturation/page.tsx`

#### Carte « Abonnement actuel »
Supprimer le bouton :
```tsx
<Button variant="outline" size="sm" className="w-full gap-1.5">
  <ArrowUpRight className="h-3.5 w-3.5" />
  Changer de forfait
</Button>
```

#### Carte « Résumé du mois » → renommée « Résumé »
Titre du `CardTitle` passe à `Résumé`. Ajouter une 2e ligne **avant** le `<Separator />` :

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
```

#### Carte « Historique des transactions »

**Nouveau état (en haut du composant)** :
```tsx
const [search, setSearch] = useState("");
const [periodFilter, setPeriodFilter] = useState<"all" | "7d" | "30d" | "90d" | "year">("all");
const [page, setPage] = useState(1);
const ITEMS_PER_PAGE = 20;
```

**Reset page** quand `search`, `periodFilter`, ou `statusFilter` change :
```tsx
useEffect(() => { setPage(1); }, [search, periodFilter, statusFilter]);
```

**Pipeline filtré** (remplace les `transactions.filter((t) => statusFilter === "all" || ...)` répétés) :

```ts
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

**Header de la carte** : ajouter le bouton CSV à droite du titre.

**Nouvelle barre de recherche/période** placée au-dessus de la barre de status existante :

```tsx
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
```

**Tableau et liste mobile** : remplacer `transactions.filter((t) => statusFilter === "all" || t.status === statusFilter).map(...)` par `paginated.map(...)`.

**Pagination** (sous le tableau / sous les cards mobile) :

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

Ajouter les imports : `Search`, `ChevronLeft`, `ChevronRight` depuis `lucide-react`.

#### Export CSV

Le helper existant `downloadCSV` (`src/lib/csv-export.ts`) est utilisé partout dans `/admin`. Le réutiliser tel quel.

Bouton dans le `CardHeader` :
```tsx
<CardHeader className="flex flex-row items-center justify-between">
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

Ajouter import `downloadCSV` depuis `@/lib/csv-export`.

`Download` est déjà importé.

## Tests & vérification

Pas de nouveaux tests unitaires — changements UI + filter/reduce. Les helpers `formatPrice`, `formatDate`, `downloadCSV` sont déjà éprouvés.

Vérification :
- `npm run build` → 0 erreur.
- `npm run test` → 7 tests existants passent.
- Test manuel :
  1. Bouton « Changer de forfait » absent.
  2. Carte Résumé affiche mois + année.
  3. Filtrer statut « Payé » + période « 30 jours » + recherche « FAC-2026 » → résultats croisés.
  4. Avec ≥ 21 transactions : pagination affichée, navigation OK, compteurs cohérents.
  5. « Exporter CSV » → télécharge un CSV avec uniquement les transactions filtrées (et triées comme à l'écran).
  6. Reset filtres → page repasse à 1.

## Hors scope

- Filtre par montant min/max.
- Export PDF récapitulatif annuel.
- Re-essayer un paiement échoué (retry button).
- Modification de `/api/dashboard/billing` au-delà de l'ajout de `yearTotalCents`.
