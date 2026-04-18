# Système intelligent de remboursement collectif (leads défectueux)

**Date**: 2026-04-19
**Statut**: spec validée

## Contexte

Un lead (demande de devis) peut être acheté par jusqu'à 6 déménageurs. Actuellement, si un seul mover conteste le lead (`claims` table), l'admin traite individuellement — pas de signal collectif. Le résultat :
- Un claim isolé peut passer pour légitime même s'il ne l'est pas (mover abusif).
- Quand plusieurs movers signalent le même lead pour la même raison (lead dupliqué, faux), l'admin ne voit pas immédiatement le pattern et peut accorder/refuser des remboursements de manière incohérente.

## Objectif

Détecter automatiquement les leads confirmés défectueux lorsque **≥ 4 movers** déposent un claim pour une raison « hard » (`duplicate`, `fake`, `wrong_info`) sur le même lead. L'admin reçoit une alerte avec un unique bouton « Rembourser tous » pour traiter l'ensemble des claims en une action.

## Décisions de design

| # | Question | Décision |
|---|----------|----------|
| 1 | Seuil de détection | **≥ 4 claims hard** sur un même lead |
| 2 | Action à l'atteinte du seuil | Flag `suspected` + alerte admin, **refund manuel** (accept / refuse) |
| 3 | Raisons prises en compte | **`duplicate`, `fake`, `wrong_info`** (raisons factuelles uniquement) |
| 4 | UI | Panneau dans `/admin/claims` + compteur sur `/admin/dashboard` |

## Architecture

### 1. Base de données

Migration `supabase/migrations/016_lead_defect_flag.sql` :

```sql
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

**Rationale** : le défaut est une propriété du **lead** (une demande de devis partagée par plusieurs distributions), pas d'un claim individuel. Un seul flag global suffit pour regrouper tous les claims liés.

Valeurs :
- `suspected` : ≥ 4 claims hard, en attente de décision admin
- `confirmed_refunded` : admin a accepté, tous les claims ont été remboursés
- `rejected` : admin a refusé, le flag est retiré (les claims restent traités individuellement)

### 2. Détection automatique

Nouveau fichier `src/lib/defect-detection.ts` :

```ts
import type { createUntypedAdminClient } from "@/lib/supabase/admin";
type Admin = ReturnType<typeof createUntypedAdminClient>;

export const HARD_REASONS = new Set(["duplicate", "fake", "wrong_info"]);
export const DEFECT_THRESHOLD = 4;

/**
 * After a new claim is filed, check if the underlying lead has enough
 * hard-reason claims to be auto-flagged.
 *
 * Idempotent: won't re-flag a lead that's already flagged or resolved.
 */
