# Audit sécurité — `/api/public/*` + `/api/dashboard/*`

**Date** : 2026-04-30
**Périmètre** : 14 routes (6 public + 8 dashboard) + helpers associés (`rate-limit`, `quote-reconfirm-token`, `blob`, `ensure-company`, `api-errors`)
**Mode** : lecture seule, aucun fix appliqué
**Statut** : à valider par l'utilisateur, fixes en commits séparés ensuite

## Synthèse

| Sévérité | Public | Dashboard | Total |
|---|---|---|---|
| CRITIQUE | 0 | 0 | 0 |
| HAUT | 3 | 3 | 6 |
| MOYEN | 6 | 6 | 12 |
| BAS | 5 | 5 | 10 |
| INFO | 4 | 4 | 8 |

**État général :**
- Aucune vulnérabilité critique exploitable directement.
- L'auth Supabase est appliquée avec rigueur sur le périmètre dashboard (toutes les routes filtrent par `company_id` du user authentifié, aucun IDOR exploitable détecté).
- Les principaux risques sont **systémiques** : un seul `getClientIp()` faillible casse tous les rate-limits, l'utilisation systématique de l'admin client (RLS bypass) sur `/api/dashboard/*` repose entièrement sur la vigilance manuelle, et un fallback secret en dur dans `quote-reconfirm-token.ts` est une bombe à retardement env.
- Plusieurs **fuites de données business** côté public (SIRET, TVA, count exact movers) facilitent un scraping concurrentiel.

## Top 6 priorités (à fixer en premier)

| # | Sévérité | Finding | Surface |
|---|---|---|---|
| 1 | HAUT | XFF spoofing trivialise tous les rate-limits | `lib/rate-limit.ts` (impacte toutes les routes) |
| 2 | HAUT | Fallback HMAC `dev-admin-secret-change-me` partagé entre admin cookie et reconfirm token | `lib/quote-reconfirm-token.ts:3`, `lib/admin-auth.ts:4` |
| 3 | HAUT | Upload SVG accepté + MIME validé seulement via header client → XSS stockée | `api/dashboard/upload/route.ts:59-71` + `lib/blob.ts` |
| 4 | HAUT | Mass-assignment latent dans `profile` PATCH (pas de Zod, whitelist manuelle) | `api/dashboard/profile/route.ts:281-310` |
| 5 | HAUT | Fail-open du rate-limit en cas d'erreur DB | `lib/rate-limit.ts:50-55` |
| 6 | HAUT | RLS bypass systémique côté dashboard (toutes les routes utilisent admin client) | les 8 routes `/api/dashboard/*` |

## Findings — `/api/public/*`

### [HAUT] Spoofing trivial du rate-limit via header X-Forwarded-For
**Fichier :** `src/lib/rate-limit.ts:5-15` (impacte les 6 routes publiques + dashboard)
**Description :** `getClientIp()` prend la première valeur de `x-forwarded-for` sans validation ni stratégie « trusted proxy hops ». Tout client peut envoyer `X-Forwarded-For: 1.2.3.4` arbitraire, randomisé par requête, pour passer outre tout rate-limit.
**Risque :** Toutes les protections de débit (reviews 10/h, quote-reconfirm 30/10min, login admin 5/5min, etc.) contournables. Spam reviews, énumération movers/blog, déclenchement de coûts DB illimités.
**Reco :** Sur Vercel, lire `request.ip` ou `request.headers.get('x-real-ip')` en priorité (Vercel injecte une IP fiable). N'accepter `X-Forwarded-For` que derrière un proxy de confiance. Pour les endpoints write, rate-limiter en plus par token/quote_request_id.

---

### [HAUT] Fail-open du rate-limit en cas d'erreur DB
**Fichier :** `src/lib/rate-limit.ts:50-55`
**Description :** Si `rate_limit_events` est down ou que la requête `count` échoue, retourne `{ ok: true }` (commenté volontairement « fail open »). Aucune backpressure.
**Risque :** Une perturbation Supabase = effondrement complet du rate-limiting partout en même temps. Combiné avec `reviews:POST` (qui écrit en DB), scénario de spam massif.
**Reco :** Pour les endpoints write critiques, passer en fail-closed (503). Au minimum logger une alerte pour détecter la dérive.

---

