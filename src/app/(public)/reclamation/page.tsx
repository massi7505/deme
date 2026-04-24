import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileText,
  LogIn,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Déposer une réclamation — Remboursement de lead",
  description:
    "Un lead défectueux ? Connectez-vous à votre espace déménageur pour déposer une réclamation et obtenir un remboursement sous 48 h ouvrables.",
  alternates: { canonical: "/reclamation" },
};

const PROCESS_STEPS = [
  {
    icon: FileText,
    title: "Dépôt depuis votre dashboard",
    description:
      "Connectez-vous à votre espace déménageur, ouvrez le lead concerné et cliquez sur « Déposer une réclamation ».",
  },
  {
    icon: Clock,
    title: "Traitement sous 48 h",
    description:
      "Notre équipe analyse votre réclamation et vérifie les informations fournies sous 48 h ouvrables.",
  },
  {
    icon: ShieldCheck,
    title: "Décision et remboursement",
    description:
      "Si la réclamation est validée, le crédit est automatiquement ajouté à votre portefeuille sous 5 jours ouvrables.",
  },
];

export default function ReclamationPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-orange-50/60 via-white to-white">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-orange-500" />
            <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl">
              Déposer une réclamation
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Un problème avec un lead que vous avez acheté ? Déposez votre
              réclamation depuis votre espace déménageur, nous l&apos;examinons
              sous 48 h.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container pb-20">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_380px]">
          {/* Main CTA */}
          <div>
            <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/40 p-8 sm:p-10">
              <h2 className="font-display text-2xl font-bold text-gray-950">
                Connectez-vous pour déposer votre réclamation
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Les réclamations sont gérées depuis votre espace déménageur
                pour garantir qu&apos;elles portent bien sur un lead que vous
                avez acheté. Connectez-vous, ouvrez le lead concerné et
                utilisez le bouton <strong>« Déposer une réclamation »</strong>.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/connexion?next=/demandes-de-devis"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-base font-bold text-white shadow-lg transition-all hover:brightness-110"
                >
                  <LogIn className="h-5 w-5" />
                  Se connecter
                </Link>
                <Link
                  href="/inscription/etape-1"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-300 bg-white px-6 py-3 text-base font-semibold text-orange-700 transition-all hover:bg-orange-50"
                >
                  Créer un compte déménageur
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-8 border-t border-orange-200 pt-6">
                <p className="text-sm font-semibold text-gray-900">
                  Vous êtes un client particulier ?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pour toute réclamation concernant un déménagement, contactez
                  directement l&apos;entreprise qui a effectué votre
                  déménagement. Pour un problème avec notre plateforme, utilisez
                  notre{" "}
                  <Link
                    href="/contact"
                    className="font-semibold text-orange-700 underline underline-offset-2"
                  >
                    formulaire de contact
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-display text-base font-bold text-gray-950">
                  Processus de traitement
                </h2>
                <div className="mt-5 space-y-6">
                  {PROCESS_STEPS.map((step) => (
                    <div key={step.title} className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-6">
                <h2 className="font-display text-base font-bold text-gray-950">
                  Règles de remboursement
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    La réclamation doit être déposée dans les 7 jours suivant
                    la réception du lead.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    Un lead déjà contacté (appel sortant enregistré) ne peut
                    faire l&apos;objet d&apos;un remboursement.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    Les crédits sont restitués sous forme d&apos;avoir sur
                    votre portefeuille, utilisables pour l&apos;achat de futurs
                    leads.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    En cas de désaccord, une médiation peut être demandée
                    auprès de notre service client.
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