export async function checkAndFlagDefectiveLead(
  admin: Admin,
  quoteRequestId: string
): Promise<boolean> {
  const { data: distributions } = await admin
    .from("quote_distributions")
    .select("id")
    .eq("quote_request_id", quoteRequestId);
  const distIds = (distributions || []).map((d: { id: string }) => d.id);
  if (distIds.length === 0) return false;

  const { count } = await admin
    .from("claims")
    .select("id", { count: "exact", head: true })
    .in("quote_distribution_id", distIds)
    .in("reason", Array.from(HARD_REASONS))
    .eq("status", "pending");

  if ((count ?? 0) < DEFECT_THRESHOLD) return false;

  const { data: lead } = await admin
    .from("quote_requests")
    .select("defect_status")
    .eq("id", quoteRequestId)
    .single();
  if (lead?.defect_status) return false;

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

  return true;
}
```

Appelé depuis `POST /api/dashboard/claims` après `INSERT` du claim, uniquement si la raison est dans `HARD_REASONS`.

### 3. Actions admin

Ajouter dans `src/app/api/admin/claims/route.ts` (POST) deux nouvelles actions :

**`accept_defect`** — body `{ action: "accept_defect", quoteRequestId }` :

1. Charger toutes les distributions `unlocked` du lead.
2. Pour chaque distribution, trouver la transaction `paid` associée.
3. Pour chaque transaction : créer un crédit portefeuille via `creditWallet` (helper existant dans `src/lib/wallet.ts`).
4. Marquer tous les claims `pending` liés aux distributions du lead comme `approved`, avec `admin_note: "Lead défectueux confirmé collectivement"` et `resolved_at`.
5. Update `quote_requests` : `defect_status = 'confirmed_refunded'`, `defect_resolved_at = now()`, `defect_resolved_by = 'admin'`.

**`reject_defect`** — body `{ action: "reject_defect", quoteRequestId, reason? }` :

1. Update `quote_requests` : `defect_status = 'rejected'`, `defect_resolved_at = now()`, `defect_resolved_by = 'admin'`.
2. Les claims restent `pending` — l'admin les traitera un par un via l'UI existante.

### 4. GET `/api/admin/claims` — enrichissement

L'endpoint retourne en plus une clé `defectiveLeads` :

```ts
defectiveLeads: Array<{
  quoteRequestId: string;
  fromCity: string | null;
  toCity: string | null;
  category: string | null;
  flaggedAt: string;
  reasonsBreakdown: Record<string, number>; // { duplicate: 3, fake: 1 }
  totalRefundCents: number;
  claims: Array<{
    id: string;
    companyId: string;
    companyName: string;
    reason: string;
    amountCents: number;
  }>;
}>
```

Seuls les leads en `defect_status = 'suspected'` sont inclus.

### 5. UI

#### `/admin/claims` — panneau en haut

Affiché uniquement si `defectiveLeads.length > 0` :

```tsx
<div className="rounded-xl border-2 border-red-300 bg-red-50/80 p-5 shadow-sm">
  <p className="text-base font-bold text-red-900">
    🚨 {defectiveLeads.length} lead{defectiveLeads.length > 1 ? "s" : ""} confirmé
    {defectiveLeads.length > 1 ? "s" : ""} défectueux — validation requise
  </p>
  {defectiveLeads.map((lead) => (
    <div key={lead.quoteRequestId} className="mt-3 rounded-lg bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold">
        {lead.fromCity} → {lead.toCity} · {formatDate(lead.flaggedAt)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {lead.claims.length} signalements : {Object.entries(lead.reasonsBreakdown).map(
          ([r, n]) => `${n} × ${r}`
        ).join(" · ")}
      </p>
      <p className="mt-1 text-xs">
        Remboursement total : <strong>{formatPrice(lead.totalRefundCents)}</strong>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Movers : {lead.claims.map((c) => c.companyName).join(", ")}
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => acceptDefect(lead.quoteRequestId)}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">
          ✓ Rembourser tous
        </button>
        <button onClick={() => rejectDefect(lead.quoteRequestId)}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700">
          ✗ Refuser
        </button>
      </div>
    </div>
  ))}
</div>
```

Chaque claim individuel dans la liste ci-dessous, si son lead est `suspected`, porte un petit badge rouge « Lead signalé 4× ».

#### `/admin/dashboard` — compteur sidebar

Ajouter un bloc conditionnel dans la sidebar :

```tsx
{defectCount > 0 && (
  <Link
    href="/admin/claims"
    className="block rounded-xl border-2 border-red-300 bg-red-50 p-4 hover:bg-red-100"
  >
    <p className="text-sm font-semibold text-red-900">
      🚨 {defectCount} lead{defectCount > 1 ? "s" : ""} défectueux à valider
    </p>
    <p className="mt-1 text-xs text-red-700">
      Cliquez pour examiner
    </p>
  </Link>
)}
```

Source : ajouter `defectCount` à l'endpoint `/api/admin/stats` existant (`SELECT count(*) FROM quote_requests WHERE defect_status = 'suspected'`).

## Tests

Fichier `src/lib/defect-detection.test.ts` (Vitest) — teste la fonction pure autour des seuils. Cas :

- 3 hard claims → pas de flag
- 4 hard claims → flag + notification
- 3 hard + 5 soft (`unreachable`, `other`) → pas de flag
- Lead déjà flagué → fonction retourne `false`, pas de double notification

Tests d'intégration API : non inclus (mocking Supabase disproportionné pour ce scope).

## Vérification

- `npm run test` → 7 tests existants + nouveaux tests passent.
- `npm run build` → 0 erreur.
- Test manuel :
  1. 3 movers déposent `duplicate` sur le même lead → aucune alerte.
  2. 4ème mover dépose `fake` sur le même lead → alerte apparaît dans `/admin/claims` + compteur sur `/admin/dashboard`.
  3. Admin clique **« Rembourser tous »** → 4 crédits portefeuille, claims passent `approved`, notifications in-app aux 4 movers.
  4. Un 5ème mover dépose un claim après coup → le lead est déjà `confirmed_refunded`, la fonction ne re-flag pas, le claim reste individuel.
  5. Sur un autre lead flagué : admin clique **« Refuser »** → flag retiré (`rejected`), claims restent `pending`.

## Hors scope

- Re-flag automatique après un `reject_defect` (éviterait le harcèlement).
- Notifications email / SMS aux movers lors du remboursement collectif (notif in-app suffit).
- Panel admin de config du seuil (hardcodé à 4 via constante exportée, modifier dans le code si besoin).
- Historique des décisions admin (audit trail dédié).
- Dispute mover → admin après `reject_defect`.