### [HAUT] Fallback HMAC secret partagé dev en dur (reconfirm + admin cookie)
**Fichier :** `src/lib/quote-reconfirm-token.ts:3` et `src/lib/admin-auth.ts:4`
**Description :** `const SECRET = process.env.ADMINJS_COOKIE_SECRET ?? "dev-admin-secret-change-me"`. Si la variable est manquante en prod (oubli, mauvaise scope Vercel), tout le monde peut générer des tokens valides. **Pire** : la même env var sert pour signer le cookie admin ET les tokens reconfirm — pas de domain-separation cryptographique.
**Risque :** (1) Forge de tokens reconfirm pour énumérer les `quote_request_id` et marquer leads `completed` (DoS business). (2) Si le secret leak, l'admin peut être imitable.
**Reco :** `throw` au boot si `process.env.ADMINJS_COOKIE_SECRET` absent. Introduire `RECONFIRM_TOKEN_SECRET` distinct du cookie admin.

---

### [MOYEN] /movers/[slug] expose SIRET / TVA / employee_count / adresse complète
**Fichier :** `src/app/api/public/movers/[slug]/route.ts:23-31`
**Description :** Le SELECT inclut `siret`, `vat_number`, `employee_count`, `legal_status`, `address` complète.
**Risque :** Scraping concurrentiel trivial. Un concurrent reconstitue la base annuaire en quelques heures. Données SIRET/TVA légalement publiques mais leur agrégation structurée par votre marketplace constitue de la valeur métier.
**Reco :** Retirer `siret`, `vat_number` du SELECT public. Si la page a besoin de matérialiser un badge « entreprise vérifiée », n'envoyer qu'un booléen `is_verified`.

---

### [MOYEN] /movers expose le count exact + scraping non plafonné
**Fichier :** `src/app/api/public/movers/route.ts:91-99`
**Description :** Pagination jusqu'à `offset=10000`, `limit=100`, 60 req/min/IP = 6000 movers/min scrappables. Avec le spoof XFF, dataset complet aspiré en minutes. `total` exact aide l'attaquant à orchestrer.
**Risque :** Énumération complète, vol concurrentiel. `count: "exact"` à chaque page coûte cher en DB → vecteur d'amplification de coût.
**Reco :** Renvoyer `total` arrondi (« 1000+ »), réduire le rate-limit à 30 req/min, ajouter délai pour `offset > 200`. Migrer vers `count: "estimated"`.

---

### [MOYEN] Reviews — `comment` non sanitisé (risque XSS stocké)
**Fichier :** `src/app/api/public/reviews/route.ts:21`
**Description :** `body.comment` uniquement `.trim().slice(0, 2000)`, aucun strip HTML. Pareil `reviewerName`. Si la page affiche via `dangerouslySetInnerHTML` ou un email HTML non-encodé → XSS stocké.
**Risque :** XSS persistant ciblant movers / visiteurs publics du profil mover. Vol de session admin si l'admin lit les avis.
**Reco :** Sanitiser à l'écriture (DOMPurify côté serveur), audit des renderers en aval (emails surtout — React échappe par défaut, mais transactional templates non).

---

### [MOYEN] Reviews — TOCTOU sur usage du token
**Fichier :** `src/app/api/public/reviews/route.ts:56-91`
**Description :** Insert review → mark token used → recount → update company.rating. Pas de transaction. Entre l'insert et le `update used_at`, un POST concurrent avec le même token peut passer.
**Risque :** Double review « vérifié » avec le même token. Manipulation de la note moyenne.
**Reco :** `update used_at … where token=? AND used_at IS NULL` AVANT l'insert, abandonner si rowCount = 0. Ou RPC Postgres en transaction atomique.

---

### [MOYEN] Reviews — leak du prénom client si token leak
**Fichier :** `src/app/api/public/reviews/route.ts:144-151`
**Description :** GET renvoie `client_first_name` du quote_request via token. Faible risque seul (tokens longs/aléatoires), mais si URL leak (logs Sentry, partage email non chiffré) → PII exposé.
**Reco :** Stripper les query params sensibles dans les logs. Vérifier que les tokens review ne sont pas indexés/loggés.

---

### [MOYEN] /quote-reconfirm — side-channel sur status interne
**Fichier :** `src/app/api/public/quote-reconfirm/route.ts:34-44`
**Description :** Codes de retour 400/404/410 différencient les états internes du quote (« introuvable » vs « date initiale manquante »). Sur un token valide, c'est un canal d'inférence.
**Risque :** Faible. Anti-pattern.
**Reco :** Uniformiser les erreurs business à `{ ok: false }` générique.

