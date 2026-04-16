"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const SERVICES = [
  {
    icon: Globe,
    title: "Demenagement Europe",
    description:
      "Demenagez partout en Europe avec nos partenaires certifies. Angleterre, Allemagne, Espagne, Italie, Belgique, Suisse, Portugal et plus encore. Transport par camion avec suivi en temps reel.",
    features: [
      "Transport routier direct",
      "Formalites douanieres simplifiees",
      "Delai 3 a 7 jours",
    ],
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Ship,
    title: "Demenagement Outre-mer",
    description:
      "Transport maritime securise vers les DOM-TOM : Guadeloupe, Martinique, Reunion, Guyane, Mayotte, Nouvelle-Caledonie, Polynesie francaise. Conteneur dedie ou groupage.",
    features: [
      "Conteneur maritime 20' ou 40'",
      "Assurance tous risques",
      "Delai 4 a 8 semaines",
    ],
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: Plane,
    title: "Demenagement International",
    description:
      "Demenagez partout dans le monde : Amerique du Nord, Afrique, Asie, Oceanie. Solutions par voie aerienne pour les envois urgents ou maritime pour les gros volumes.",
    features: [
      "Transport aerien ou maritime",
      "Gestion des visas et douanes",
      "Reseau mondial de partenaires",
    ],
    color: "bg-purple-50 text-purple-600",
  },
];

const STEPS = [
  {
    step: 1,
    title: "Devis",
    description:
      "Demandez votre devis gratuit en decrivant votre projet. Un expert vous contacte sous 24h pour une visite technique ou un appel video.",
    icon: FileText,
  },
  {
    step: 2,
    title: "Preparation",
    description:
      "Nos equipes preparent votre demenagement : emballage professionnel, protection des meubles, gestion des formalites douanieres et administratives.",
    icon: Package,
  },
  {
    step: 3,
    title: "Transport",
    description:
      "Vos biens sont transportes en toute securite par voie terrestre, maritime ou aerienne selon la destination. Suivi en temps reel de votre envoi.",
    icon: Truck,
  },
  {
    step: 4,
    title: "Livraison",
    description:
      "Reception, dechargement et installation dans votre nouveau domicile a l'etranger. Deballage et remontage du mobilier sur demande.",
    icon: CheckCircle2,
  },
];

const FAQ_INTERNATIONAL = [
  {
    question: "Quels documents sont necessaires pour un demenagement international ?",
    answer:
      "Les documents varient selon la destination, mais vous aurez generalement besoin de : passeport valide, visa ou permis de sejour, inventaire detaille de vos biens, facture du demenageur, et parfois un certificat de changement de residence. Pour les pays hors UE, des formulaires douaniers specifiques sont requis.",
  },
  {
    question: "Combien coute un demenagement international ?",
    answer:
      "Le prix depend de la destination, du volume, et du mode de transport. Comptez entre 2 000 et 5 000 euros pour un demenagement intra-europeen, et entre 5 000 et 15 000 euros pour un demenagement intercontinental par voie maritime. Le transport aerien est plus rapide mais nettement plus couteux.",
  },
  {
    question: "Combien de temps dure un demenagement international ?",
    answer:
      "Le delai varie selon la destination et le mode de transport : 3 a 7 jours en Europe par la route, 4 a 8 semaines par voie maritime vers les DOM-TOM ou l'Amerique, et 1 a 2 semaines par voie aerienne pour les destinations lointaines. Prevoyez un delai supplementaire pour le dedouanement.",
  },
  {
    question: "Puis-je emporter mes animaux de compagnie ?",
    answer:
      "Oui, mais les reglementations varient selon les pays. En general, vous aurez besoin d'un passeport europeen pour animaux, de vaccinations a jour (notamment la rage), et parfois d'une quarantaine a l'arrivee (Australie, Japon, etc.). Renseignez-vous aupres de l'ambassade du pays de destination.",
  },
  {
    question: "Comment sont assures mes biens durant le transport ?",
    answer:
      "Tous nos demenageurs partenaires disposent d'une assurance responsabilite civile professionnelle. Pour un demenagement international, nous recommandons fortement de souscrire une assurance ad valorem (tous risques) qui couvrira la valeur reelle de vos biens en cas de perte, vol ou dommage durant le transport.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function DemenagementInternationalPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-purple-50/80 via-white to-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple-200/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-blue-100/30 blur-3xl" />

        <div className="container relative py-20 lg:py-28">
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div
              variants={fadeUp}
              custom={0}
              className="flex items-center justify-center gap-3"
            >
              <Globe className="h-10 w-10 text-purple-500" />
              <Plane className="h-8 w-8 text-blue-500" />
              <Ship className="h-9 w-9 text-teal-500" />
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="mt-8 font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl"
            >
              Demenagement international
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-6 text-lg leading-relaxed text-muted-foreground"
            >
              Demenagez partout dans le monde avec des professionnels certifies.
              Europe, Outre-mer, Amerique, Asie, Afrique &mdash; nous
              organisons votre demenagement de A a Z.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-8">
              <Link
                href="/devis"
                className="group inline-flex items-center gap-3 rounded-2xl bg-brand-gradient px-8 py-4 text-lg font-bold text-white shadow-xl shadow-green-500/25 transition-all hover:shadow-2xl hover:shadow-green-500/30 hover:brightness-110"
              >
                Demander un devis international
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section className="container py-16">
        <h2 className="text-center font-display text-3xl font-bold text-gray-950">
          Nos services internationaux
        </h2>
        <p className="mt-3 text-center text-muted-foreground">
          Des solutions adaptees a chaque destination.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                delay: i * 0.1,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
              }}
            >
              <Card className="h-full">
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
            </motion.div>
          ))}
        </div>
      </section>

      {/* Process steps */}
      <section className="bg-gray-950 py-16 text-white">
        <div className="container">
          <h2 className="text-center font-display text-3xl font-bold">
            Comment ca marche ?
          </h2>
          <p className="mt-3 text-center text-gray-400">
            4 etapes simples pour votre demenagement international.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  delay: i * 0.1,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                }}
                className="relative text-center"
              >
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
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-3xl font-bold text-gray-950">
            Questions frequentes
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            Tout savoir sur le demenagement international.
          </p>

          <Accordion type="single" collapsible className="mt-8">
            {FAQ_INTERNATIONAL.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-semibold">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-10 text-center text-white shadow-2xl shadow-green-600/20 sm:p-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10" />

          <div className="relative z-10">
            <h2 className="font-display text-3xl font-bold">
              Pret a demenager a l&apos;international ?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-white/80">
              Obtenez un devis personnalise gratuit pour votre demenagement
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
