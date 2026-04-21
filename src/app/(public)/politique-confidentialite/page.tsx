"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import Link from "next/link";
import { useSiteSettings } from "@/hooks/use-site-settings";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const LAST_UPDATED = "21 avril 2026";

export default function PolitiqueConfidentialitePage() {
  const { siteName, siteUrl, contactEmail } = useSiteSettings();
  const brand = siteName || "la Plateforme";
  const url = siteUrl || "[à compléter : URL du site]";
  const email = contactEmail || "[à compléter]";

  return (
    <>
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white">
        <div className="container py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div
              variants={fadeUp}
              custom={0}
              className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-green-100 text-green-700"
            >
              <Shield className="size-7" />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl"
            >
              Politique de confidentialité
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-lg leading-relaxed text-muted-foreground"
            >
              Comment {brand} collecte, utilise et protège vos données personnelles conformément au RGPD.
            </motion.p>
            <motion.p
              variants={fadeUp}
              custom={3}
              className="mt-2 text-sm text-muted-foreground"
            >
              Dernière mise à jour : {LAST_UPDATED}
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="container py-12">
        <div className="mx-auto max-w-3xl space-y-10 text-gray-800 leading-relaxed">
          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données collectées sur {url} est <em>[à compléter : dénomination sociale]</em>, dont les coordonnées complètes figurent dans les{" "}
              <Link href="/mentions-legales" className="text-green-700 underline">mentions légales</Link>. Pour toute question relative à vos données, vous pouvez contacter :{" "}
              <a href={`mailto:${email}`} className="text-green-700 underline">{email}</a>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">2. Données collectées</h2>
            <p className="mb-3">Nous collectons les données suivantes&nbsp;:</p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-950">Clients (particuliers et entreprises demandant un devis)</h3>
                <ul className="mt-2 list-disc pl-6 space-y-1">
                  <li>Identité : nom, prénom</li>
                  <li>Coordonnées : adresse e-mail, numéro de téléphone</li>
                  <li>Informations de déménagement : adresses de départ et d&apos;arrivée, volume, date souhaitée, services demandés</li>
                  <li>Données de vérification : code OTP envoyé par e-mail et SMS</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-950">Entreprises de déménagement (movers)</h3>
                <ul className="mt-2 list-disc pl-6 space-y-1">
                  <li>Identité société : raison sociale, SIRET, forme juridique, TVA</li>
                  <li>Coordonnées : adresse du siège, téléphone, e-mail</li>
                  <li>Représentant légal : nom, prénom, fonction, pièce d&apos;identité (KYC)</li>
                  <li>Informations bancaires (pour facturation Mollie)</li>
                  <li>Zone de couverture, services proposés, tarifs</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-950">Données de navigation</h3>
                <ul className="mt-2 list-disc pl-6 space-y-1">
                  <li>Adresse IP, type de navigateur, pages visitées, date et heure</li>
                  <li>Cookies techniques (session, sécurité)</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">3. Finalités et bases légales</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Mise en relation client/mover</strong> (exécution du contrat) : traiter les demandes de devis, les distribuer aux movers pertinents.</li>
              <li><strong>Gestion du compte mover</strong> (exécution du contrat) : inscription, authentification, facturation, wallet de crédits.</li>
              <li><strong>Vérification d&apos;identité (KYC)</strong> (obligation légale) : conformité anti-fraude et anti-blanchiment.</li>
              <li><strong>Facturation et paiement</strong> (obligation légale) : émission de factures, conservation comptable.</li>
              <li><strong>Avis clients</strong> (intérêt légitime) : collecte et modération des avis après prestation.</li>
              <li><strong>Communication transactionnelle</strong> (exécution du contrat) : e-mails relatifs à la demande, rappels, notifications.</li>
              <li><strong>Mesure d&apos;audience</strong> (consentement) : analyse de l&apos;usage du site lorsque l&apos;utilisateur y consent.</li>
              <li><strong>Amélioration du service</strong> (intérêt légitime) : statistiques agrégées et anonymisées.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">4. Destinataires des données</h2>
            <p className="mb-3">Vos données peuvent être transmises aux destinataires suivants, dans la stricte limite des finalités&nbsp;:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Entreprises de déménagement</strong> destinataires de votre demande de devis (coordonnées strictement nécessaires à la réponse).</li>
              <li><strong>Mollie B.V.</strong> (prestataire de paiement, Pays-Bas) pour le traitement des paiements des movers.</li>
              <li><strong>Resend Inc.</strong> (États-Unis) pour l&apos;envoi des e-mails transactionnels.</li>
              <li><strong>Vercel Inc.</strong> (États-Unis) pour l&apos;hébergement applicatif.</li>
              <li><strong>Supabase Inc.</strong> (Singapour / UE) pour le stockage des données de la base de données.</li>
              <li><strong>SMS Factor</strong> (France) pour l&apos;envoi de SMS de vérification.</li>
              <li><strong>Mapbox</strong> (États-Unis) pour les services de cartographie (adresses envoyées sous forme anonyme).</li>
              <li><strong>Autorités légales</strong> uniquement en cas de réquisition.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">5. Transferts hors Union européenne</h2>
            <p>
              Certains sous-traitants (Vercel, Resend, Mollie, Mapbox) sont situés hors de l&apos;Union européenne. Ces transferts sont encadrés par des Clauses Contractuelles Types adoptées par la Commission européenne ou par le mécanisme du Data Privacy Framework lorsque applicable, garantissant un niveau de protection équivalent.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">6. Durées de conservation</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Demandes de devis : <strong>3 ans</strong> à compter du dernier contact (prospection commerciale).</li>
              <li>Comptes movers actifs : durée de la relation contractuelle.</li>
              <li>Comptes inactifs : suppression ou anonymisation après <strong>3 ans</strong> d&apos;inactivité.</li>
              <li>Documents KYC : <strong>5 ans</strong> après la fin de la relation (obligation légale).</li>
              <li>Factures et données comptables : <strong>10 ans</strong> (obligation légale).</li>
              <li>Avis clients : conservés tant que le profil mover existe.</li>
              <li>Données de navigation : <strong>13 mois</strong> maximum.</li>
              <li>E-mails transactionnels : <strong>1 an</strong>.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">7. Vos droits</h2>
            <p className="mb-3">Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants&nbsp;:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Droit d&apos;accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l&apos;effacement (« droit à l&apos;oubli »)</li>
              <li>Droit à la limitation du traitement</li>
              <li>Droit à la portabilité de vos données</li>
              <li>Droit d&apos;opposition au traitement</li>
              <li>Droit de retirer votre consentement à tout moment</li>
              <li>Droit de définir des directives relatives au sort de vos données après votre décès</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous par e-mail à <a href={`mailto:${email}`} className="text-green-700 underline">{email}</a> en précisant l&apos;objet de votre demande et en joignant un justificatif d&apos;identité si nécessaire. Nous répondrons dans un délai d&apos;un mois.
            </p>
            <p className="mt-3">
              En cas de désaccord persistant, vous pouvez introduire une réclamation auprès de la <strong>CNIL</strong> (3 place de Fontenoy, 75007 Paris —{" "}
              <a href="https://www.cnil.fr" className="text-green-700 underline" target="_blank" rel="noopener noreferrer">cnil.fr</a>).
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">8. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données&nbsp;: chiffrement des communications (HTTPS/TLS), contrôle d&apos;accès basé sur les rôles, authentification forte, sauvegardes régulières, minimisation des données et surveillance de nos prestataires.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">9. Cookies</h2>
            <p>
              Le site utilise des cookies strictement nécessaires (session, sécurité) qui ne requièrent pas de consentement. Les cookies de mesure d&apos;audience ou de préférences sont déposés uniquement après votre consentement exprès, que vous pouvez retirer à tout moment.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">10. Modifications</h2>
            <p>
              La présente politique peut être mise à jour à tout moment. La date de dernière mise à jour figure en haut de la page. En cas de modification substantielle, nous vous en informerons par e-mail ou via une notification sur le site.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