---

### [MOYEN] Reviews — mass-assignment léger sur isAnonymous
**Fichier :** `src/app/api/public/reviews/route.ts:61-63`
**Description :** `isAnonymous: !!body.isAnonymous` accepté brut. Le whitelisting champ-par-champ tient, mais `reviewerName` est nullé si anonyme.
**Reco :** Documenter le contrat. Pas de fix nécessaire.

---

### [BAS] /blog/[slug] — `select("*")` non whitelisté
**Fichier :** `src/app/api/public/blog/[slug]/route.ts:28`
**Description :** Si demain un champ interne est ajouté à `blog_posts` (ex `internal_notes`, `author_email`), il fuitera silencieusement.
**Reco :** Whitelister les colonnes (comme dans la route GET /blog list).

---

### [BAS] /blog/[slug] — preview admin via cookie sans CSRF
**Fichier :** `src/app/api/public/blog/[slug]/route.ts:23-31`
**Description :** Le mode preview lit `admin_token` cookie. GET donc pas d'effet de bord. Same-origin policy bloque la lecture cross-origin.
**Reco :** Vérifier `SameSite=Lax` ou `Strict` sur le cookie `admin_token`.

---

### [BAS] /movers — clause `or()` sans échappement de `%` et `_`
**Fichier :** `src/app/api/public/movers/route.ts:49-58`
**Description :** Le strip regex tient bien, mais `%` et `_` (wildcards `ilike`) ne sont pas échappés. Un user peut taper `%` pour matcher tout. Pas grave, à noter.
**Reco :** Si volonté de matcher littéralement, échapper `%` et `_`.

---

### [BAS] Toutes les routes publiques — pas de Zod, validation ad hoc
**Fichier :** Les 6 routes publiques
**Description :** Coercion manuelle (`Number`, `parseInt`, `String`). Risque d'incohérence (`slug` jamais validé en longueur/format).
**Reco :** Adopter Zod systématiquement (auto-doc + erreurs claires + centralisation des regex de slug).

---

### [BAS] Reviews — pas de protection contre coercion de `body.token`
**Fichier :** `src/app/api/public/reviews/route.ts:19`
**Description :** `(body.token || "").toString()` accepte des objets avec `toString()` custom. Le check `!token` derrière attrape le vide.
**Reco :** Zod sur le body.

---

### [INFO] Méthodes HTTP non utilisées
Aucune route n'expose PUT/DELETE inutilement — Next.js renvoie 405 par défaut. RAS.

### [INFO] CORS non configuré
Pas de headers CORS custom — bon comportement pour des routes publiques destinées au front Next.js du même domaine.

### [INFO] /movers/[slug] — reviews non plafonnées
**Fichier :** `src/app/api/public/movers/[slug]/route.ts:30`
**Description :** `reviews(...)` joint sans `.limit()`. Une entreprise avec 10k reviews renvoie tout.
**Reco :** `.limit(50)` côté reviews + pagination front.

### [INFO] /movers/[slug] — `company_qna` enrichi à chaque GET
**Fichier :** `src/app/api/public/movers/[slug]/route.ts:43-63`
**Description :** Enrichissement DB à chaque hit. Coût modéré, pas un risque sécu mais cible facile à amplifier.
**Reco :** Caching Next.js (`revalidate: 60`) ou Vercel CDN.

## Findings — `/api/dashboard/*`

### [HAUT] RLS bypass systémique — toutes les routes utilisent l'admin client
**Fichiers :** les 8 routes (`overview/route.ts:17`, `profile/route.ts:19,93`, `billing/route.ts:18`, `regions/route.ts:26,64`, `performance/route.ts:76`, `claims/route.ts:29`, `contact/route.ts:33`, `upload/route.ts:32`)
**Description :** Chaque route construit `createUntypedAdminClient()` (service role) et passe TOUTES ses queries via ce client. La sécurité repose ENTIÈREMENT sur les filtres `eq("company_id", company.id)` ajoutés à la main, jamais sur la RLS Supabase.
**Risque :** Une seule query future qui oublierait ce filtre = lecture/écriture cross-tenant complète. Pas de filet de sécurité côté DB. Anti-pattern dangereux pour une marketplace multi-tenant.
**Reco :** Privilégier `createClient()` (qui propage le JWT) pour les lectures simples scopées par `company_id`, laisser RLS faire le travail. Réserver l'admin client aux opérations qui nécessitent réellement le service role (`ensureCompanyForUser`, system ops). À défaut : test d'intégration cross-tenant pour chaque route.

