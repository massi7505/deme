# Calculateur de volume + lead detail enrichi — design (en cours)

**Date** : 2026-04-30
**Statut** : ⏸️ **EN PAUSE** — brainstorm interrompu à la question 5 (scope lead detail). À reprendre à partir de cette question.
**Référence** : [Sirelo formulaire de demande](https://sirelo.fr/formulaire-de-demande/)

## Contexte

Le funnel `/devis` actuel (4 étapes : Type/Volume → Adresses → Détails → Contact) capture le volume via un input libre `volume_m3` optionnel sur Step 1. Le client peut soit taper un nombre (ex : "25"), soit laisser vide. L'utilisateur veut ajouter un calculateur d'inventaire à la Sirelo (catégories pliables, items avec compteur +/–, total m³ auto-calculé) et améliorer la page lead detail mover + admin pour mieux exposer ces détails après achat.

## Décisions prises

### 1. Intégration dans le funnel — **Option B (étape dédiée, 5 étapes)**

Ajout d'un **nouveau step entre Adresses (actuel Step 2) et Détails (actuel Step 3)** = funnel à **5 étapes**. Calculateur en plein écran, pas de modal imbriqué (meilleure UX mobile que A).

### 2. Skippable ou requis — **Option B1 (skippable)**

Bouton « Passer cette étape » visible. Si skippé, `volume_m3` retombe sur la précédence définie ci-dessous. Choix aligné Sirelo + maximise la conversion. Trade-off accepté : ~50% des leads sans inventaire détaillé.

### 3. Champs existants qui chevauchent — **Coexistence avec règle de précédence**

| Champ | Statut | Rôle |
|---|---|---|
| Step 1 — m³ libre | **Conservé** (relabel : « Si vous connaissez votre volume ») | Fallback rapide pour clients pressés |
| Step 1 — `room_count` | Conservé | Cadrage matching/pricing |
| Step 3 (nouveau) — inventaire | Optionnel | Source canonique du volume si rempli |
| Step 3 actuel — `heavy_items` | Conservé | Flag manutention spéciale (distinct de l'inventaire) |

**Règle de précédence côté serveur** :

```
volume_m3_canonical = COALESCE(
  sum(inventory),         -- 1. si calculateur rempli, gagne
  volume_m3_user_input,   -- 2. sinon, ce que le client a tapé sur Step 1
  NULL                    -- 3. sinon null, fallback sur room_count à l'affichage
)
```

**Côté UI lead detail** : afficher les deux quand ils existent : *« Volume calculé : 18 m³ — Estimation client : 25 m³ »*. Au mover de juger.

**Pourquoi pas l'option A (drop du m³ libre)** : avec un inventaire skippable, supprimer le m³ libre dégrade les leads où le client skippe l'inventaire mais aurait tapé un nombre — pire que l'état actuel.

### 4. Source du catalogue — **Option A (constante TS)** + snapshot du volume calculé

- Catalogue dans `src/lib/inventory-catalog.ts` : objet exporté `{ salon: [{ key, label, volume_m3 }, ...], ... }`. Pas de table DB, pas d'UI admin.
- Justification métier : les volumes du déménagement français sont une **donnée d'industrie stable**. Catalogue change ~5-10 fois/an max → une PR par modif suffit. Une UI admin = ~1 jour de dev pour zéro valeur tangible.

**Détail crucial** — *snapshot à la soumission* :

À la soumission, `quote_requests` stocke :
1. `inventory_items` (JSONB) — la sélection client : `{ "salon.canape_3p": 2, "chambre.lit_double": 1, ... }`
2. `volume_m3` (number) — **le total calculé à ce moment-là**, pas re-calculé dynamiquement plus tard

→ Si demain on corrige le volume d'un canapé, les vieux leads gardent leur volume initial (celui qu'a vu le déménageur à l'achat). Pas de surprise rétroactive sur les leads déjà vendus.

## Questions ouvertes (à reprendre)

### 5. ⏭️ Scope lead detail (admin + mover) — **EN ATTENTE**

Trois niveaux d'ambition proposés :

- **5a — Strict minimum** : afficher l'inventaire après unlock côté mover ; ajouter inventaire dans la liste admin.
- **5b — Lead detail unifié** (reco initiale) : refonte page mover (groupes par catégorie, total m³ visible, adresses avec floor/elevator) + **création page admin dédiée** `/admin/leads/[id]` avec métadonnées (status, distribution, historique unlocks, refunds).
- **5c — Refonte complète** : 5b + export PDF, signature numérique, zone discussion mover↔client, actions admin (re-distribuer, annuler, refund manuel, contact client).

### 6. Périmètre du catalogue — **PAS ENCORE ABORDÉ**

- Sirelo 1:1 (~150 items, 7 catégories) ?
- Trimmed (~50 items, 7 catégories) ?
- Léger (~25 items, 4-5 catégories) ?

### 7. UX mobile du calculateur — **PAS ENCORE ABORDÉ**

Accordéon par catégorie (façon Sirelo screenshot) ? Une catégorie ouverte à la fois ou plusieurs ? Sticky total m³ en bas ?

### 8. Impact pricing — **PAS ENCORE ABORDÉ**

Le `volume_m3` calculé doit-il influencer le prix du lead ? Aujourd'hui le pricing repose sur quoi exactement ? À vérifier dans `src/lib/distribute-lead.ts` + `src/components/admin/settings/PricingTab.tsx`.

### 9. Schéma de stockage `inventory_items` — **PAS ENCORE ABORDÉ**

Décidé en principe : JSONB sur `quote_requests`. Forme exacte à arrêter :
- `{ "salon.canape_3p": 2 }` (clé plate avec dot-notation) ?
- `[{ category: "salon", item_key: "canape_3p", qty: 2 }]` (array d'objets) ?

## Reprise du brainstorm

Quand l'utilisateur revient :
1. Reprendre à la **question 5 (scope lead detail)**
2. Continuer questions 6 → 7 → 8 → 9
3. Présenter le design finalisé pour validation
4. Écrire le plan d'implémentation via `superpowers:writing-plans`

## Maquettes générées (visual companion)

Dans `.superpowers/brainstorm/813-1777557029/content/` :
- `01-integration.html` — comparaison des trois options d'intégration A/B/C
- `02-waiting.html` — écran d'attente
