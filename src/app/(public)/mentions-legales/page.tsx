"use client";

import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";
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

export default function MentionsLegalesPage() {
  const { siteName, siteUrl, contactEmail, contactPhone } = useSiteSettings();
  const brand = siteName || "la Plateforme";
  const url = siteUrl || "[à compléter : URL du site]";

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
              <ScrollText className="size-7" />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl"
            >
              Mentions légales
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-lg leading-relaxed text-muted-foreground"
            >
              Informations légales relatives au site {brand}.
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
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">1. Éditeur du site</h2>
            <p>
              Le site <strong>{url}</strong> est édité par :
            </p>
            <ul className="mt-3 space-y-1 list-disc pl-6">
              <li>Raison sociale : <em>[à compléter : dénomination sociale]</em></li>
              <li>Forme juridique : <em>[à compléter : SAS, SARL, EI…]</em></li>
              <li>Capital social : <em>[à compléter : montant en €]</em></li>
              <li>Siège social : <em>[à compléter : adresse complète]</em></li>
              <li>SIREN : <em>[à compléter]</em></li>
              <li>SIRET : <em>[à compléter]</em></li>
              <li>N° TVA intracommunautaire : <em>[à compléter]</em></li>
              <li>RCS : <em>[à compléter : ville et numéro]</em></li>
              <li>Téléphone : {contactPhone || "[à compléter]"}</li>
              <li>E-mail : {contactEmail || "[à compléter]"}</li>
            </ul>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">2. Directeur de la publication</h2>
            <p>
              Le directeur de la publication est <em>[à compléter : prénom nom]</em>, en qualité de <em>[à compléter : fonction]</em>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">3. Hébergeur</h2>
            <p>
              Le site est hébergé par la société <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis. Site web :{" "}
              <a href="https://vercel.com" className="text-green-700 underline" target="_blank" rel="noopener noreferrer">vercel.com</a>.
            </p>
            <p className="mt-3">
              La base de données et l&apos;authentification sont opérées par <strong>Supabase Inc.</strong>, 970 Toa Payoh North #07-04, Singapour 318992. Site web :{" "}
              <a href="https://supabase.com" className="text-green-700 underline" target="_blank" rel="noopener noreferrer">supabase.com</a>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">4. Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble des éléments composant le site {brand} (textes, images, logos, graphismes, code source, bases de données) est la propriété exclusive de l&apos;éditeur ou fait l&apos;objet d&apos;une autorisation d&apos;utilisation. Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, par quelque procédé que ce soit, est interdite sans autorisation écrite préalable.
            </p>
            <p className="mt-3">
              Les marques et logos des entreprises de déménagement référencées sur la plateforme restent la propriété de leurs détenteurs respectifs et sont utilisés avec leur accord dans le cadre du service de mise en relation.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">5. Données personnelles</h2>
            <p>
              Les modalités de collecte, de traitement et de conservation des données personnelles sont détaillées dans notre{" "}
              <Link href="/politique-confidentialite" className="text-green-700 underline">politique de confidentialité</Link>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">6. Cookies</h2>
            <p>
              Le site utilise des cookies strictement nécessaires à son fonctionnement (session, sécurité). Les cookies de mesure d&apos;audience et de préférences sont soumis au consentement préalable de l&apos;utilisateur. Les détails figurent dans la{" "}
              <Link href="/politique-confidentialite" className="text-green-700 underline">politique de confidentialité</Link>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">7. Responsabilité</h2>
            <p>
              {brand} est un service de mise en relation entre clients et entreprises de déménagement. L&apos;éditeur n&apos;est pas partie au contrat de déménagement conclu entre le client et l&apos;entreprise. Il met en œuvre tous les moyens raisonnables pour assurer un accès de qualité au site mais ne saurait garantir une disponibilité continue et sans interruption.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">8. Signalement d&apos;un contenu illicite</h2>
            <p>
              Conformément à la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique, tout contenu manifestement illicite peut être signalé par e-mail à{" "}
              <a href={`mailto:${contactEmail}`} className="text-green-700 underline">{contactEmail || "[à compléter]"}</a>.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-gray-950 mb-3">9. Droit applicable</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français. En cas de litige, et après tentative de règlement amiable, les tribunaux français seront seuls compétents.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