---

### [HAUT] Mass-assignment latent : whitelist manuelle dans profile PATCH
**Fichier :** `src/app/api/dashboard/profile/route.ts:281-310`
**Description :** `allowedFields = ["description", "phone", "email_contact", "website", "employee_count", "address", "postal_code", "city"]`. Correct *aujourd'hui*. Mais aucun Zod schema. Si un dev ajoute un champ admin-only à `companies` (ex `is_verified`, `account_status`, `kyc_status`, `commission_rate`) et l'inclut par mégarde, ou copie ce pattern ailleurs, élévation immédiate.
**Risque :** Élévation de privilèges latente / mass assignment au prochain ajout de champ.
**Reco :** Remplacer par schéma Zod strict. Exclure explicitement via Pick/Omit TS les champs sensibles. Test unitaire qui injecte ces champs et vérifie qu'ils sont ignorés.

---

### [HAUT] Upload — validation MIME basée uniquement sur `file.type` (déclaration cliente) + SVG accepté
**Fichier :** `src/app/api/dashboard/upload/route.ts:59-71` + `src/lib/blob.ts:12-22`
**Description :** Le check `ALLOWED_IMAGE_TYPES.includes(file.type)` se fie au header `Content-Type` envoyé par le client. Un attaquant peut uploader `payload.svg` avec un faux `Content-Type: image/png`. Pire : `image/svg+xml` est dans la whitelist → SVG = XML qui peut contenir des `<script>` exécutés au navigateur si servi sur un blob public.
**Risque :** XSS stockée via SVG malveillant servi sur le profil mover (visible par les prospects), upload de contenu non-image.
**Reco :** (1) Magic-bytes côté serveur (`file-type` package). (2) Retirer `image/svg+xml` ou sanitiser via DOMPurify côté serveur avant upload. (3) Vérifier que les pages publiques affichent ces blobs via `<img>` (pas `<object>`/`<iframe>`).

---

### [MOYEN] Pas de rate-limit sur les GET coûteux (overview, billing, performance, regions, profile)
**Fichiers :** `overview/route.ts:9`, `billing/route.ts:8`, `performance/route.ts:69`, `regions/route.ts:18`, `profile/route.ts:9`
**Description :** Ces GET déclenchent 5–10 requêtes Supabase (overview ~7 + `backfillLeadsForCompany` conditionnel). `claims`, `contact`, `upload` ont du rate-limit, mais pas les GET. Mover authentifié peut hammer `/api/dashboard/overview` à 100 req/s.
**Risque :** DoS / coût Supabase. Un mover compromis ou un bot peut faire exploser la facture.
**Reco :** `checkIpRateLimit` (ou par user.id) sur tous les GET, ex 60/min.

---

