"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
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

export default function CguPage() {
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
              <FileText className="size-7" />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl"
            >
              Conditions générales d&apos;utilisation
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-lg leading-relaxed text-muted-foreground"
            >
              Règles d&apos;utilisation du site {brand}.
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
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">1. Objet</h2>
            <p>
              Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») régissent l&apos;accès et l&apos;utilisation du site {url} par tout visiteur ou utilisateur inscrit. Elles s&apos;appliquent à toute navigation, consultation, inscription ou utilisation des services proposés.
            </p>
            <p className="mt-3">
              Les modalités commerciales propres aux services payants (achat de leads par les entreprises de déménagement) sont détaillées dans les{" "}
              <Link href="/cgv" className="text-green-700 underline">Conditions Générales de Vente</Link>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">2. Acceptation</h2>
            <p>
              L&apos;utilisation du site implique l&apos;acceptation pleine et entière des présentes CGU. L&apos;éditeur se réserve le droit de les modifier à tout moment. Les utilisateurs sont invités à les consulter régulièrement. La version applicable est celle en vigueur à la date d&apos;utilisation du site.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">3. Description du service</h2>
            <p>
              {brand} est une plateforme de mise en relation entre&nbsp;:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1">
              <li>Des <strong>clients</strong> (particuliers ou entreprises) souhaitant obtenir des devis pour un déménagement&nbsp;;</li>
              <li>Des <strong>entreprises de déménagement</strong> professionnelles inscrites sur la plateforme.</li>
            </ul>
            <p className="mt-3">
              La plateforme n&apos;est pas partie au contrat de déménagement conclu entre le client et l&apos;entreprise. Elle facilite uniquement la mise en relation et l&apos;échange d&apos;informations nécessaires à l&apos;établissement du devis.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">4. Accès au site</h2>
            <p>
              L&apos;accès au site est gratuit pour les clients. Certaines fonctionnalités destinées aux entreprises de déménagement (accès aux demandes de devis, achat de leads) nécessitent la création d&apos;un compte et sont soumises aux CGV.
            </p>
            <p className="mt-3">
              L&apos;éditeur met tout en œuvre pour assurer un accès continu mais ne saurait garantir une disponibilité sans interruption. Des opérations de maintenance peuvent entraîner des indisponibilités temporaires.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">5. Création et gestion de compte (movers)</h2>
            <p>
              L&apos;inscription d&apos;une entreprise de déménagement est soumise à&nbsp;:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1">
              <li>La fourniture d&apos;informations exactes, à jour et véridiques (SIRET, identité du représentant légal, documents KYC)&nbsp;;</li>
              <li>La validation de l&apos;inscription par l&apos;éditeur, qui se réserve le droit de refuser ou de suspendre un compte en cas d&apos;informations incomplètes, fausses ou de non-respect des CGU/CGV&nbsp;;</li>
              <li>La confidentialité des identifiants de connexion, sous la responsabilité exclusive de l&apos;utilisateur.</li>
            </ul>
            <p className="mt-3">
              Toute utilisation du compte est réputée effectuée par son titulaire. En cas d&apos;usage frauduleux, l&apos;utilisateur doit en informer l&apos;éditeur sans délai à l&apos;adresse{" "}
              <a href={`mailto:${email}`} className="text-green-700 underline">{email}</a>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">6. Obligations de l&apos;utilisateur</h2>
            <p className="mb-3">L&apos;utilisateur s&apos;engage à&nbsp;:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Ne pas utiliser le site à des fins illégales, frauduleuses ou contraires aux bonnes mœurs&nbsp;;</li>
              <li>Ne pas tenter d&apos;accéder à des zones réservées, de perturber le fonctionnement du site ou d&apos;en extraire automatiquement des données (scraping)&nbsp;;</li>
              <li>Ne pas usurper l&apos;identité d&apos;un tiers&nbsp;;</li>
              <li>Fournir des informations exactes lors du dépôt d&apos;une demande de devis&nbsp;;</li>
              <li>Respecter les droits de propriété intellectuelle de l&apos;éditeur et des tiers.</li>
            </ul>
            <p className="mt-3">
              Les entreprises de déménagement s&apos;engagent en outre à répondre aux demandes dans un délai raisonnable, à fournir des devis honnêtes et à respecter leurs obligations légales et contractuelles envers les clients.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">7. Avis clients</h2>
            <p>
              Les clients ayant effectué un déménagement avec une entreprise référencée peuvent laisser un avis. Les avis sont modérés et peuvent être refusés ou supprimés s&apos;ils contiennent des propos injurieux, diffamatoires, hors sujet ou manifestement inexacts. Les movers disposent d&apos;un droit de réponse.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">8. Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble des éléments du site (textes, images, logos, code, base de données) est protégé par le droit d&apos;auteur et le droit des bases de données. Toute reproduction, extraction ou réutilisation, même partielle, est interdite sans autorisation écrite préalable.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">9. Responsabilité</h2>
            <p>
              L&apos;éditeur n&apos;est pas responsable&nbsp;:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1">
              <li>Du contenu des devis émis par les entreprises de déménagement&nbsp;;</li>
              <li>De la bonne exécution de la prestation de déménagement, qui relève exclusivement du contrat liant le client et l&apos;entreprise&nbsp;;</li>
              <li>Des contenus externes accessibles via des liens présents sur le site&nbsp;;</li>
              <li>Des dommages résultant d&apos;un usage non conforme du site.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">10. Suspension et résiliation</h2>
            <p>
              L&apos;éditeur se réserve le droit de suspendre ou supprimer tout compte en cas de non-respect des présentes CGU, des CGV, ou de comportement contraire aux intérêts de la plateforme ou de ses utilisateurs. L&apos;utilisateur peut demander la fermeture de son compte à tout moment par e-mail.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">11. Données personnelles</h2>
            <p>
              Les traitements de données effectués dans le cadre de l&apos;utilisation du site sont détaillés dans la{" "}
              <Link href="/politique-confidentialite" className="text-green-700 underline">politique de confidentialité</Link>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">12. Droit applicable — litiges</h2>
            <p>
              Les présentes CGU sont régies par le droit français. En cas de litige, une solution amiable sera recherchée en priorité. À défaut, les tribunaux français compétents seront saisis.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
