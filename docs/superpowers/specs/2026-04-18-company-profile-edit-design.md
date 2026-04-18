# Édition du profil d'entreprise — déménageur & admin

**Date**: 2026-04-18
**Statut**: spec validée

## Contexte

La fiche publique d'un déménageur (`/entreprises-demenagement/[slug]`) affiche aujourd'hui des champs vides ou manquants quand les données ne sont pas renseignées (statut juridique, effectif, et la TVA n'est jamais affichée). Le déménageur ne dispose d'aucun moyen de configurer son nom commercial, son statut juridique ou son numéro de TVA depuis `/profil-entreprise`. L'admin (`/admin/companies`) ne dispose d'aucune interface d'édition des champs entreprise — seulement statut compte / KYC / suspension / suppression.

## Objectif

1. Afficher le n° TVA intracommunautaire sur la fiche publique (téléphone et email restent privés).
2. Permettre au déménageur de modifier son **nom d'entreprise** (avec validation admin) depuis `/profil-entreprise`.
3. Permettre au déménageur de **re-synchroniser** statut juridique et TVA depuis l'INSEE.
4. Permettre à l'admin d'**éditer tous les champs** d'une entreprise et de **traiter les demandes de changement de nom**.

## Décisions de design

| # | Question | Décision |
|---|----------|----------|
| 1 | Affichage des champs publics | TVA visible publiquement, email/téléphone restent privés |
| 2 | Modification du nom par le déménageur | Soumise à validation admin (workflow) |
| 3 | Statut juridique & TVA | Auto-rempli INSEE, lecture seule, bouton « Re-synchroniser » |
| 4 | Édition admin | Édition complète + section dédiée aux demandes de validation |
| 5 | Stockage des demandes | Champ `pending_name` sur `companies` (pas de table dédiée) |
| 6 | Tests | Vitest + tests unitaires des fonctions pures |

## Architecture

### 1. Base de données

Migration `supabase/migrations/002_company_name_change_request.sql`:

```sql
ALTER TABLE companies
  ADD COLUMN pending_name TEXT,
  ADD COLUMN pending_name_requested_at TIMESTAMPTZ;
```

Le champ `vat_number` existe déjà. Aucune autre modification du schéma.

### 2. Calcul de la TVA française

Helper dans `src/lib/sirene.ts`:

```ts
export function computeFrenchVAT(siren: string): string | null {
  if (!/^\d{9}$/.test(siren)) return null;
  const key = (12 + 3 * (parseInt(siren) % 97)) % 97;
  return `FR${key.toString().padStart(2, "0")}${siren}`;
}
```

`SireneResult` gagne un champ `vatNumber: string | null` calculé dans `verifySiret` à partir du `siren`. `/api/sirene` n'a pas besoin de modification — le champ est exposé automatiquement.

### 3. Helper de slug

`slugify` existe déjà dans `src/lib/utils.ts`. Le pattern existant dans le code (`src/lib/ensure-company.ts`, `src/app/api/auth/register/route.ts`) est `slugify(name) + "-" + suffix`.

Ajouter un wrapper dans `src/lib/utils.ts` :

```ts
export function generateCompanySlug(name: string): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${slugify(name)}-${suffix}`;
}
```

À utiliser dans l'action `approve_name_change` côté admin et, pour cohérence, refacto `ensure-company.ts` et `api/auth/register/route.ts` plus tard (hors scope).

### 4. Page publique `/entreprises-demenagement/[slug]`

**`src/app/api/public/movers/[slug]/route.ts`** : ajouter `vat_number` au `SELECT`.

**`src/app/(public)/entreprises-demenagement/[slug]/page.tsx`** :
- Type `Company` gagne `vat_number: string | null`.
- Section « Informations légales » : ajouter une 4e carte conditionnelle après « Statut juridique » :
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

Email et téléphone restent absents de la fiche publique (décision n°1).

### 5. Dashboard déménageur `/profil-entreprise`

#### UI — refonte de la section « Infos entreprise » en deux blocs

**Bloc « Identité légale »** (nouveau) :
- Nom d'entreprise — éditable, déclenche une demande de validation
- SIRET — lecture seule
- Statut juridique — lecture seule (auto INSEE)
- N° TVA — lecture seule (calculé depuis SIREN)
- Bouton « Re-synchroniser depuis INSEE »

Si `pending_name` est non null, afficher un bandeau jaune au-dessus du bloc :
> ⏳ Demande de changement de nom en attente : « **{pending_name}** » — soumise le {formatDate(pending_name_requested_at)}

Tant que cette demande existe, le bouton « Modifier le nom » est désactivé.

**Bloc « Infos contact »** (existant, conservé) : téléphone, email contact, site web, effectif.

#### API — `src/app/api/dashboard/profile/route.ts`

Deux nouvelles actions POST :

- **`request_name_change`** — body `{ action: "request_name_change", requested_name }` :
  - Refuse si `requested_name` est vide ou trim égal au `name` actuel.
  - Refuse si `pending_name` est déjà non null (`409`).
  - Écrit `pending_name = requested_name.trim()` et `pending_name_requested_at = now()`.

- **`sync_from_insee`** — body `{ action: "sync_from_insee" }` :
  - Appelle `verifySiret(company.siret)`.
  - Met à jour `legal_status` (= `result.legalStatusLabel`) et `vat_number` (= `result.vatNumber`).
  - Retourne le résultat à jour.

`allowedFields` reste inchangé : le mover ne peut toujours pas écrire directement `name`, `legal_status`, `vat_number`, `siret`.

### 6. Admin `/admin/companies`

#### UI — vue liste

Si au moins une entreprise a `pending_name` non null, afficher en haut de la liste :
> ⚠ {N} demande(s) de changement de nom à valider

Cliquer dessus active le filtre sur ces entreprises (variable d'état locale `filterPendingName`).

#### UI — vue détail

Bandeau au-dessus de « Informations entreprise » si la fiche a `pending_name` :

```
┌─────────────────────────────────────────────────────┐
│ Demande de changement de nom                        │
│ Actuel:    {c.name}                                 │
│ Demandé:   {c.pending_name}                         │
│ Soumis le: {formatDate(c.pending_name_requested_at)}│
│            [ ✓ Approuver ]  [ ✗ Rejeter ]           │
└─────────────────────────────────────────────────────┘
```

#### Édition inline de tous les champs

Extraire `EditableTextField` de `src/app/(dashboard)/profil-entreprise/page.tsx` vers `src/components/shared/EditableField.tsx` pour réutilisation côté admin.

Champs éditables dans **« Informations entreprise »** : `name`, `siret`, `legal_status`, `employee_count`, `vat_number`, `address`, `city`, `postal_code`.
Champs éditables dans **« Contact »** : `email_contact`, `email_billing`, `phone`, `website`.
Champ éditable séparé : `description`.

Le `slug` n'est jamais éditable manuellement — il est régénéré uniquement lors de l'approbation d'un changement de nom.

#### API — `src/app/api/admin/companies/route.ts`

Trois nouvelles actions POST :

- **`update_field`** — body `{ action: "update_field", id, field, value }` :
  - Whitelist : `["name", "siret", "vat_number", "legal_status", "employee_count", "address", "city", "postal_code", "phone", "email_contact", "email_billing", "website", "description"]`.
  - Refus pour tout autre champ (`400`).
  - Update direct.

- **`approve_name_change`** — body `{ action: "approve_name_change", id }` :
  - Lit `pending_name`. Si null → `400`.
  - Met à jour `name = pending_name`, `slug = generateCompanySlug(pending_name)` (depuis `src/lib/utils.ts`), `pending_name = null`, `pending_name_requested_at = null`.

- **`reject_name_change`** — body `{ action: "reject_name_change", id, reason? }` :
  - Met à jour `pending_name = null`, `pending_name_requested_at = null`.
  - Notification au mover : pas dans cette spec (P2).

### 7. Tests automatisés (Vitest)

Setup one-time :

```bash
npm i -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

