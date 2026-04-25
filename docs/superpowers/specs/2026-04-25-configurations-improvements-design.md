# /configurations — refonte pro-grade

**Date** : 2026-04-25
**Statut** : Spec validé, prêt pour writing-plans
**Scope** : B+ pro-grade (revu après "réfléchi bien pour quelque chose de pro")

## Contexte

`/configurations` est la page mover qui détermine **quels leads il reçoit** (filtrage distribution dans `distribute-lead.ts`). Critique métier : config bancale = pas de leads = pas de revenu.

État actuel a des bugs réels et une UX qui n'aide pas le mover à faire son job.

### Bugs identifiés
1. Map montre Paris hardcoded (`{ lat: 48.8566, lng: 2.3522 }` ligne 145) peu importe l'adresse réelle du mover
2. `radius_rules` fetched mais invisibles dans la page (cachées dans la modal d'édition)
3. Map ignore les vraies données (un seul faux marqueur Paris au lieu des `radius_rules`)

### UX non-pro
- Page 100% client + Framer entrance animation (pas aligné avec les commits SSR récents)
- Pas de feedback sur l'impact de la config (le mover configure à l'aveugle)
- Pas de bulk picker (8 départements IDF = 8 manipulations au lieu d'1 clic)
- Pas de détection de configs débiles (redondances, vides, contradictions)
- Pas de mobile responsive (movers gèrent leur business au tél)
- Empty states sans guidance

## Job-to-be-done

Le mover veut **recevoir les bons leads au bon volume**. La page doit l'aider à :
1. **Comprendre l'impact** de sa config (am I getting too few? too many?)
2. **Configurer vite** (Île-de-France preset = 8 départements en 1 clic)
3. **Éviter les configs débiles** (redondances, vides, contradictions)
4. **Ajuster en confiance** (signal de feedback historique)

## Architecture

### Conversion Server Component

`src/app/(dashboard)/configurations/page.tsx` devient Server Component, suivant le pattern `/contact`, `/blog/[slug]`, `/reclamation`.

**Charge serveur** :
- `company` du user authentifié
- `company_regions` filtrés par `company_id`
- `company_radius` filtrés par `company_id`
- **Impact preview** : nombre de `quote_distributions` matchant la config sur les 30 derniers jours

**Délègue l'interactif** à un nouveau composant `ConfigurationsView.tsx` (client) qui reçoit toutes les données en props et gère :
- Modal d'édition existante
- Suppression de radius_rules
- Refresh via `router.refresh()` après save

### Hiérarchie de la page (révisée)

```
<Header>
  H2 + subtitle
  Stats inline : "N départements + M zones rayon · ~K leads reçus / 30 jours"
</Header>

<ConflictBanner>          # nouveau, conditionnel
  Affiché UNIQUEMENT si conflit détecté
  ex: "75 (Paris) recouvre déjà votre rayon 30km autour Paris — redondant"
</ConflictBanner>

<Card "Départements ciblés">
  Table existante OU empty state avec CTA "Ajouter mon 1er département"
</Card>

<Card "Zones par rayon">    # nouveau — fix bug 2
  Table : ville · rayon · catégories · supprimer
  OU empty state avec CTA "Ajouter une zone de rayon"
</Card>

<Card "Carte de couverture">
  Map enrichie : tous les radius_rules avec circles, popup au click marker,
  zoom auto-fit                                    # fix bugs 1 + 3
</Card>
```

Sur mobile (`< sm`) : tables → cards verticales, stats inline → grid 3 colonnes compactes.

## Fonctionnalités pro

### 1. Impact preview (différenciateur n°1)

**But** : donner au mover un signal concret sur le volume de leads attendu.

**Calcul serveur** dans `loadImpactPreview(companyId)` :

```typescript
// Récupère les distributions reçues sur 30 jours
const since = new Date(Date.now() - 30 * 86400_000).toISOString();
const { data } = await supabase
  .from("quote_distributions")
  .select("id", { count: "exact", head: true })
  .eq("company_id", companyId)
  .gte("created_at", since);
return data?.length ?? 0;
```

**Affichage** : intégré au header, format conversationnel.
> *"~24 leads reçus sur les 30 derniers jours"*

Si 0 → couleur muted + hint "Aucun lead reçu — vérifiez votre config".

**Pas de simulation prédictive** (trop de logique pour V1) — on montre juste le réel passé. Honnête et utile.

### 2. Bulk region picker

**But** : ajouter Île-de-France entier (8 départements) en 1 clic au lieu de 8.

**Implémentation** dans `RegionEditModal.tsx` :
- Nouvelle section au-dessus de la liste alphabétique des départements
- Boutons par région française (les 13 régions du const `REGIONS` de `lib/utils.ts`)
- Click sur "Île-de-France" → tick automatique des départements 75, 77, 78, 91, 92, 93, 94, 95
- Re-click sur la même région → décoche tout
- Indicateur visuel : "8/8 départements cochés" sur le bouton si tous cochés, "3/8" si partiel

**Données existantes utilisables** : `REGIONS` const a déjà tous les groupements officiels.

### 3. Détection de conflits

**But** : empêcher le mover de configurer n'importe quoi.

**Règles de détection** (server-side, computed après load) :

```typescript
function detectConflicts(regions, radiusRules) {
  const conflicts = [];

  // Règle 1 : un département configuré + un rayon dont le centre est dans ce département
  for (const radius of radiusRules) {
    const radiusDept = radius.departure_city ? extractDeptFromCity(radius.lat, radius.lng) : null;
    if (radiusDept && regions.some(r => r.department_code === radiusDept)) {
      conflicts.push({
        type: "redundant",
        message: `Le département ${radiusDept} couvre déjà votre rayon autour de ${radius.departure_city} — l'un des deux suffit.`,
      });
    }
  }

  // Règle 2 : aucune zone configurée → ne reçoit RIEN
  if (regions.length === 0 && radiusRules.length === 0) {
    conflicts.push({ type: "empty", message: "Aucune zone configurée — vous ne recevrez aucun lead." });
  }

  // Règle 3 : zone sans aucune catégorie cochée
  for (const r of regions) {
    if (!r.categories?.length) {
      conflicts.push({ type: "empty_category", message: `Le département ${r.department_code} n'a aucune catégorie cochée — il ne reçoit rien.` });
    }
  }
  for (const r of radiusRules) {
    if (!r.move_types?.length) {
      conflicts.push({ type: "empty_category", message: `La zone autour de ${r.departure_city} n'a aucune catégorie cochée — elle ne reçoit rien.` });
    }
  }

  return conflicts;
}
```

**Affichage** : un seul `ConflictBanner` jaune (warning) en haut de page si `conflicts.length > 0`. Liste à puces des messages. Aucun banner si tout est OK (le silence est aussi du feedback).

**Note d'implémentation** : `extractDeptFromCity(lat, lng)` est non-trivial sans géocodage inverse. Approximation acceptable V1 : on prend la première paire de chiffres du code postal de la ville (qui n'existe pas en base — on a juste lat/lng + city name). On peut alternativement skipper la règle 1 dans une V1 et n'afficher que les règles 2 + 3 qui sont fiables et déjà très utiles. **Décision V1 : skip règle 1** (redondance dept × rayon) — trop fragile, on l'ajoute plus tard avec un vrai géocodage.

### 4. Mobile responsive

**Tables → Cards en `< sm`** :
- Plus de `<Table>` qui overflow horizontalement
- Cards empilées avec : titre (département ou ville), badges catégories, info secondaire, action delete
- Pattern : `block sm:hidden` pour les cards mobile, `hidden sm:block` pour la table desktop

**Stats inline** :
- Desktop : phrase complète "N départements + M zones rayon · ~K leads / 30 jours"
- Mobile : grid 3 colonnes, chiffres en évidence, labels en dessous

**Bouton CTA mobile** : sticky en bas si scroll.

### 5. Map enrichie

**Fix bugs 1 + 3** : markers basés sur les vraies `radius_rules` (cf. ci-dessous).

**Polish** :
- Popup au click sur marker : `<strong>${city}</strong><br>Rayon ${km} km<br>Catégories : ${categories.join(", ")}`
- Auto-fit zoom : `map.fitBounds()` calculé à partir de tous les markers + un padding
- Couleur du circle adaptée à la catégorie principale (national vert, entreprise bleu, international violet) — fait via `paint.fill-color` dynamique

### 6. Empty states avec CTAs

Aujourd'hui : `<p>Aucune région configurée</p>`.
Après pour chaque card :
- Icône lucide (MapPin pour départements, Target pour rayons, Map pour la map)
- Titre court ("Pas encore de département configuré")
- Sous-titre explicatif (1 ligne)
- Bouton primaire qui ouvre la modal d'édition sur le bon onglet

## Bug fixes

### Bug 1 + 3 — Map markers réels

État actuel `page.tsx:145` :
```tsx
markers={companyCity ? [{ lat: 48.8566, lng: 2.3522, label: companyCity, radiusKm: 30 }] : []}
```

**Décision** : suppression du marqueur fake. La table `companies` n'a pas de lat/lng (cf. migration 001), donc on ne peut pas plotter la position réelle du mover sans changement de schéma. On plotte uniquement les `radius_rules` qui ont déjà lat/lng en DB.

État cible :
```tsx
markers={radiusRules.map(r => ({
  lat: r.lat,
  lng: r.lng,
  label: r.departure_city,
  radiusKm: r.radius_km,
  categories: r.move_types,
}))}
```

### Bug 2 — Table radius_rules visible

Nouveau Card "Zones par rayon" avec table : ville · rayon · catégories · action delete. Suppression via POST `/api/dashboard/regions` `action: "remove_radius"` (route existante) puis `router.refresh()`. Confirm dialog avant delete.

## Data — pas de migration nécessaire

Aucun changement de schéma. On utilise :
- `companies` (déjà chargé pour `company_id`)
- `company_regions` (existant)
- `company_radius` (existant — déjà a lat/lng + categories)
- `quote_distributions` (existant — pour impact preview)

L'API `/api/dashboard/regions` reste inchangée.

## Sécurité — pas de changement

Auth identique : Supabase user session via `createClient()` côté API + `createUntypedAdminClient()` pour bypass RLS sur les opérations admin. La page Server Component utilise le même pattern que les autres dashboard SC.

## Découpage commits (3 incrémentaux)

### Commit 1 — Foundation (~1h30)

- Conversion `page.tsx` en Server Component avec data fetch (regions + radiusRules + impact)
- Création `ConfigurationsView.tsx` client subcomponent
- Fix les 3 bugs (markers radius_rules réels)
- Nouvelle Card "Zones par rayon" avec table + delete
- Empty states basiques (texte + CTA simple)
- Stats inline dans le header (count départements + count rayons + impact preview)

→ La page **fonctionne correctement et donne du feedback réel**. Build + lint clean obligatoire.

### Commit 2 — Pro features (~2h30)

- Bulk region picker dans `RegionEditModal` (boutons régions FR + multi-tick)
- Conflict detection serveur (règles 2 + 3 ; règle 1 skip V1)
- `ConflictBanner` jaune en haut de page si `conflicts.length > 0`
- Map polish : popup marker, auto-fit zoom, couleur catégorie

→ La page **devient intelligente** (anticipe les erreurs, accélère la config).

### Commit 3 — Polish (~1-2h)

- Mobile responsive (tables → cards en `< sm`)
- Empty states upgradés (icônes + sous-titre + CTA primaire)
- Drop framer-motion sur le header
- Tooltip catégories : explique national / entreprise / international au hover

→ La page **brille** et fonctionne aussi bien sur mobile.

## Hors scope (explicitement non-fait)

- ❌ Click-on-map to add zone — UX heavy, scope creep
- ❌ Drag-to-resize circle — UX heavy
- ❌ Pause toggle (vacances) — schema change requis
- ❌ Templates / configs sauvegardées — prématuré
- ❌ Stats par zone détaillées (leads par dép sur 30j) — option C originale, reportée
- ❌ Compétiteur density (densité movers concurrents par zone)
- ❌ Lead simulator ("aurais-je reçu CE lead?")
- ❌ Géocodage inverse pour règle de conflit 1 (dept × rayon)
- ❌ Modification de l'API `/api/dashboard/regions` — pas nécessaire
- ❌ Ajout colonnes lat/lng sur table `companies` — pas le scope

## Test plan

Manuel sur preview Vercel avant merge master.

**Cas mover** :
- Sans config : empty states + ConflictBanner "Aucune zone — vous ne recevrez aucun lead"
- Régions only : table régions, table rayon empty, map empty
- Rayons only : table rayon, table régions empty, map avec markers + circles
- Régions + rayons : tout affiché, stats correctes, impact preview montré
- Catégorie vide sur une zone : ConflictBanner "Cette zone n'a aucune catégorie"
- Bulk picker IDF : 8 départements cochés en 1 clic, indicateur "8/8"
- Suppression radius_rule : confirm + refresh OK
- Modal save → router.refresh propage les changements

**Mobile** (Chrome DevTools 375px) :
- Tables remplacées par cards
- Stats lisibles
- Map ne déborde pas
- CTAs accessibles au pouce

**Build** : `npm run lint` + `npm run build` clean (cf. memory `feedback_build_rules.md`).

## Lint / Build / Deploy

Commit 1 → push master → preview Vercel → vérifier les cas mover ci-dessus.
Si OK, commit 2 → push → preview → vérifier features pro.
Si OK, commit 3 → push → preview → vérifier mobile + polish.
