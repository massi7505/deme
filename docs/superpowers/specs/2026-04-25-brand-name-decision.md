# Décision de marque demenagement24 — shortlist 4 finalistes

**Date** : 2026-04-25
**Statut** : ⏸️ **EN PAUSE** — l'utilisateur réfléchit 24h+ avec ses proches sur la shortlist avant de choisir

## Brief retenu

| Dimension | Choix |
|---|---|
| Scope géographique | France uniquement (pas d'expansion EU prévue) |
| Tonalité | Sérieux/confiance + Moderne/disruption (vibe Doctolib × Allianz) |
| Sémantique | Confiance/vérification + Simplicité/vitesse |
| Référence stylistique | Nextories (cf. plateformes que l'utilisateur a citées : demenagement24, AnyVan, Nextories) |
| Style attendu | Court, évocateur ou inventé, racine FR/Latin, prononçable instantanément en français, sans accent obligatoire |
| Critère bloquant | Domaine .fr libre + zéro collision sectorielle déménagement/transport en FR |

## Méthodologie

5 rounds successifs de brainstorm + WHOIS pre-check :
- **Round 1** (Pakto + 8 fallbacks) → tous bloqués (Pakto a EUIPO 017322512 + .fr pris depuis 1999, fallbacks pris)
- **Round 2** (8 candidats premium-Latin) → 2 survivants .fr (Trovex, Voyam), Trovex tué par UK family business healthcare
- **Round 3** (8 candidats "Nextories à la française") → **2 survivants forts (Cartories, Voyaries) + 1 écarté (Maistories — collision Mai Stories Inde)**
- **Round 4** (8 candidats patrimoine FR + mythologie) → 1 survivant faible (Yveo)
- **Round 5** (8 candidats lettres rares Y/W/K) → 4 survivants dont Foyora intéressant, autres faibles (Movux, Klyxen) ou pris (Yvora, Voilou, Néovia)

**Leçon retenue** : le marché .fr des noms premium courts est saturé depuis 1999-2014. Les noms évidents et beaux ont tous été pris. Seuls les inventés non-évidents ou les composés originaux ont une chance.

## Shortlist finale (4 candidats)

### 1. ⭐ Cartories (round 3) — pick statistique le plus fort

| | |
|---|---|
| .fr | 🟢 LIBRE |
| .com | 🟢 **LIBRE** (rare !) |
| Collision marque | 🟢 Aucune (Cartier = mot différent) |
| Sémantique | Carton (icône moving universelle) + Stories (nouveau chapitre) |
| Vibe | Miroir parfait de Nextories en plus concret |
| Storytelling | *"Cartories — chaque carton, une nouvelle histoire."* |
| Logo | Évident : carton stylisé |
| SEO | Bonus : "carton" est un mot-clé moving direct |

### 2. Foyora (round 5) — angle différent, focus arrivée

| | |
|---|---|
| .fr | 🟢 LIBRE |
| .com | 🔴 Pris (2023, parking Singapour Gname.com) |
| Collision marque | 🟢 Aucune en moving (Fyor UAE shoes / Foya Foods US — secteurs étrangers) |
| Sémantique | Foyer + suffixe -ora premium (vibe Sephora/Pandora) |
| Vibe | FR-feel, focus sur "rentrer chez soi" plutôt que "voyage/carton" |
| Storytelling | *"Foyora — votre nouveau foyer, sereinement."* |
| Logo | Toit / porte / clé |

### 3. Voyaries (round 3) — vibe voyage poétique

| | |
|---|---|
| .fr | 🟢 LIBRE |
| .com | 🟢 LIBRE |
| Collision marque | 🟢 Aucune (Voyage Brand AMS / Virgin Voyages = mots différents) |
| Sémantique | Voyage + suffixe -ries (boutique-ancien, vibe boutique-de-voyage) |
| Vibe | Plus poétique que Cartories, moins iconique |
| Storytelling | *"Voyaries — votre voyage de vie, accompagné."* |

### 4. Voyam (round 2) — le plus court

| | |
|---|---|
| .fr | 🟢 LIBRE |
| .com | 🔴 Pris (SSL cassé — squatter ou abandonné) |
| Collision marque | 🟢 Aucune (Voya travel fashion = mot différent) |
| Sémantique | Évoque "voyage" en 1 lettre d'écart, instantanément |
| Vibe | Court (5 lettres), Qonto-style |
| Risque | Handle IG @voyam déjà pris (Asian personal account inactif) |

## ⚠️ Risque commun à TOUS les finalistes : EUIPO non vérifié

L'utilisateur n'a pas vérifié les marques EUIPO/INPI sur Cartories, Foyora, Voyaries, Voyam. Une marque EU couvre la France automatiquement.

### Action de levée du risque (à faire AVANT décision finale)

1. Aller sur [eSearch plus EUIPO](https://euipo.europa.eu/eSearch/) — recherche par mot
2. Aller sur [data.inpi.fr/marques/](https://data.inpi.fr/marques/) — recherche similarité
3. Tester les 4 finalistes en classes Nice **35** (publicité/services aux entreprises/lead gen), **39** (transport/déménagement), **42** (logiciels/SaaS)
4. Pour chaque finaliste, noter :
   - Statut (Enregistrée / Expirée / Annulée / Pending / Opposée)
   - Classes couvertes
   - Titulaire et pays
5. Verdict par finaliste :
   - 🟢 Aucune marque trouvée → safe
   - 🟡 Marque trouvée mais classes non liées (ex: 25 vêtements) → risque faible
   - 🔴 Marque en classe 35/39/42 active → bascule sur autre finaliste

## Plan d'action après choix final

### Jour 0 (validation EUIPO)

- [ ] Vérifier EUIPO + INPI sur les 4 finalistes (5 min × 4 = 20 min)
- [ ] Décision finale entre les survivants

### Jour 1 (achat)

- [ ] Réserver `[nom].fr` chez Gandi/OVH (~10 €/an)
- [ ] Réserver `[nom].com` si libre (~15 €/an) — défensif
- [ ] Réserver `[nom].eu` defensive (~15 €/an)
- [ ] Réserver les handles : `@[nom].fr` IG, `@[nom]` TikTok, `/[nom]-france` LinkedIn, `@[nom]fr` X

### Semaine 1 (dépôt + config technique)

- [ ] Dépôt INPI classes 35 + 39 + 42 (~190 €)
- [ ] Vercel : env vars `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `EMAIL_FROM`
- [ ] Supabase : update `site_settings.data.siteUrl` / `siteName`
- [ ] DNS `[nom].fr` → Vercel + ajout domaine au projet

### Semaine 2 (SEO unblock + Cloudflare)

- [ ] robots.txt : host correct
- [ ] sitemap : URLs corrigées
- [ ] `/a-propos` page avec SIRET + mention marque
- [ ] `public/llms.txt` avec brand statement
- [ ] 5 articles blog avec auteur nommé
- [ ] Débloquer GPTBot + CCBot
- [ ] Cloudflare devant Vercel (Bot Fight Mode + WAF + cache rules excluant `/api/*`, `/admin/*`, `/dashboard/*`)

## Candidats explicitement écartés (ne pas re-proposer)

- **Pakto** — EUIPO 017322512 + .fr pris depuis 1999
- **Trovex** — UK family business healthcare 25 ans
- **Trasko** — TRASKO LLC Russia transport/3PL 1000+ employés (collision frontale classe 39)
- **Drovo** — Drovo UK Series A "Drive+Move" transit advertising
- **Trivio** — Trivio Cycling marque vélo EU établie + Trivio Europe BV NL
- **Demzy** — tonalité consumer-app fun ne match pas le brief A+B + collision SEO Demzy BaYe (danseur ghanéen) + INPI fragile car "dem-" descriptif
- **Maistories** — Mai Stories Inde event design 19K IG
- Solis, Klivo, Veylo, Trezo, Voxio, Wexo, Norvex, Trazo, Devisly, Devizen, Demeo, Voxa, Atterro, Estafette, Cordée, Boréa, Mobéa, Trajéo, Soleo, Karavane, Yvora, Néovia, Voilou — tous .fr pris

## Décision

**EN PAUSE.** L'utilisateur valide une option de la shortlist (Cartories ⭐ recommandé / Foyora / Voyaries / Voyam) après vérification EUIPO et réflexion personnelle.

Reprendre la session sur ce doc quand la décision est faite.