`vitest.config.ts` à la racine :

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
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

`vitest.setup.ts` : `import "@testing-library/jest-dom";`.

`package.json` ajouter :
```json
"test": "vitest run",
"test:watch": "vitest"
```

Convention : tests à côté du fichier, suffixe `.test.ts(x)`.

**Tests pour cette feature** :

- `src/lib/sirene.test.ts` :
  - `computeFrenchVAT("732829320")` → `"FR44732829320"`
  - `computeFrenchVAT("invalid")` → `null`
  - `computeFrenchVAT("12345")` → `null`
- `src/lib/utils.test.ts` :
  - `generateCompanySlug("Mon Entreprise SARL")` matche `/^mon-entreprise-sarl-[a-z0-9]{8}$/`
  - `slugify("Café Déménagement")` → `"cafe-demenagement"` (caractères accentués normalisés).

Pas de tests sur les routes API ni les composants React dans ce premier jet (mocking Supabase = infra disproportionnée pour cette feature). À ajouter quand un cas d'usage le justifiera.

## Vérification

- `npm run test` passe (4 cas unitaires).
- `npm run build` passe (66+ pages, 0 erreur).
- Test manuel des 3 flux :
  1. Mover modifie son nom → bandeau apparaît dans `/profil-entreprise` ET dans la fiche `/admin/companies`.
  2. Admin approuve → `name` + `slug` mis à jour, l'ancien lien public retourne 404, la nouvelle URL est accessible.
  3. Mover clique « Re-synchroniser INSEE » → `legal_status` + `vat_number` rafraîchis, la fiche publique affiche la TVA.

## Hors scope

- Notification email/push au mover lors d'approbation/rejet de changement de nom (P2).
- Historique des changements de nom (audit log).
- Édition multi-pays de la TVA (intracommunautaire non-FR).
- Tests E2E (Playwright) ou tests d'intégration des routes API.
