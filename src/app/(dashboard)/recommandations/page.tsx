"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import {
  HelpCircle,
  Briefcase,
  Building2,
  Star,
  Euro,
  Monitor,
} from "lucide-react";

// ---------------------------------------------------------------------------
// FAQ data
// ---------------------------------------------------------------------------

interface FaqCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { question: string; answer: string }[];
}

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: "Notre service",
    icon: Briefcase,
    items: [
      {
        question: "Comment fonctionne Demenagement24 ?",
        answer:
          "Demenagement24 met en relation des particuliers recherchant un déménageur avec des entreprises de déménagement qualifiées. Lorsqu'un client remplit un formulaire de devis, sa demande est envoyée aux déménageurs correspondant à ses critères géographiques et de catégorie. Vous pouvez ensuite débloquer les coordonnées du client pour le contacter directement.",
      },
      {
        question: "Combien de déménageurs reçoivent chaque demande ?",
        answer:
          "Chaque demande est envoyée à un maximum de 5 déménageurs correspondant aux critères. Cela garantit une concurrence saine tout en maximisant vos chances de conversion. Le nombre exact de concurrents est visible sur chaque fiche de demande.",
      },
      {
        question: "Qu'est-ce qu'un lead vérifié ?",
        answer:
          "Un lead vérifié signifie que nous avons confirmé l'identité et les coordonnées du demandeur par téléphone ou email. Les leads vérifiés ont un taux de conversion significativement plus élevé.",
      },
      {
        question: "Quelle est la qualité des leads ?",
        answer:
          "Nous filtrons toutes les demandes pour éliminer les faux formulaires et les doublons. Chaque lead passe par un processus de vérification. Si un lead s'avère être invalide après déblocage, vous pouvez soumettre une réclamation pour obtenir un remboursement.",
      },
    ],
  },
  {
    title: "Profil d'entreprise",
    icon: Building2,
    items: [
      {
        question: "Pourquoi compléter mon profil est important ?",
        answer:
          "Un profil complet avec logo, description, photos de projets et avis clients inspire confiance. Les entreprises avec un profil complet reçoivent en moyenne 40% plus de contacts de la part des clients potentiels.",
      },
      {
        question: "Comment ajouter des photos de mes projets ?",
        answer:
          "Rendez-vous dans la section 'Profil d'entreprise', puis dans la section 'Images des projets'. Cliquez sur 'Ajouter' pour télécharger vos photos. Nous recommandons d'ajouter au moins 5 photos de vos réalisations.",
      },
      {
        question: "Mon profil est-il visible publiquement ?",
        answer:
          "Oui, votre profil est visible dans notre annuaire de déménageurs et peut apparaître dans les résultats de recherche Google. Seules les informations publiques (nom, ville, description, photos, avis) sont affichées. Vos coordonnées privées ne sont jamais partagées publiquement.",
      },
    ],
  },
  {
    title: "Avis",
    icon: Star,
    items: [
      {
        question: "Comment obtenir des avis clients ?",
        answer:
          "Après chaque déménagement réussi, nous envoyons automatiquement un email d'invitation à laisser un avis au client. Vous pouvez également partager votre lien de profil directement avec vos clients pour qu'ils laissent un avis.",
      },
      {
        question: "Puis-je répondre aux avis ?",
        answer:
          "Oui, vous pouvez répondre à tous les avis, positifs comme négatifs. Nous vous encourageons à répondre professionnellement à chaque avis pour montrer votre engagement envers la satisfaction client.",
      },
      {
        question: "Comment signaler un faux avis ?",
        answer:
          "Si vous pensez qu'un avis est faux ou inapproprié, vous pouvez le signaler en cliquant sur le bouton de signalement. Notre équipe de modération examinera l'avis sous 48h.",
      },
    ],
  },
  {
    title: "Tarification",
    icon: Euro,
    items: [
      {
        question: "Comment fonctionne la tarification ?",
        answer:
          "Vous payez un abonnement mensuel qui vous donne accès aux demandes dans vos zones configurées. Chaque lead débloqué est facturé individuellement selon sa valeur (volume, distance, type de déménagement). Les leads en essai gratuit ne sont pas facturés.",
      },
      {
        question: "Qu'est-ce que l'essai gratuit ?",
        answer:
          "L'essai gratuit vous permet de recevoir et débloquer un nombre limité de leads sans frais pour tester notre service. Pendant l'essai, votre couverture est limitée à 2 départements et un rayon de 30 km.",
      },
      {
        question: "Comment changer de forfait ?",
        answer:
          "Rendez-vous dans la section 'Facturation' pour voir les forfaits disponibles et changer d'abonnement. Le changement prend effet immédiatement et le prorata est calculé automatiquement.",
      },
      {
        question: "Puis-je obtenir un remboursement ?",
        answer:
          "Si un lead débloqué s'avère invalide (fausses coordonnées, annulation avant contact), vous pouvez soumettre une réclamation sous 7 jours. Après vérification, un avoir sera crédité sur votre compte.",
      },
    ],
  },
  {
    title: "Votre espace en ligne 24/7",
    icon: Monitor,
    items: [
      {
        question: "Comment accéder à mon tableau de bord ?",
        answer:
          "Connectez-vous avec vos identifiants sur demenagement24.fr. Vous accéderez directement à votre tableau de bord avec une vue d'ensemble de votre activité, vos demandes récentes et vos statistiques.",
      },
      {
        question: "Puis-je gérer mon compte depuis mobile ?",
        answer:
          "Oui, notre plateforme est entièrement responsive et optimisée pour les smartphones et tablettes. Vous pouvez consulter vos demandes, débloquer des leads et gérer votre profil depuis n'importe quel appareil.",
      },
      {
        question: "Comment contacter le support ?",
        answer:
          "Vous pouvez contacter votre responsable de compte directement depuis la plateforme via le bouton 'Contacter' présent sur chaque page. Vous pouvez également nous écrire à support@demenagement24.fr ou appeler le 01 23 45 67 89.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RecommandationsPage() {
  return (
    <div className="space-y-8">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-2xl font-bold tracking-tight">Recommandations</h2>
        <p className="text-sm text-muted-foreground">
          Retrouvez les réponses à vos questions les plus fréquentes.
        </p>
      </motion.div>

      {/* FAQ sections */}
      <div className="space-y-6">
        {FAQ_CATEGORIES.map((category, catIndex) => {
          const Icon = category.icon;

          return (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: catIndex * 0.06 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-[var(--brand-green)]" />
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.items.map((item, i) => (
                      <AccordionItem
                        key={i}
                        value={`${category.title}-${i}`}
                      >
                        <AccordionTrigger className="text-sm text-left">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Still need help */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <Card className="border-green-100 bg-green-50/50">
          <CardContent className="flex items-start gap-3 p-4">
            <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-green)]" />
            <div>
              <p className="text-sm font-medium text-green-900">
                Vous n&apos;avez pas trouvé votre réponse ?
              </p>
              <p className="mt-1 text-xs text-green-700">
                Contactez votre responsable de compte Marie Dupont directement
                depuis votre tableau de bord, ou envoyez un email à{" "}
                <span className="font-medium">support@demenagement24.fr</span>.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
