import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "FAQ — Questions fréquentes sur le déménagement",
  description:
    "Réponses aux questions les plus posées : comment obtenir un devis, choisir un déménageur, préparer son déménagement, aides financières, tarifs professionnels.",
  alternates: { canonical: "/faq" },
};

async function getSiteName(): Promise<string> {
  try {
    const supabase = createUntypedAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("data")
      .eq("id", 1)
      .single();
    return (data?.data as Record<string, string>)?.siteName || BRAND.siteName;
  } catch {
    return BRAND.siteName;
  }
}

function buildFaqData(
  siteName: string
): Array<{ category: string; items: Array<{ question: string; answer: string }> }> {
  const safeName = siteName || "notre plateforme";
  return [
    {
      category: "Particuliers",
      items: [
        {
          question: "Comment obtenir un devis de déménagement gratuit ?",
          answer:
            "Rendez-vous sur notre page devis et remplissez le formulaire en quelques minutes. Vous recevrez jusqu'à 6 devis de déménageurs professionnels sous 48 h. Le service est entièrement gratuit et sans engagement.",
        },
        {
          question: "Comment choisir le bon déménageur ?",
          answer:
            "Comparez les devis reçus en tenant compte du prix, mais aussi des services inclus (emballage, démontage/remontage, assurance). Consultez les avis clients sur les fiches entreprises. Vérifiez que le déménageur est bien enregistré (SIRET) et dispose d'une assurance professionnelle.",
        },
        {
          question: "Quand dois-je commencer à préparer mon déménagement ?",
          answer:
            "Nous recommandons de commencer les préparatifs 2 à 3 mois avant la date prévue. Cela vous laisse le temps de comparer les devis, de faire le tri dans vos affaires, de gérer les formalités administratives (changement d'adresse, résiliation de contrats) et de préparer vos cartons sans stress.",
        },
        {
          question: "Mon déménagement est-il assuré ?",
          answer:
            "Tous les déménageurs professionnels doivent disposer d'une assurance responsabilité civile professionnelle. Vous pouvez aussi souscrire une assurance complémentaire ad valorem pour couvrir la valeur réelle de vos biens. Vérifiez toujours les conditions d'assurance avant de signer le contrat.",
        },
        {
          question: "Quelles aides financières existent pour un déménagement ?",
          answer:
            "Plusieurs aides existent : la prime de déménagement de la CAF (sous conditions), l'aide Mobili-Pass d'Action Logement pour les salariés, l'aide de France Travail pour les demandeurs d'emploi, et certaines aides municipales. Consultez notre guide complet sur le blog.",
        },
      ],
    },
    {
      category: "Entreprises",
      items: [
        {
          question: "Comment organiser un déménagement d'entreprise ?",
          answer:
            "Un déménagement d'entreprise nécessite une planification minutieuse. Désignez un responsable de projet, établissez un rétroplanning, communiquez avec vos salariés et vos clients. Faites appel à un déménageur spécialisé qui saura gérer la logistique, le transfert informatique et le mobilier de bureau.",
        },
        {
          question: "Quel est le délai pour un déménagement de bureaux ?",
          answer:
            "Le délai dépend de la taille de vos locaux et du volume à transporter. Prévoyez généralement 3 à 6 mois de préparation. Le déménagement physique peut s'effectuer en un week-end pour de petits bureaux, ou nécessiter plusieurs jours pour de grandes surfaces.",
        },
        {
          question: "Comment minimiser l'impact sur l'activité ?",
          answer:
            "Planifiez le déménagement pendant les périodes creuses. Privilégiez un déménagement le week-end ou pendant les congés. Mettez en place un plan de continuité d'activité. Prévoyez le transfert des lignes téléphoniques et internet à l'avance pour éviter toute coupure.",
        },
        {
          question:
            "Le déménagement d'entreprise est-il déductible fiscalement ?",
          answer:
            "Oui, les frais de déménagement d'entreprise sont généralement déductibles en tant que charges d'exploitation. Conservez toutes les factures et justificatifs. Consultez votre expert-comptable pour connaître les modalités exactes selon votre régime fiscal.",
        },
      ],
    },
    {
      category: "Déménageurs",
      items: [
        {
          question: `Comment m'inscrire sur ${safeName} ?`,
          answer: `Rendez-vous sur la page d'inscription déménageur. Remplissez le formulaire avec les informations de votre entreprise (SIRET, assurances, zone d'intervention). Après vérification de vos documents, votre profil est activé sous 48 h et vous recevez des demandes de devis qualifiées.`,
        },
        {
          question: "Comment fonctionne le système de leads ?",
          answer:
            "Lorsqu'un client envoie une demande de devis correspondant à votre zone d'intervention et vos services, vous recevez une notification avec les détails du projet. Vous pouvez alors contacter le client directement pour lui proposer votre devis. Chaque lead est facturé selon la grille tarifaire.",
        },
        {
          question: "Comment améliorer ma visibilité sur la plateforme ?",
          answer:
            "Complétez votre profil à 100 % : ajoutez des photos, une description détaillée de vos services et vos certifications. Encouragez vos clients satisfaits à laisser un avis. Les entreprises les mieux notées et les plus complètes apparaissent en priorité dans les résultats de recherche.",
        },
        {
          question: "Que faire en cas de réclamation client ?",
          answer:
            "Contactez directement le client pour trouver une solution amiable. Si le litige persiste, notre service médiation peut intervenir. Consultez la page réclamation pour connaître la procédure détaillée et les délais de traitement.",
        },
        {
          question: "Quels sont les tarifs pour les déménageurs ?",
          answer:
            "Les tarifs varient selon le type de lead et la zone géographique. Contactez l'équipe commerciale pour obtenir une grille tarifaire adaptée à votre activité. Des formules d'abonnement avec tarifs préférentiels sont disponibles pour les entreprises régulières.",
        },
      ],
    },
  ];
}

export default async function FaqPage() {
  const siteName = await getSiteName();
  const faqSections = buildFaqData(siteName);
  const allItems = faqSections.flatMap((s) => s.items);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allItems.map((item) => ({
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl">
              Questions fréquentes
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Réponses aux questions les plus posées sur le déménagement et
              notre plateforme.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ content — native <details> so crawlers see every answer in the
          HTML, and users still get a collapsible UX without JS. */}
      <section className="container pb-20">
        <div className="mx-auto max-w-3xl space-y-12">
          {faqSections.map((section) => (
            <div key={section.category}>
              <h2 className="font-display text-2xl font-bold text-gray-950">
                {section.category}
              </h2>
              <div className="mt-4 divide-y rounded-xl border bg-white">
                {section.items.map((item, i) => (
                  <details
                    key={`${section.category}-${i}`}
                    className="group p-5 [&[open]>summary>span:last-child]:rotate-45"
                    open={i === 0}
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                      <span>{item.question}</span>
                      <span className="text-xl leading-none text-green-600 transition-transform">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 leading-relaxed text-muted-foreground">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
