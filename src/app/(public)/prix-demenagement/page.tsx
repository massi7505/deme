import type { Metadata } from "next";
import Link from "next/link";
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

export const metadata: Metadata = {
  title: "Prix déménagement 2026 — Tarifs par taille de logement",
  description:
    "Combien coûte un déménagement en France en 2026 ? Prix moyens par logement (studio, T2, T3, T4, T5+), facteurs de coût et conseils pour économiser.",
  alternates: { canonical: "/prix-demenagement" },
  openGraph: {
    title: "Prix déménagement 2026 — Tarifs par taille de logement",
    description:
      "Combien coûte un déménagement en France en 2026 ? Prix moyens par logement, facteurs de coût et conseils pour économiser.",
    type: "article",
  },
};

const PRICE_DATA = [
  {
    type: "Studio / T1",
    volume: "10 - 20 m³",
    local: "300 - 600 €",
    longDistance: "600 - 1 200 €",
  },
  {
    type: "2 pièces",
    volume: "20 - 30 m³",
    local: "500 - 900 €",
    longDistance: "1 000 - 2 000 €",
  },
  {
    type: "3 pièces",
    volume: "30 - 40 m³",
    local: "700 - 1 200 €",
    longDistance: "1 500 - 3 000 €",
  },
  {
    type: "4 pièces",
    volume: "40 - 50 m³",
    local: "900 - 1 500 €",
    longDistance: "2 000 - 4 000 €",
  },
  {
    type: "5+ pièces",
    volume: "50 - 80 m³",
    local: "1 200 - 2 500 €",
    longDistance: "3 000 - 6 000 €",
  },
];

const FACTORS = [
  {
    icon: Ruler,
    title: "Distance",
    description:
      "La distance entre l'ancien et le nouveau logement est le premier facteur de prix. Un déménagement local (même ville) coûtera nettement moins cher qu'un déménagement longue distance (plus de 200 km).",
  },
  {
    icon: Package,
    title: "Volume",
    description:
      "Le volume total de vos biens à transporter détermine la taille du camion et le nombre de déménageurs nécessaires. Plus le volume est important, plus le coût augmente.",
  },
  {
    icon: CalendarDays,
    title: "Période",
    description:
      "La haute saison (juin à septembre) et les fins de mois sont les périodes les plus demandées. Déménager en semaine ou en basse saison (octobre à mars) peut réduire votre facture de 20 à 30 %.",
  },
  {
    icon: Building,
    title: "Accessibilité",
    description:
      "L'étage, la présence d'un ascenseur, la distance entre le camion et l'entrée, et les contraintes de stationnement influencent le temps nécessaire et donc le prix final.",
  },
  {
    icon: Truck,
    title: "Services supplémentaires",
    description:
      "L'emballage et le déballage des cartons, le démontage/remontage du mobilier, le transport d'objets spéciaux (piano, œuvres d'art) et le garde-meuble sont facturés en supplément.",
  },
  {
    icon: TrendingUp,
    title: "Assurance",
    description:
      "Le niveau de couverture d'assurance choisi (basique ou ad valorem) impacte le prix. L'assurance ad valorem, qui couvre la valeur réelle de vos biens, représente généralement 1 à 2 % de la valeur déclarée.",
  },
];

export default function PrixDemenagementPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white">
        <div className="container py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl">
              Prix déménagement — Guide complet 2026
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Combien coûte un déménagement en France ? Découvrez les prix
              moyens par taille de logement, les facteurs qui influencent le coût
              et nos conseils pour économiser sur votre déménagement.
            </p>
          </div>
        </div>
      </section>

      {/* Price table */}
      <section className="container pb-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display text-2xl font-bold text-gray-950">
            Prix moyens par taille de logement
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Estimations indicatives basées sur les données 2026. Les prix réels
            varient selon de nombreux facteurs.
          </p>

          <div className="mt-6 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-bold">Type de logement</TableHead>
                  <TableHead className="font-bold">Volume estimé</TableHead>
                  <TableHead className="font-bold">Prix moyen local</TableHead>
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
            * Local = même ville ou agglomération (&lt; 50 km). Longue distance =
            plus de 200 km. Les prix incluent le transport, le chargement et le
            déchargement. TVA incluse.
          </p>
        </div>
      </section>

      {/* Factors */}
      <section className="border-t bg-gray-50/50 py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-display text-2xl font-bold text-gray-950">
              Facteurs influençant le prix
            </h2>
            <p className="mt-2 text-muted-foreground">
              Comprendre les éléments qui composent le prix de votre
              déménagement pour mieux négocier.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {FACTORS.map((factor) => (
                <Card key={factor.title} className="h-full">
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
              Obtenez votre devis personnalisé
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-white/80">
              Recevez jusqu&apos;à 6 devis gratuits de déménageurs professionnels
              pour connaître le prix exact de votre déménagement.
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
