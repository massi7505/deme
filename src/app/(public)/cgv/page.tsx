"use client";

import { motion } from "framer-motion";
import { Scale } from "lucide-react";
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

export default function CgvPage() {
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
              <Scale className="size-7" />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl"
            >
              Conditions générales de vente
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-lg leading-relaxed text-muted-foreground"
            >
              Conditions applicables aux services payants proposés par {brand}.
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
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">1. Préambule</h2>
            <p>
              Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent les relations contractuelles entre l&apos;éditeur du site {url} (ci-après « la Plateforme ») et les entreprises de déménagement utilisatrices des services payants (ci-après « le Mover »). Elles complètent les{" "}
              <Link href="/cgu" className="text-green-700 underline">Conditions Générales d&apos;Utilisation</Link>.
            </p>
            <p className="mt-3">
              Le service de demande de devis proposé aux clients (particuliers et entreprises cherchant à déménager) est entièrement <strong>gratuit et sans engagement</strong>. Les présentes CGV ne concernent donc pas les clients.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">2. Définitions</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Plateforme</strong> : le site {url} édité par {brand}.</li>
              <li><strong>Mover</strong> : entreprise de déménagement professionnelle inscrite sur la Plateforme.</li>
              <li><strong>Client</strong> : particulier ou entreprise soumettant une demande de devis.</li>
              <li><strong>Lead</strong> : demande de devis distribuée au Mover.</li>
              <li><strong>Wallet</strong> : portefeuille électronique du Mover, crédité en euros et permettant le déblocage des leads.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">3. Services proposés aux Movers</h2>
            <p>La Plateforme propose aux Movers les services suivants&nbsp;:</p>
            <ul className="mt-3 list-disc pl-6 space-y-1">
              <li>Création d&apos;un profil d&apos;entreprise visible par les Clients&nbsp;;</li>
              <li>Réception de notifications de demandes de devis correspondant à leur zone et à leurs critères&nbsp;;</li>
              <li>Achat de leads via le Wallet afin d&apos;accéder aux coordonnées complètes du Client&nbsp;;</li>
              <li>Gestion de la facturation, de la comptabilité et des statistiques de performance.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">4. Inscription et ouverture de compte</h2>
            <p>
              L&apos;inscription d&apos;un Mover est soumise à la fourniture d&apos;informations exactes et à la validation des documents d&apos;identification (SIRET, KYC). La Plateforme se réserve le droit de refuser une inscription sans avoir à justifier sa décision.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">5. Tarifs et paiement</h2>
            <p>
              Le prix d&apos;un lead dépend de critères tels que le volume estimé, la distance, le type de prestation et l&apos;état du marché. Le prix est affiché <strong>toutes taxes comprises</strong> avant validation de l&apos;achat.
            </p>
            <p className="mt-3">
              Le Mover alimente son Wallet par versement préalable. Les paiements sont traités par <strong>Mollie B.V.</strong>, prestataire agréé, via carte bancaire, SEPA ou virement selon les moyens disponibles. Une facture est émise automatiquement pour chaque rechargement et reste accessible depuis l&apos;espace{" "}
              <em>Facturation</em>.
            </p>
            <p className="mt-3">
              Les montants crédités dans le Wallet ne sont pas remboursables, sauf dans les cas limitativement énumérés à l&apos;article 7.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">6. Achat d&apos;un lead</h2>
            <p>
              Lorsqu&apos;une demande de devis correspond au périmètre d&apos;un Mover, une notification lui est envoyée avec un aperçu de la demande. Le Mover peut choisir d&apos;« acheter » ce lead, ce qui débite son Wallet du montant affiché et lui donne accès aux coordonnées complètes du Client.
            </p>
            <p className="mt-3">
              Une fois le lead débloqué, la transaction est <strong>ferme et définitive</strong>. Le Mover reconnaît que le lead contient une demande authentique qu&apos;il lui revient de convertir.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">7. Remboursement d&apos;un lead (réclamation)</h2>
            <p>
              Le Mover peut demander le remboursement d&apos;un lead dans un délai de <strong>7 jours</strong> à compter de son achat, par l&apos;intermédiaire du formulaire disponible sur la page{" "}
              <Link href="/reclamation" className="text-green-700 underline">Réclamation</Link>, dans les cas suivants&nbsp;:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1">
              <li>Coordonnées manifestement fausses ou injoignables après au moins 3 tentatives sur deux canaux différents (téléphone + e-mail)&nbsp;;</li>
              <li>Demande hors zone géographique ou hors services déclarés par le Mover&nbsp;;</li>
              <li>Doublon avéré avec un lead déjà acheté&nbsp;;</li>
              <li>Demande manifestement frauduleuse ou non sérieuse.</li>
            </ul>
            <p className="mt-3">
              La réclamation est instruite par la Plateforme, qui rend sa décision dans un délai maximal de <strong>10 jours ouvrés</strong>. En cas d&apos;acceptation, le montant est recrédité sur le Wallet. La décision de la Plateforme est finale.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">8. Rôle de la Plateforme</h2>
            <p>
              La Plateforme est un <strong>simple intermédiaire technique</strong>. Elle n&apos;est pas partie au contrat de déménagement conclu entre le Mover et le Client. Elle ne fournit aucune prestation de déménagement, ne fixe pas les tarifs du déménagement lui-même et n&apos;intervient pas dans l&apos;exécution du contrat.
            </p>
            <p className="mt-3">
              Le Mover reste seul responsable de la qualité, du prix, de la sécurité et de la conformité de ses prestations ainsi que du respect de la réglementation applicable (transporteur, assurance, droit du travail, etc.).
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">9. Obligations du Mover</h2>
            <p className="mb-3">Le Mover s&apos;engage à&nbsp;:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Répondre aux Clients dans un délai raisonnable (48 heures recommandé)&nbsp;;</li>
              <li>Fournir des devis honnêtes, détaillés et conformes à la demande&nbsp;;</li>
              <li>Maintenir une assurance responsabilité civile professionnelle valide&nbsp;;</li>
              <li>Respecter la réglementation applicable à l&apos;activité de déménagement (licence transporteur, obligations sociales et fiscales, etc.)&nbsp;;</li>
              <li>Ne pas détourner les coordonnées du Client à d&apos;autres fins commerciales non liées à la demande.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">10. Absence de droit de rétractation</h2>
            <p>
              Les présentes CGV s&apos;inscrivent dans un contrat entre professionnels (B2B). Le droit de rétractation prévu par le Code de la consommation <strong>ne s&apos;applique pas</strong>. Par ailleurs, les prestations étant exécutées immédiatement après achat du lead (déblocage des coordonnées), le Mover renonce expressément à toute faculté de rétractation.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">11. Suspension et résiliation</h2>
            <p>
              La Plateforme peut suspendre ou résilier unilatéralement le compte d&apos;un Mover en cas de manquement grave aux présentes CGV, aux CGU, ou en cas de plaintes répétées de Clients. Le solde du Wallet reste acquis au Mover et peut faire l&apos;objet d&apos;un remboursement sur demande écrite, sous déduction des éventuels montants dus.
            </p>
            <p className="mt-3">
              Le Mover peut résilier son compte à tout moment par e-mail à{" "}
              <a href={`mailto:${email}`} className="text-green-700 underline">{email}</a>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">12. Responsabilité</h2>
            <p>
              La responsabilité de la Plateforme ne saurait être engagée pour&nbsp;:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1">
              <li>La qualité, la fiabilité ou l&apos;exactitude des informations fournies par les Clients&nbsp;;</li>
              <li>L&apos;inexécution ou la mauvaise exécution du contrat de déménagement par le Mover&nbsp;;</li>
              <li>Les dommages indirects (perte de chiffre d&apos;affaires, d&apos;opportunité, de notoriété).</li>
            </ul>
            <p className="mt-3">
              En tout état de cause, la responsabilité de la Plateforme, si elle était retenue, serait limitée au montant total payé par le Mover au cours des <strong>12 derniers mois</strong>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">13. Force majeure</h2>
            <p>
              Aucune des parties ne pourra être tenue pour responsable d&apos;un manquement résultant d&apos;un cas de force majeure au sens de l&apos;article 1218 du Code civil.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">14. Données personnelles</h2>
            <p>
              Les traitements de données sont détaillés dans la{" "}
              <Link href="/politique-confidentialite" className="text-green-700 underline">politique de confidentialité</Link>. Le Mover s&apos;engage à respecter la réglementation RGPD dans le traitement des données des Clients qu&apos;il obtient via la Plateforme.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">15. Modification des CGV</h2>
            <p>
              La Plateforme se réserve le droit de modifier les présentes CGV. Les Movers sont informés par e-mail au moins <strong>15 jours</strong> avant l&apos;entrée en vigueur des nouvelles conditions. En cas de désaccord, le Mover peut résilier son compte dans ce délai.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">16. Droit applicable — litiges</h2>
            <p>
              Les présentes CGV sont régies par le droit français. En cas de litige, les parties s&apos;efforceront de parvenir à une solution amiable. À défaut, le tribunal de commerce compétent sera saisi, <em>[à compléter : ville du siège social de l&apos;éditeur]</em>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
