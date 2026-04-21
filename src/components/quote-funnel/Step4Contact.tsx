"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const step4Schema = z.object({
  salutation: z.enum(["M.", "Mme"], {
    message: "Veuillez sélectionner une civilité",
  }),
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z
    .string()
    .regex(
      /^(?:(?:\+33|0033|0)\s?[1-9])(?:[\s.-]?\d{2}){4}$/,
      "Numéro de téléphone français invalide (ex: 06 12 34 56 78)"
    ),
  email: z.string().email("Adresse email invalide"),
  acceptCgu: z.literal(true, {
    message: "Vous devez accepter les conditions générales d'utilisation",
  }),
});

export type Step4Data = z.infer<typeof step4Schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Step4ContactProps {
  defaultValues?: Partial<Step4Data>;
  onNext: (data: Step4Data) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Step4Contact({
  defaultValues,
  onNext,
  onBack,
  isSubmitting = false,
}: Step4ContactProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      salutation: defaultValues?.salutation,
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      acceptCgu: defaultValues?.acceptCgu ?? (false as unknown as true),
    },
  });

  const selectedSalutation = watch("salutation");

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit(onNext)} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-semibold text-gray-900">
            Vos coordonnées
          </h3>

          {/* Salutation */}
          <fieldset className="mb-6">
            <legend className="mb-3 text-sm font-medium text-gray-700">Civilité</legend>
            <div className="flex gap-3">
              {(["M.", "Mme"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setValue("salutation", option, { shouldValidate: true })}
                  className={cn(
                    "rounded-lg border-2 px-6 py-2.5 text-sm font-medium transition-all",
                    selectedSalutation === option
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-green-300"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            {errors.salutation && (
              <p className="mt-2 text-sm text-red-600">{errors.salutation.message}</p>
            )}
          </fieldset>

          {/* Name fields */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                placeholder="Prénom"
                autoComplete="given-name"
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                placeholder="Nom"
                autoComplete="family-name"
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Contact fields */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="06 12 34 56 78"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                enterKeyHint="done"
                placeholder="votre@email.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* CGU checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="acceptCgu"
              checked={watch("acceptCgu") === true}
              onCheckedChange={(checked) =>
                setValue("acceptCgu", checked === true ? true : (false as unknown as true), {
                  shouldValidate: true,
                })
              }
              className="mt-0.5"
            />
            <Label htmlFor="acceptCgu" className="cursor-pointer text-sm leading-relaxed text-gray-600">
              J&apos;accepte les{" "}
              <a
                href="/cgu"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-green-600 underline hover:text-green-700"
              >
                conditions générales d&apos;utilisation
              </a>{" "}
              et la politique de confidentialité *
            </Label>
          </div>
          {errors.acceptCgu && (
            <p className="mt-1 text-sm text-red-600">{errors.acceptCgu.message}</p>
          )}
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 -mx-4 flex justify-between gap-2 border-t bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:mx-0 md:border-t-0 md:bg-transparent md:px-0 md:pb-0 md:pt-4 md:backdrop-blur-none">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            Retour
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="bg-gradient-to-r from-green-600 to-green-700 px-8 text-white shadow-lg shadow-green-200 hover:from-green-700 hover:to-green-800"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Envoi en cours...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Envoyer ma demande
              </span>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
