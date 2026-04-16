"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Truck,
  Ruler,
  CalendarDays,
  Building,
  Package,
  TrendingUp,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

const PRICE_DATA = [
  {
    type: "Studio / T1",
    volume: "10 - 20 m\³",
    local: "300 - 600 \€",
    longDistance: "600 - 1 200 \€",
  },
  {
    type: "2 pieces",
    volume: "20 - 30 m\³",
    local: "500 - 900 \€",
    longDistance: "1 000 - 2 000 \€",
  },
  {
    type: "3 pieces",
    volume: "30 - 40 m\³",
    local: "700 - 1 200 \€",
    longDistance: "1 500 - 3 000 \€",
  },
  {
    type: "4 pieces",
    volume: "40 - 50 m\³",
    local: "900 - 1 500 \€",
    longDistance: "2 000 - 4 000 \€",
  },
  {
    type: "5+ pieces",
    volume: "50 - 80 m\³",
    local: "1 200 - 2 500 \€",
    longDistance: "3 000 - 6 000 \€",
  },
];

const FACTORS = [
  {
    icon: Ruler,
    title: "Distance",
    description:
      "La distance entre l'ancien et le nouveau logement est le premier facteur de prix. Un demenagement local (meme ville) coutera nettement moins cher qu'un demenagement longue distance (plus de 200 km).",
  },
  {
    icon: Package,
    title: "Volume",
    description:
      "Le volume total de vos biens a transporter determine la taille du camion et le nombre de demenageurs necessaires. Plus le volume est important, plus le cout augmente.",
  },
  {
    icon: CalendarDays,
    title: "Periode",
    description:
      "La haute saison (juin a septembre) et les fins de mois sont les periodes les plus demandees. Demenager en semaine ou en basse saison (octobre a mars) peut reduire votre facture de 20 a 30%.",
  },
  {
    icon: Building,
    title: "Accessibilite",
    description:
      "L'etage, la presence d'un ascenseur, la distance entre le camion et l'entree, et les contraintes de stationnement influencent le temps necessaire et donc le prix final.",
  },
  {
    icon: Truck,
    title: "Services supplementaires",
    description:
      "L'emballage et le deballage des cartons, le demontage/remontage du mobilier, le transport d'objets speciaux (piano, oeuvres d'art) et le garde-meuble sont factures en supplement.",
  },
  {
    icon: TrendingUp,
    title: "Assurance",
    description:
      "Le niveau de couverture d'assurance choisi (basique ou ad valorem) impacte le prix. L'assurance ad valorem, qui couvre la valeur reelle de vos biens, represente generalement 1 a 2% de la valeur declaree.",
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

export default function PrixDemenagementPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white">
        <div className="container py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-3xl text-center"
          >
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl"
            >
              Prix demenagement &mdash; Guide complet 2026
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="mt-4 text-lg leading-relaxed text-muted-foreground"
            >
              Combien coute un demenagement en France ? Decouvrez les prix
              moyens par taille de logement, les facteurs qui influencent le cout
              et nos conseils pour economiser sur votre demenagement.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Price table */}
      <section className="container pb-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-2xl font-bold text-gray-950">
            Prix moyens par taille de logement
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Estimations indicatives basees sur les donnees 2026. Les prix reels
            varient selon de nombreux facteurs.
          </p>

          <div className="mt-6 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-bold">Type de logement</TableHead>
                  <TableHead className="font-bold">Volume estime</TableHead>
                  <TableHead className="font-bold">
                    Prix moyen local
                  </TableHead>
                  <TableHead className="font-bold">
                    Prix moyen longue distance
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PRICE_DATA.map((row) => (
                  <TableRow key={row.type}>
                    <TableCell className="font-semibold">{row.type}</TableCell>
                    <TableCell>{row.volume}</TableCell>
                    <TableCell className="font-medium text-green-700">
                      {row.local}
                    </TableCell>
                    <TableCell className="font-medium text-green-700">
                      {row.longDistance}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            * Local = meme ville ou agglomeration (&lt;50 km). Longue distance =
            plus de 200 km. Les prix incluent le transport, le chargement et le
            dechargement. TVA incluse.
          </p>
        </div>
      </section>

      {/* Factors */}
      <section className="border-t bg-gray-50/50 py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-display text-2xl font-bold text-gray-950">
              Facteurs influencant le prix
            </h2>
            <p className="mt-2 text-muted-foreground">
              Comprendre les elements qui composent le prix de votre
              demenagement pour mieux negocier.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {FACTORS.map((factor, i) => (
                <motion.div
                  key={factor.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    delay: i * 0.08,
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                  }}
                >
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                        <factor.icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 font-display text-base font-bold text-gray-950">
                        {factor.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {factor.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-brand-gradient p-10 text-center text-white shadow-2xl shadow-green-600/20 sm:p-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10" />

          <div className="relative z-10">
            <h2 className="font-display text-3xl font-bold">
              Obtenez votre devis personnalise
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-white/80">
              Recevez jusqu&apos;a 6 devis gratuits de demenageurs professionnels
              pour connaitre le prix exact de votre demenagement.
            </p>
            <div className="mt-8">
              <Link
                href="/devis"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-green-700 shadow-lg transition-all hover:shadow-xl hover:brightness-95"
              >
                Demander mes devis gratuits
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
