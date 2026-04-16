"use client";

import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSiteSettings } from "@/hooks/use-site-settings";

const buildFaqData = (siteName: string): Record<string, { question: string; answer: string }[]> => ({
  particuliers: [
    {
      question: "Comment obtenir un devis de demenagement gratuit ?",
      answer:
        "Rendez-vous sur notre page devis et remplissez le formulaire en quelques minutes. Vous recevrez jusqu'a 6 devis de demenageurs professionnels sous 48h. Le service est entierement gratuit et sans engagement.",
    },
    {
      question: "Comment choisir le bon demenageur ?",
      answer:
        "Comparez les devis recus en tenant compte du prix, mais aussi des services inclus (emballage, demontage/remontage, assurance). Consultez les avis clients sur les fiches entreprises de notre plateforme. Verifiez que le demenageur est bien enregistre (SIRET) et dispose d'une assurance professionnelle.",
    },
    {
      question: "Quand dois-je commencer a preparer mon demenagement ?",
      answer:
        "Nous recommandons de commencer les preparatifs 2 a 3 mois avant la date prevue. Cela vous laissera le temps de comparer les devis, de faire le tri dans vos affaires, de gerer les formalites administratives (changement d'adresse, resiliation de contrats) et de preparer vos cartons sans stress.",
    },
    {
      question: "Mon demenagement est-il assure ?",
      answer:
        "Tous les demenageurs professionnels doivent disposer d'une assurance responsabilite civile professionnelle. De plus, vous pouvez souscrire une assurance complementaire ad valorem pour couvrir la valeur reelle de vos biens. Verifiez toujours les conditions d'assurance avant de signer le contrat.",
    },
    {
      question: "Quelles aides financieres existent pour un demenagement ?",
      answer:
        "Plusieurs aides sont disponibles : la prime de demenagement de la CAF (sous conditions), l'aide Mobili-Pass d'Action Logement pour les salaries, l'aide de Pole Emploi pour les demandeurs d'emploi, et certaines aides municipales. Consultez notre guide complet sur les aides au demenagement sur notre blog.",
    },
  ],
  entreprises: [
    {
      question: "Comment organiser un demenagement d'entreprise ?",
      answer:
        "Un demenagement d'entreprise necessite une planification minutieuse. Designez un responsable de projet, etablissez un retroplanning, communiquez avec vos salaries et vos clients. Faites appel a un demenageur specialise en demenagement professionnel qui saura gerer la logistique, le transfert informatique et la gestion du mobilier de bureau.",
    },
    {
      question: "Quel est le delai pour un demenagement de bureaux ?",
      answer:
        "Le delai depend de la taille de vos locaux et du volume a transporter. Prevoyez generalement 3 a 6 mois de preparation. Le demenagement physique peut s'effectuer en un week-end pour de petits bureaux, ou necessiter plusieurs jours pour de grandes surfaces.",
    },
    {
      question: "Comment minimiser l'impact sur l'activite ?",
      answer:
        "Planifiez le demenagement pendant les periodes creuses de votre activite. Privilegiez un demenagement le week-end ou pendant les conges. Mettez en place un plan de continuite d'activite. Prevoyez le transfert des lignes telephoniques et d'internet en avance pour eviter toute coupure.",
    },
    {
      question: "Le demenagement d'entreprise est-il deductible fiscalement ?",
      answer:
        "Oui, les frais de demenagement d'entreprise sont generalement deductibles en tant que charges d'exploitation. Conservez toutes les factures et justificatifs. Consultez votre expert-comptable pour connaitre les modalites exactes de deduction selon votre regime fiscal.",
    },
  ],
  demenageurs: [
    {
      question: `Comment m'inscrire sur ${siteName} ?`,
      answer:
        "Rendez-vous sur notre page d'inscription demenageur. Remplissez le formulaire avec les informations de votre entreprise (SIRET, assurances, zone d'intervention). Apres verification de vos documents, votre profil sera active sous 48h. Vous pourrez alors recevoir des demandes de devis de clients qualifies.",
    },
    {
      question: "Comment fonctionne le systeme de leads ?",
      answer:
        "Lorsqu'un client envoie une demande de devis correspondant a votre zone d'intervention et vos services, vous recevez une notification avec les details du projet. Vous pouvez alors contacter le client directement pour lui proposer votre devis. Chaque lead est facture selon notre grille tarifaire.",
    },
    {
      question: "Comment ameliorer ma visibilite sur la plateforme ?",
      answer:
        "Completez votre profil a 100% : ajoutez des photos, une description detaillee de vos services et vos certifications. Encouragez vos clients satisfaits a laisser un avis. Les entreprises les mieux notees et les plus completes apparaissent en priorite dans les resultats de recherche.",
    },
    {
      question: "Que faire en cas de reclamation client ?",
      answer:
        "En cas de reclamation, nous vous invitons a contacter directement le client pour trouver une solution amiable. Si le litige persiste, notre service mediation peut intervenir. Consultez notre page reclamation pour connaitre la procedure detaillee et les delais de traitement.",
    },
    {
      question: "Quels sont les tarifs pour les demenageurs ?",
      answer:
        "Nos tarifs varient selon le type de lead et la zone geographique. Contactez notre equipe commerciale pour obtenir une grille tarifaire adaptee a votre activite. Nous proposons egalement des formules d'abonnement avec des tarifs prefentiels pour les entreprises regulieres.",
    },
  ],
});

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function FaqPage() {
  const { siteName } = useSiteSettings();
  const FAQ_DATA = buildFaqData(siteName);
  const allFaqItems = Object.values(FAQ_DATA).flat();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white">
        <div className="container py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-2xl text-center"
          >
            <motion.div variants={fadeUp} custom={0}>
              <HelpCircle className="mx-auto h-12 w-12 text-green-500" />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="mt-6 font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl"
            >
              Questions frequentes
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-lg text-muted-foreground"
            >
              Retrouvez les reponses aux questions les plus posees sur le
              demenagement et notre plateforme.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* FAQ content */}
      <section className="container pb-20">
        <div className="mx-auto max-w-3xl">
          <Tabs defaultValue="particuliers" className="w-full">
            <TabsList className="mb-8 w-full justify-start">
              <TabsTrigger value="particuliers">Particuliers</TabsTrigger>
              <TabsTrigger value="entreprises">Entreprises</TabsTrigger>
              <TabsTrigger value="demenageurs">Demenageurs</TabsTrigger>
            </TabsList>

            {Object.entries(FAQ_DATA).map(([tabKey, items]) => (
              <TabsContent key={tabKey} value={tabKey}>
                <Accordion type="single" collapsible className="w-full">
                  {items.map((item, i) => (
                    <AccordionItem key={i} value={`${tabKey}-${i}`}>
                      <AccordionTrigger className="text-left font-semibold">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="leading-relaxed text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>
    </>
  );
}
