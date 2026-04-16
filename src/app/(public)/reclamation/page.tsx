"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const reclamationSchema = z.object({
  reason: z.string().min(1, "Veuillez selectionner un motif"),
  prospectId: z
    .string()
    .min(5, "L'identifiant prospect doit contenir au moins 5 caracteres"),
  description: z
    .string()
    .min(20, "La description doit contenir au moins 20 caracteres"),
});

type ReclamationFormData = z.infer<typeof reclamationSchema>;

const REASONS = [
  { value: "numero-invalide", label: "Numero invalide" },
  { value: "client-deja-contacte", label: "Client deja contacte" },
  { value: "fausse-demande", label: "Fausse demande" },
  { value: "client-deja-demenage", label: "Client deja demenage" },
  { value: "doublon", label: "Doublon" },
];

const PROCESS_STEPS = [
  {
    icon: FileText,
    title: "Depot de la reclamation",
    description:
      "Remplissez le formulaire ci-dessous avec le motif, l'identifiant prospect et une description detaillee.",
  },
  {
    icon: Clock,
    title: "Traitement sous 48h",
    description:
      "Notre equipe analyse votre reclamation et verifie les informations fournies sous 48h ouvrables.",
  },
  {
    icon: ShieldCheck,
    title: "Decision et remboursement",
    description:
      "Si la reclamation est validee, le credit est automatiquement ajoute a votre compte sous 5 jours ouvrables.",
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

export default function ReclamationPage() {
  const [submitted, setSubmitted] = useState(false);
  const [reasonValue, setReasonValue] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReclamationFormData>({
    resolver: zodResolver(reclamationSchema),
  });

  const onSubmit = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitted(true);
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-orange-50/60 via-white to-white">
        <div className="container py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-2xl text-center"
          >
            <motion.div variants={fadeUp} custom={0}>
              <AlertTriangle className="mx-auto h-12 w-12 text-orange-500" />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              custom={1}
              className="mt-6 font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl"
            >
              Deposer une reclamation
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-4 text-lg text-muted-foreground"
            >
              Un probleme avec un lead ? Soumettez votre reclamation et notre
              equipe l&apos;examinera sous 48h.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="container pb-20">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_380px]">
          {/* Form */}
          <div>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center rounded-2xl border bg-green-50 p-12 text-center"
              >
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h2 className="mt-6 font-display text-2xl font-bold text-gray-950">
                  Reclamation envoyee !
                </h2>
                <p className="mt-3 max-w-md text-muted-foreground">
                  Votre reclamation a bien ete enregistree. Notre equipe
                  l&apos;analysera sous 48h ouvrables et vous informera de la
                  decision par email.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Reason */}
                <div className="space-y-2">
                  <Label>
                    Motif de la reclamation{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={reasonValue}
                    onValueChange={(val) => {
                      setReasonValue(val);
                      setValue("reason", val, { shouldValidate: true });
                    }}
                  >
                    <SelectTrigger
                      className={cn(errors.reason && "border-red-500")}
                    >
                      <SelectValue placeholder="Selectionnez un motif" />
                    </SelectTrigger>
                    <SelectContent>
                      {REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.reason && (
                    <p className="text-sm text-red-500">
                      {errors.reason.message}
                    </p>
                  )}
                </div>

                {/* Prospect ID */}
                <div className="space-y-2">
                  <Label htmlFor="prospectId">
                    Identifiant prospect{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="prospectId"
                    placeholder="Ex: 12345678FR123456"
                    {...register("prospectId")}
                    className={cn(errors.prospectId && "border-red-500")}
                  />
                  {errors.prospectId && (
                    <p className="text-sm text-red-500">
                      {errors.prospectId.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Retrouvez l&apos;identifiant dans votre espace
                    demenageur, onglet &quot;Leads&quot;.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description detaillee{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Decrivez le probleme rencontre avec ce lead..."
                    rows={6}
                    {...register("description")}
                    className={cn(errors.description && "border-red-500")}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2"
                  disabled={isSubmitting}
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting
                    ? "Envoi en cours..."
                    : "Envoyer la reclamation"}
                </Button>
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Process */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-display text-base font-bold text-gray-950">
                  Processus de traitement
                </h3>
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

            {/* Refund rules */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-6">
                <h3 className="font-display text-base font-bold text-gray-950">
                  Regles de remboursement
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    La reclamation doit etre deposee dans les 7 jours suivant la
                    reception du lead.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    Un lead deja contacte (appel sortant enregistre) ne peut
                    faire l&apos;objet d&apos;un remboursement.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    Les credits sont restitues sous forme d&apos;avoir sur votre
                    compte, utilisables pour l&apos;achat de futurs leads.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    En cas de desaccord, une mediation peut etre demandee
                    aupres de notre service client.
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
