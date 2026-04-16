"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  User,
  PartyPopper,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/* ---------- Step indicator ---------- */
function StepIndicator({ current }: { current: number }) {
  const steps = [
    { num: 1, label: "Types" },
    { num: 2, label: "Départements" },
    { num: 3, label: "Entreprise" },
    { num: 4, label: "Contact" },
  ];

  return (
    <nav className="mb-8 flex items-center justify-between">
      {steps.map((step, i) => {
        const isCompleted = step.num < current;
        const isActive = step.num === current;
        return (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  isCompleted && "bg-green-600 text-white",
                  isActive && "bg-green-600 text-white ring-4 ring-green-100",
                  !isCompleted && !isActive && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.num}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] font-medium sm:block",
                  isActive ? "text-green-700" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8 rounded-full sm:w-12",
                  step.num < current ? "bg-green-600" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* ---------- Confetti particle ---------- */
function ConfettiParticle({ index }: { index: number }) {
  const colors = [
    "bg-green-400",
    "bg-green-600",
    "bg-yellow-400",
    "bg-blue-400",
    "bg-pink-400",
    "bg-purple-400",
  ];
  const color = colors[index % colors.length];
  const left = `${10 + Math.random() * 80}%`;
  const delay = Math.random() * 0.5;
  const duration = 1.5 + Math.random();

  return (
    <motion.div
      className={cn("absolute h-2 w-2 rounded-full", color)}
      style={{ left, top: "-8px" }}
      initial={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      animate={{
        opacity: [1, 1, 0],
        y: [0, 200 + Math.random() * 100],
        x: [-30 + Math.random() * 60],
        rotate: [0, 360 + Math.random() * 360],
        scale: [1, 0.5],
      }}
      transition={{ duration, delay, ease: "easeOut" }}
    />
  );
}

/* ---------- Zod schema ---------- */
const contactSchema = z.object({
  salutation: z.enum(["M.", "Mme"], {
    message: "Veuillez sélectionner une civilité",
  }),
  firstName: z
    .string()
    .min(1, "Le prénom est requis")
    .min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z
    .string()
    .min(1, "Le nom est requis")
    .min(2, "Le nom doit contenir au moins 2 caractères"),
  acceptCgu: z.boolean().refine((v) => v === true, {
    message: "Vous devez accepter les conditions générales",
  }),
});

type ContactFormData = z.infer<typeof contactSchema>;

/* ---------- Page ---------- */
export default function InscriptionEtape4Page() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      salutation: undefined,
      firstName: "",
      lastName: "",
      acceptCgu: false,
    },
  });

  const watchedSalutation = watch("salutation");

  const onSubmit = useCallback(
    async (data: ContactFormData) => {
      setIsSubmitting(true);
      try {
        // Store contact info for the account creation step
        sessionStorage.setItem("inscription_contact", JSON.stringify(data));
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Retrieve email from step 3 data
        const companyRaw = sessionStorage.getItem("inscription_company");
        const companyData = companyRaw ? JSON.parse(companyRaw) : {};
        const email = companyData.email || "";

        setShowSuccess(true);

        // Redirect after confetti animation
        setTimeout(() => {
          router.push(
            `/creer-compte${email ? `?email=${encodeURIComponent(email)}` : ""}`
          );
        }, 2500);
      } catch {
        // Handle error
      } finally {
        setIsSubmitting(false);
      }
    },
    [router]
  );

  function handleBack() {
    router.push("/inscription/etape-3");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative space-y-6"
    >
      {/* Confetti overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <ConfettiParticle key={i} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <StepIndicator current={4} />

      <AnimatePresence mode="wait">
        {!showSuccess ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Informations de contact
              </h1>
              <p className="text-sm text-muted-foreground">
                Dernière étape avant la création de votre compte
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Salutation */}
              <div className="space-y-2">
                <Label>Civilité</Label>
                <div className="flex gap-3">
                  {(["M.", "Mme"] as const).map((value) => (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border-2 px-5 py-2.5 text-sm font-medium transition-all",
                        watchedSalutation === value
                          ? "border-green-500 bg-green-50 text-green-900"
                          : "border-muted bg-white text-foreground hover:border-green-200"
                      )}
                    >
                      <input
                        type="radio"
                        value={value}
                        className="sr-only"
                        {...register("salutation")}
                      />
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border-2",
                          watchedSalutation === value
                            ? "border-green-600 bg-green-600"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {watchedSalutation === value && (
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      {value}
                    </label>
                  ))}
                </div>
                {errors.salutation && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-destructive"
                  >
                    {errors.salutation.message}
                  </motion.p>
                )}
              </div>

              {/* First / Last name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="firstName"
                      placeholder="Jean"
                      className={cn(
                        "pl-10",
                        errors.firstName && "border-destructive"
                      )}
                      {...register("firstName")}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-xs text-destructive">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    className={cn(errors.lastName && "border-destructive")}
                    {...register("lastName")}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* CGU */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Controller
                    name="acceptCgu"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="acceptCgu"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-0.5"
                      />
                    )}
                  />
                  <Label
                    htmlFor="acceptCgu"
                    className="text-sm font-normal leading-relaxed text-muted-foreground"
                  >
                    J&apos;accepte les{" "}
                    <Link
                      href="/cgu"
                      target="_blank"
                      className="font-medium text-green-600 underline underline-offset-2 hover:text-green-700"
                    >
                      conditions générales d&apos;utilisation
                    </Link>{" "}
                    et la{" "}
                    <Link
                      href="/politique-de-confidentialite"
                      target="_blank"
                      className="font-medium text-green-600 underline underline-offset-2 hover:text-green-700"
                    >
                      politique de confidentialité
                    </Link>
                  </Label>
                </div>
                {errors.acceptCgu && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-destructive"
                  >
                    {errors.acceptCgu.message}
                  </motion.p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-gradient text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl hover:shadow-green-500/30 hover:brightness-110"
                size="lg"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mr-2 h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                  />
                ) : (
                  <PartyPopper className="mr-2 h-4 w-4" />
                )}
                {isSubmitting
                  ? "Inscription en cours..."
                  : "Soumettre mon inscription"}
              </Button>

              {/* Back */}
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="w-full gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="space-y-4 py-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 15,
                delay: 0.2,
              }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
            >
              <PartyPopper className="h-8 w-8 text-green-600" />
            </motion.div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Inscription réussie !
            </h2>
            <p className="text-sm text-muted-foreground">
              Vous allez être redirigé vers la création de votre mot de passe...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