### [MOYEN] regions — `id` non validé sur remove_region/remove_radius
**Fichier :** `src/app/api/dashboard/regions/route.ts:103-117, 156-171`
**Description :** `delete().eq("id", id).eq("company_id", company.id)`. Aucune validation que `id` est un UUID. Le filtre `company_id` contient le risque (pas d'IDOR), mais comportement flou si `id === undefined`.
**Reco :** Valider via Zod (`id.uuid()`), retourner 400 sinon.

---

### [MOYEN] upload — path basé sur `Date.now()` + `allowOverwrite: true`
**Fichier :** `src/app/api/dashboard/upload/route.ts:92` + `src/lib/blob.ts:33-38`
**Description :** Pathname `${folder}/${companyId}/${Date.now()}.${ext}`. Deux uploads concurrents dans la même milliseconde s'écrasent. Pas exploitable cross-tenant (auth + companyId server-side), mais perte silencieuse de fichiers.
**Reco :** Suffixe random (`crypto.randomUUID().slice(0,8)`) ou `addRandomSuffix: true` Vercel Blob.

---

### [MOYEN] upload — pas de cap pour les logos (uniquement les photos sont limitées à 4)
**Fichier :** `src/app/api/dashboard/upload/route.ts:76-88, 96-97`
**Description :** Le cap `4 photos` n'existe que pour `type === "photo"`. Pour `type === "logo"`, UPDATE `logo_url` à chaque appel sans suppression de l'ancien. Sur 24h un mover génère 480 logos orphelins.
**Reco :** Avant UPDATE, lire l'ancien `logo_url` et `deleteBlob(old)`.

---

### [MOYEN] claims/contact/upload — rate-limit IP-based contournable derrière NAT/CGNAT
**Fichiers :** `claims/route.ts:20-27`, `contact/route.ts:24-31`, `upload/route.ts:23-30`
**Description :** `getClientIp(request)`. Pour endpoints authentifiés, un cap par `user.id` ou `company_id` est plus juste (équipes derrière même IP bloquées par un collègue, attaquant via VPN rotatif contourne).
**Reco :** Combiner IP + user.id : `checkIpRateLimit(\`${ip}:${user.id}\`, ...)` ou helper `checkUserRateLimit(user.id, ...)`.

---

### [MOYEN] claims — pas de check d'unicité par lead/mover
**Fichier :** `src/app/api/dashboard/claims/route.ts:93-99`
**Description :** Aucun garde-fou contre N claims pour le même `quote_distribution_id`. Mover peut spammer 20 réclamations sur le même lead. Rate-limit IP global = 20/h, atteignable avec un seul lead.
**Risque :** Spam de l'inbox modération, abuse de défect-detection auto.
**Reco :** `select count from claims where quote_distribution_id = ? and company_id = ?` avant insert. Rejeter si > 0 (ou > 1 pour permettre réouverture).

---

### [MOYEN] profile — pas de validation longueurs/formats sur companies fields
**Fichier :** `src/app/api/dashboard/profile/route.ts:281-310`
**Description :** `description`, `phone`, `email_contact`, `website`, `employee_count`, `address`, `postal_code`, `city` passés au UPDATE tels quels. `description` peut être 10 MB. `email_contact` peut être un non-email. `website` peut être `javascript:alert(1)` (puis affiché en lien public).
**Risque :** Bloat DB, stored XSS si `website` rendu dans `<a href>` sans sanitization, email contact invalide qui casse `notifyAdminNewClaim`.
**Reco :** Schéma Zod par champ. `description.max(2000)`, `website.url()`, `email_contact.email()`, `phone.regex(...)`.

---

### [BAS] regions — `department_name = department_code` (legacy)
**Fichier :** `src/app/api/dashboard/regions/route.ts:88-93`
**Description :** Bug fonctionnel, pas sécurité.
**Reco :** Mapper `department_code → "Aisne (02)"` via correspondance.

---

### [BAS] overview — leak indirect via competitor_count / totalUnlocks
**Fichier :** `src/app/api/dashboard/overview/route.ts:108-110, 122-123`
**Description :** Information business intentionnelle (« 4/6 places prises ») mais aide à inférer la population de concurrents par ville/catégorie.
**Reco :** RAS si voulu produit. Documenter.

---

### [BAS] claims/contact/upload — console.error des erreurs Supabase
**Fichiers :** `claims/route.ts:102, 138, 144`, `contact/route.ts:81`, `upload/route.ts:123`
**Description :** Le client ne reçoit que message générique — pas de leak côté wire. Bon pattern.
**Reco :** Confirmer que les logs ne contiennent pas de PII (email/SIRET) en prod. Sinon scrub avant log.

---

### [BAS] contact — admin_note stocke conversation en JSON-string sérialisé
**Fichier :** `src/app/api/dashboard/contact/route.ts:63-65, 75`
**Description :** `JSON.stringify([{from, message, date}])` dans une colonne TEXT. Fragile, pas sécurité.
**Reco :** Vraie table `claim_messages(claim_id, from, message, created_at)` ou typer en jsonb.

---

### [BAS] regions GET — réponse incohérente quand non authentifié
**Fichier :** `src/app/api/dashboard/regions/route.ts:22-24`
**Description :** `NextResponse.json([], { status: 401 })` — body tableau au lieu de `{error}`. Inconsistant avec les 7 autres routes.
**Reco :** Aligner sur `{ error: "Non autorisé" }`.

---

### [INFO] ensureCompanyForUser — création silencieuse d'une compagnie placeholder
**Fichier :** `src/lib/ensure-company.ts:36-49` (utilisé par overview/profile/billing/performance)
**Description :** Si un user.id n'a pas de row `companies`, l'helper crée une compagnie avec SIRET temporaire (`TEMP-${userId}`) et `account_status: "pending"`. Self-healing documenté. À surveiller si vous introduisez d'autres rôles.
**Reco :** Vérifier le `role` du profile (`profiles.role === "mover"`) avant `ensureCompanyForUser`, ou guarder via middleware role-based.

---

### [INFO] Inconsistance pattern company lookup — 4 routes utilisent `eq("profile_id", user.id)` directement
**Fichiers :** `regions/route.ts:29-32`, `claims/route.ts:32-36`, `contact/route.ts:35-39`, `upload/route.ts:34-38`
**Description :** 4 routes lookent `companies` directement (404 si absente), tandis que `overview`, `profile`, `billing`, `performance` utilisent `ensureCompanyForUser` (qui crée si absente). Pas de défaut sécu, mais source de bugs UX.
**Reco :** Pattern unique. Probablement `ensureCompanyForUser` partout, ou middleware qui résout `company_id` une fois.

---

### [INFO] performance — `force-dynamic` sans cache → query lourde à chaque hit
**Fichier :** `src/app/api/dashboard/performance/route.ts:6`
**Reco :** Voir finding [MOYEN] rate-limit.

---

### [INFO] billing — URLs de factures via storage Supabase potentiellement public
**Fichier :** `src/app/api/dashboard/billing/route.ts:131-137`
**Description :** Les `invoice_url` sont assemblées en URL publique `/storage/v1/object/public/invoices/...`. Si le bucket `invoices` est en mode `public`, n'importe qui avec l'URL peut télécharger la facture (nom mover, montants, SIRET, date).
**Risque :** Si bucket public + path prédictible → exposition de factures. À vérifier dans la config Supabase Storage.
**Reco :** Bucket en `private` + signed URLs (15 min) côté serveur. Sinon vérifier que les pathnames contiennent suffisamment d'entropie (UUID v4 + token).

## Notes hors-scope (à creuser)

Ces points sont sortis du périmètre `/api/public/*` + `/api/dashboard/*` mais méritent attention :

- **`getWalletBalanceCents`** (`lib/wallet`) : vérifier que le calcul est read-only et scopé `company_id`.
- **`backfillLeadsForCompany`** : déclenché auto depuis overview — vérifier qu'il ne peut pas être abusé (créer des distributions artificiellement). Couplé à l'absence de rate-limit overview = vecteur potentiel.
- **`serverError(...)`** (`lib/api-errors`) : vérifier qu'il ne renvoie pas la `error.message` brut Supabase au client (qui pourrait contenir nom de table/colonne).
- **`auth.audit_log_entries`** Supabase : table interne audit auth déjà existante, à exposer dans une page admin si besoin de visualiser les logs de connexion mover sans nouvelle table.

## Recommandations stratégiques

### Quick wins (1-2j)
1. **Fix `getClientIp()`** pour utiliser `request.ip` Vercel — débloque tous les rate-limits.
2. **`throw` au boot si `ADMINJS_COOKIE_SECRET` absent** + introduire `RECONFIRM_TOKEN_SECRET` séparé.
3. **Retirer `siret`/`vat_number`** de `/api/public/movers/[slug]`.
4. **Désactiver `image/svg+xml`** dans l'upload + ajouter validation magic-bytes.
5. **Ajouter rate-limit sur les GET dashboard** coûteux.

### Hardenings structurels (3-5j)
6. **Adopter Zod** systématiquement pour validation body/query sur les 14 routes (auto-doc + sécurité).
7. **Migrer dashboard vers RLS** : passer du admin client au user client là où c'est possible. Garder admin client uniquement pour `ensureCompanyForUser` et ops système.
8. **Helper `checkUserRateLimit(user.id, ...)`** combiné avec `checkIpRateLimit` pour les routes authentifiées.
9. **Reviews TOCTOU fix** : ordering `update used_at WHERE used_at IS NULL` AVANT insert.

### Préparatoire RBAC (à coupler avec le projet RBAC en attente)
10. **Middleware role-based** qui résout `company_id` une fois pour toutes au lieu de `ensureCompanyForUser` ad hoc dans 4-5 fichiers — alignement avec la roadmap RBAC déjà décidée.

---

**Auditeurs :** 2 agents general-purpose dispatchés en parallèle (~2 min chacun).
**Fichiers consultés :** 14 routes + 5 helpers (`rate-limit.ts`, `quote-reconfirm-token.ts`, `admin-auth.ts`, `blob.ts`, `ensure-company.ts`, `api-errors.ts`).
