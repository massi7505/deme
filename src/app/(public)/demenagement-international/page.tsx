import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  Plane,
  Ship,
  FileText,
  Package,
  Truck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Déménagement international — Europe, Outre-mer, monde entier",
  description:
    "Organisez votre déménagement international avec des déménageurs certifiés : Europe (3-7 jours), Outre-mer (4-8 semaines), international (aérien/maritime). Devis gratuit.",
  alternates: { canonical: "/demenagement-international" },
  openGraph: {
    title: "Déménagement international — Europe, Outre-mer, monde entier",
    description:
      "Organisez votre déménagement international avec des déménageurs certifiés. Europe, Outre-mer, international (aérien/maritime). Devis gratuit.",
    type: "article",
  },
};

const SERVICES = [
  {
    icon: Globe,
    title: "Déménagement Europe",
    description:
      "Déménagez partout en Europe avec nos partenaires certifiés. Angleterre, Allemagne, Espagne, Italie, Belgique, Suisse, Portugal et plus. Transport par camion avec suivi en temps réel.",
    features: [
      "Transport routier direct",
      "Formalités douanières simplifiées",
      "Délai 3 à 7 jours",
    ],
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Ship,
    title: "Déménagement Outre-mer",
    description:
      "Transport maritime sécurisé vers les DOM-TOM : Guadeloupe, Martinique, Réunion, Guyane, Mayotte, Nouvelle-Calédonie, Polynésie française. Conteneur dédié ou groupage.",
    features: [
      "Conteneur maritime 20' ou 40'",
      "Assurance tous risques",
      "Délai 4 à 8 semaines",
    ],
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: Plane,
    title: "Déménagement international",
    description:
      "Déménagez partout dans le monde : Amérique du Nord, Afrique, Asie, Océanie. Solutions par voie aérienne pour les envois urgents ou maritime pour les gros volumes.",
    features: [
      "Transport aérien ou maritime",
      "Gestion des visas et douanes",
      "Réseau mondial de partenaires",
    ],
    color: "bg-purple-50 text-purple-600",
  },
];

const STEPS = [
  {
    step: 1,
    title: "Devis",
    description:
      "Demandez votre devis gratuit en décrivant votre projet. Un expert vous contacte sous 24 h pour une visite technique ou un appel vidéo.",
    icon: FileText,
  },
  {
    step: 2,
    title: "Préparation",
    description:
      "Nos équipes préparent votre déménagement : emballage professionnel, protection des meubles, gestion des formalités douanières et administratives.",
    icon: Package,
  },
  {
    step: 3,
    title: "Transport",
    description:
      "Vos biens sont transportés en toute sécurité par voie terrestre, maritime ou aérienne selon la destination. Suivi en temps réel de votre envoi.",
    icon: Truck,
  },
  {
    step: 4,
    title: "Livraison",
    description:
      "Réception, déchargement et installation dans votre nouveau domicile à l'étranger. Déballage et remontage du mobilier sur demande.",
    icon: CheckCircle2,
  },
];

const FAQ_INTERNATIONAL = [
  {
    question:
      "Quels documents sont nécessaires pour un déménagement international ?",
    answer:
      "Les documents varient selon la destination, mais vous aurez généralement besoin de : passeport valide, visa ou permis de séjour, inventaire détaillé de vos biens, facture du déménageur, et parfois un certificat de changement de résidence. Pour les pays hors UE, des formulaires douaniers spécifiques sont requis.",
  },
  {
    question: "Combien coûte un déménagement international ?",
    answer:
      "Le prix dépend de la destination, du volume et du mode de transport. Comptez entre 2 000 et 5 000 € pour un déménagement intra-européen, et entre 5 000 et 15 000 € pour un déménagement intercontinental par voie maritime. Le transport aérien est plus rapide mais nettement plus coûteux.",
  },
  {
    question: "Combien de temps dure un déménagement international ?",
    answer:
      "Le délai varie selon la destination et le mode de transport : 3 à 7 jours en Europe par la route, 4 à 8 semaines par voie maritime vers les DOM-TOM ou l'Amérique, et 1 à 2 semaines par voie aérienne pour les destinations lointaines. Prévoyez un délai supplémentaire pour le dédouanement.",
  },
  {
    question: "Puis-je emporter mes animaux de compagnie ?",
    answer:
      "Oui, mais les réglementations varient selon les pays. En général, vous aurez besoin d'un passeport européen pour animaux, de vaccinations à jour (notamment la rage), et parfois d'une quarantaine à l'arrivée (Australie, Japon, etc.). Renseignez-vous auprès de l'ambassade du pays de destination.",
  },
  {
    question: "Comment sont assurés mes biens durant le transport ?",
    answer:
      "Tous nos déménageurs partenaires disposent d'une assurance responsabilité civile professionnelle. Pour un déménagement international, nous recommandons de souscrire une assurance ad valorem (tous risques) qui couvre la valeur réelle de vos biens en cas de perte, vol ou dommage durant le transport.",
  },
];

export default function DemenagementInternationalPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_INTERNATIONAL.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-purple-50/80 via-white to-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple-200/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-blue-100/30 blur-3xl" />

        <div className="container relative py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex items-center justify-center gap-3">
              <Globe className="h-10 w-10 text-purple-500" />
              <Plane className="h-8 w-8 text-blue-500" />
              <Ship className="h-9 w-9 text-teal-500" />
            </div>

            <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
              Déménagement international
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Déménagez partout dans le monde avec des professionnels certifiés.
              Europe, Outre-mer, Amérique, Asie, Afrique — nous organisons votre
              déménagement de A à Z.
            </p>

            <div className="mt-8">
              <Link
                href="/devis"
                className="group inline-flex items-center gap-3 rounded-2xl bg-brand-gradient px-8 py-4 text-lg font-bold text-white shadow-xl shadow-green-500/25 transition-all hover:shadow-2xl hover:shadow-green-500/30 hover:brightness-110"
              >
                Demander un devis international
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="container py-16">
        <h2 className="text-center font-display text-3xl font-bold text-gray-950">
          Nos services internationaux
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Des solutions adaptées à chaque destination.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <Card key={service.title} className="h-full">
              <CardContent className="p-6">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    service.color
                  )}
                >
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-gray-950">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {service.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Process steps */}
      <section className="bg-gray-950 py-16 text-white">
        <div className="container">
          <h2 className="text-center font-display text-3xl font-bold">
            Comment ça marche ?
          </h2>
          <p className="mt-3 text-center text-gray-400">
            4 étapes simples pour votre déménagement international.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 text-[var(--brand-green)]">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                  {step.step}
                </div>
                <h3 className="mt-3 font-display text-lg font-bold">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — native <details> so answers are always in the HTML for crawlers */}
      <section className="container py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-3xl font-bold text-gray-950">
            Questions fréquentes
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Tout savoir sur le déménagement international.
          </p>

          <div className="mt-8 divide-y rounded-xl border bg-white">
            {FAQ_INTERNATIONAL.map((item, i) => (
              <details
                key={i}
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
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-10 text-center text-white shadow-2xl shadow-green-600/20 sm:p-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10" />

          <div className="relative z-10">
            <h2 className="font-display text-3xl font-bold">
              Prêt à déménager à l&apos;international ?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-white/80">
              Obtenez un devis personnalisé gratuit pour votre déménagement
              international en quelques minutes.
            </p>
            <div className="mt-8">
              <Link
                href="/devis"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-green-700 shadow-lg transition-all hover:shadow-xl hover:brightness-95"
              >
                Obtenir mon devis gratuit
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
