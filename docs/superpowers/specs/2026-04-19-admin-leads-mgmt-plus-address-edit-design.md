# Admin `/admin/leads` management + mover address edit

**Date**: 2026-04-19
**Statut**: spec validée

## Contexte

**`/admin/leads`** : la page a des filtres riches mais aucune pagination (page inexploitable au-delà de ~50 leads), aucune visibilité sur les leads flagués défectueux par le système (feature livrée le 2026-04-19), et aucune action de modération rapide (bloquer / supprimer en masse).

**`/profil-entreprise`** : l'adresse de l'entreprise (address / postal_code / city) est affichée en lecture seule. Le mover ne peut pas la corriger sans demander à l'admin.

## Objectif

1. `/admin/leads` : pagination 20/page, badge `defect_status` visible, filtre "Uniquement défectueux", actions bulk (cases à cocher + barre d'actions : Bloquer / Débloquer / Supprimer / CSV), action individuelle (menu 3 points).
2. `/profil-entreprise` : édition in-place de l'adresse avec autocomplete Mapbox + bouton "Remplir depuis INSEE".

## Décisions de design

| # | Question | Décision |
|---|----------|----------|
| 1 | Scope | Toutes les améliorations (pagination + badge defect + bulk + bloquer) |
| 2 | Bulk UI | Cases à cocher + barre actions au-dessus du tableau + menu 3 points individuel |
| 3 | Défectueux UI | Badge rouge à côté du prospect_id + filtre rapide "Uniquement défectueux" |
| 4 | Édition adresse | Autocomplete Mapbox + bouton "Remplir depuis INSEE" |

## Architecture

### 1. Backend

#### `/api/admin/leads` (POST) — 3 nouvelles actions

```ts
// Bulk block
if (body.action === "bulk_block") {
  const ids = (body.ids || []) as string[];
  if (ids.length === 0) return NextResponse.json({ error: "IDs requis" }, { status: 400 });
  const { error } = await supabase
    .from("quote_requests")
    .update({ status: "blocked" })
    .in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, count: ids.length });
}

// Bulk unblock (set to "new" or "active" depending on whether the lead was distributed)
if (body.action === "bulk_unblock") {
  const ids = (body.ids || []) as string[];
  if (ids.length === 0) return NextResponse.json({ error: "IDs requis" }, { status: 400 });
  // Fetch to decide target status per lead
  const { data: leads } = await supabase
    .from("quote_requests")
    .select("id, distributed_at")
    .in("id", ids);
  const typed = (leads || []) as Array<{ id: string; distributed_at: string | null }>;
  for (const l of typed) {
    await supabase
      .from("quote_requests")
      .update({ status: l.distributed_at ? "active" : "new" })
      .eq("id", l.id);
  }
  return NextResponse.json({ success: true, count: typed.length });
}

// Bulk delete — reuse existing single-delete logic
if (body.action === "bulk_delete") {
  const ids = (body.ids || []) as string[];
  if (ids.length === 0) return NextResponse.json({ error: "IDs requis" }, { status: 400 });
  await supabase.from("quote_distributions").delete().in("quote_request_id", ids);
  await supabase.from("claims").delete().in("quote_distribution_id",
    ((await supabase.from("quote_distributions").select("id").in("quote_request_id", ids)).data || []).map((d: { id: string }) => d.id)
  );
  const { error } = await supabase.from("quote_requests").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, count: ids.length });
}
```

Note: cascade delete of `quote_distributions` is handled first; claim cleanup is best-effort (claim rows may remain but `quote_distribution_id` will have `ON DELETE SET NULL` per schema — safe).

#### `/api/admin/leads` (GET) — add `defect_status`

Find the existing `.select(...)` on `quote_requests` and add `defect_status, defect_flagged_at` to the list.

#### `/api/dashboard/profile` (POST)

**1. Add `address`, `postal_code`, `city` to `allowedFields`:**

```ts
const allowedFields = [
  "description",
  "phone",
  "email_contact",
  "website",
  "employee_count",
  "address",
  "postal_code",
  "city",
];
```

**2. New action `sync_address_from_insee`:**

```ts
if (body.action === "sync_address_from_insee") {
  const siretValue = (company.siret as string) || "";
  if (!siretValue) return NextResponse.json({ error: "SIRET manquant" }, { status: 400 });
  const result = await verifySiret(siretValue);
  if (!result) return NextResponse.json({ error: "SIRET introuvable à l'INSEE" }, { status: 404 });
  const { data, error } = await admin.from("companies").update({
    address: result.address,
    postal_code: result.postalCode,
    city: result.city,
  }).eq("id", company.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

### 2. Frontend `/admin/leads`

**Type `Lead` :** ajouter `defect_status: string | null`.

**Nouveaux états dans le composant :**

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [page, setPage] = useState(1);
const [filterDefect, setFilterDefect] = useState(false);
const ITEMS_PER_PAGE = 20;
```

Reset `page` + `selectedIds` quand un filtre change.

**Pipeline de filtrage** : l'existant + :

```ts
.filter((l) => !filterDefect || l.defect_status === "suspected")
```

**Pagination** : `paginated = filtered.slice((page-1)*20, page*20)`.

**UI table** :
- Nouvelle **colonne case à cocher** en tête (toggle all visible) + par ligne.
- Dans la colonne `Lead` (prospect_id) : ajouter un badge rouge si `defect_status === "suspected"` :
  ```tsx
  {lead.defect_status === "suspected" && (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
      🚨 Défectueux
    </span>
  )}
  ```
- Ajouter un **bouton toggle** dans la barre de filtres : "Uniquement défectueux (N)" qui bascule `filterDefect`.
- Ajouter un **menu 3 points** dans la colonne actions avec `Bloquer / Débloquer / Supprimer`.
- **Barre d'actions bulk** affichée au-dessus du tableau quand `selectedIds.size > 0` :
  ```
  {N} sélectionnés · [Bloquer] [Débloquer] [Supprimer] [Exporter CSV]  [×]
  ```
- **Pagination controls** en bas : Précédent / Page X / Y / Suivant + compteur "X-Y de Z".

**Handlers** :

```tsx
async function bulkAction(action: "bulk_block" | "bulk_unblock" | "bulk_delete") {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;
  if (action === "bulk_delete" && !confirm(`Supprimer ${ids.length} lead(s) ? Action définitive.`)) return;
  const res = await fetch("/api/admin/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ids }),
  });
  if (res.ok) {
    const d = await res.json();
    toast.success(`${d.count} lead(s) traités`);
    setSelectedIds(new Set());
    fetchLeads();
  } else {
    toast.error("Erreur");
  }
}

function toggleSelect(id: string) {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}

function toggleSelectAll() {
  if (paginated.every((l) => selectedIds.has(l.id))) {
    // all selected → clear those on current page
    setSelectedIds((prev) => {
      const next = new Set(prev);
      paginated.forEach((l) => next.delete(l.id));
      return next;
    });
  } else {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      paginated.forEach((l) => next.add(l.id));
      return next;
    });
  }
}
```

### 3. Frontend `/profil-entreprise` — édition adresse

**Nouveaux états** :
```tsx
const [editingAddress, setEditingAddress] = useState(false);
const [addressForm, setAddressForm] = useState({
  address: "",
  postal_code: "",
  city: "",
});
const [savingAddress, setSavingAddress] = useState(false);
const [syncingSireneAddress, setSyncingSireneAddress] = useState(false);
```

**Init du form quand on passe en mode édition** :
```tsx
function startEditAddress() {
  setAddressForm({
    address: company.address || "",
    postal_code: company.postal_code || "",
    city: company.city || "",
  });
  setEditingAddress(true);
}
```

**UI de la carte "Localisation"** :
- Mode lecture : les 3 champs actuels + un bouton `✏ Modifier adresse` à droite.
- Mode édition :
  - Bouton "Remplir depuis INSEE" en haut (pre-fill automatique)
  - `AddressAutocomplete` pour l'adresse (ré-utilise `src/components/ui/address-autocomplete.tsx`, `searchAddresses={true}`)
  - Deux inputs compacts `CP` et `Ville` sur une ligne en dessous (pour correction si l'autocomplete rate une partie)
  - Boutons `Annuler` / `Enregistrer`
- Onglet `AddressAutocomplete.onSelect` met à jour les 3 champs d'un coup via les données Mapbox.

**Handlers** :
```tsx
async function saveAddress() {
  setSavingAddress(true);
  try {
    const res = await fetch("/api/dashboard/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addressForm),
    });
    if (res.ok) {
      toast.success("Adresse mise à jour");
      setEditingAddress(false);
      fetchProfile();
    } else {
      const d = await res.json();
      toast.error(d.error || "Erreur");
    }
  } finally {
    setSavingAddress(false);
  }
}

async function syncAddressFromInsee() {
  setSyncingSireneAddress(true);
  try {
    const res = await fetch("/api/dashboard/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync_address_from_insee" }),
    });
    if (res.ok) {
      const data = await res.json();
      setAddressForm({
        address: data.address || "",
        postal_code: data.postal_code || "",
        city: data.city || "",
      });
      toast.success("Adresse récupérée depuis INSEE");
      fetchProfile();
    } else {
      const d = await res.json();
      toast.error(d.error || "Erreur");
    }
  } finally {
    setSyncingSireneAddress(false);
  }
}
```

## Tests

Pas de nouveaux tests unitaires (UI + CRUD trivial, helpers existants déjà éprouvés).

## Vérification

- `npm run build` → 0 erreur.
- `npm run test` → 14 tests existants passent.
- Test manuel :
  1. `/admin/leads` : pagination visible dès ≥ 21 leads, navigation OK.
  2. Cocher 3 leads → barre bulk → **Bloquer** → leurs `status` passent à `blocked`.
  3. Toggle "Uniquement défectueux" → liste filtrée, badge rouge visible.
  4. Menu 3 points individuel : Bloquer / Débloquer / Supprimer.
  5. Reset filtres → page repasse à 1, `selectedIds` se vide.
  6. `/profil-entreprise` : clic **✏ Modifier adresse** → mode édition.
  7. Tape une adresse → suggestions Mapbox → sélection remplit les 3 champs.
  8. Clic **Remplir depuis INSEE** → form pré-rempli.
  9. Enregistrer → toast succès, retour en mode lecture avec la nouvelle adresse.

## Hors scope

- Sélection qui persiste entre pages paginées (évite la confusion "j'ai coché 5 sur 3 pages différentes").
- Export CSV = leads sélectionnés seulement (le bouton CSV de la barre bulk exporte les lignes cochées, pas les filtrées).
- Autocomplete de ville seule (composant gère déjà address vs city, on n'utilise que `searchAddresses={true}`).
- Bloquer automatiquement les leads défectueux confirmés (garde le choix manuel).
