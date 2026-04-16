"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Check,
  X,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PASSWORD_RULES = [
  { key: "minLength", label: "Au moins 8 caractères", test: (v: string) => v.length >= 8 },
  { key: "uppercase", label: "Une lettre majuscule", test: (v: string) => /[A-Z]/.test(v) },
  { key: "lowercase", label: "Une lettre minuscule", test: (v: string) => /[a-z]/.test(v) },
  { key: "number", label: "Un chiffre", test: (v: string) => /[0-9]/.test(v) },
  { key: "special", label: "Un caractère spécial", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

const createAccountSchema = z
  .object({
    email: z.string().email("Email invalide"),
    password: z
      .string()
      .min(8, "Au moins 8 caractères")
      .regex(/[A-Z]/, "Doit contenir une majuscule")
      .regex(/[a-z]/, "Doit contenir une minuscule")
      .regex(/[0-9]/, "Doit contenir un chiffre")
      .regex(/[^A-Za-z0-9]/, "Doit contenir un caractère spécial"),
    confirmPassword: z.string().min(1, "Veuillez confirmer le mot de passe"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type CreateAccountFormData = z.infer<typeof createAccountSchema>;

function CreerCompteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromParams = searchParams.get("email") ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateAccountFormData>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      email: emailFromParams,
      password: "",
      confirmPassword: "",
    },
  });

  const watchedPassword = watch("password", "");

  const passwordChecks = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        passed: rule.test(watchedPassword),
      })),
    [watchedPassword]
  );

  const strengthPercent = useMemo(() => {
    const passed = passwordChecks.filter((c) => c.passed).length;
    return Math.round((passed / PASSWORD_RULES.length) * 100);
  }, [passwordChecks]);

  const strengthColor =
    strengthPercent <= 20
      ? "bg-red-500"
      : strengthPercent <= 60
        ? "bg-yellow-500"
        : strengthPercent <= 80
          ? "bg-green-400"
          : "bg-green-600";

  async function onSubmit(data: CreateAccountFormData) {
    setIsSubmitting(true);
    try {
      // Retrieve registration data from sessionStorage
      const typesRaw = sessionStorage.getItem("inscription_types");
      const deptsRaw = sessionStorage.getItem("inscription_departments");
      const companyRaw = sessionStorage.getItem("inscription_company");
      const contactRaw = sessionStorage.getItem("inscription_contact");

      // Call server-side API route (uses service_role to bypass RLS)
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          types: typesRaw ? JSON.parse(typesRaw) : ["national"],
          departments: deptsRaw ? JSON.parse(deptsRaw) : [],
          company: companyRaw ? JSON.parse(companyRaw) : {},
          contact: contactRaw ? JSON.parse(contactRaw) : {},
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Erreur lors de la création du compte");
        return;
      }

      // Sign in the user after registration
      const supabase = createClient();
      await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // Clean up sessionStorage
      sessionStorage.removeItem("inscription_types");
      sessionStorage.removeItem("inscription_departments");
      sessionStorage.removeItem("inscription_company");
      sessionStorage.removeItem("inscription_contact");

      toast.success("Compte créé avec succès !");
      router.push("/verification-identite");
    } catch (err) {
      console.error("Signup error:", err);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Créer votre compte
        </h1>
        <p className="text-sm text-muted-foreground">
          Définissez votre mot de passe pour accéder à votre espace professionnel
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email (pre-filled, disabled) */}
        <div className="space-y-2">
          <Label htmlFor="email">Adresse email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              disabled
              className="pl-10 disabled:bg-muted/50"
              {...register("email")}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Choisissez un mot de passe"
              className={cn(
                "pl-10 pr-10",
                errors.password &&
                  "border-destructive focus-visible:ring-destructive"
              )}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Strength bar */}
          {watchedPassword.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3"
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={cn("h-full rounded-full transition-colors", strengthColor)}
                  initial={{ width: 0 }}
                  animate={{ width: `${strengthPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Requirement checklist */}
              <ul className="space-y-1.5">
                {passwordChecks.map((rule) => (
                  <motion.li
                    key={rule.key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    {rule.passed ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                    <span
                      className={cn(
                        "transition-colors",
                        rule.passed
                          ? "text-green-700 font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {rule.label}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>

        {/* Confirm password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirmez votre mot de passe"
              className={cn(
                "pl-10 pr-10",
                errors.confirmPassword &&
                  "border-destructive focus-visible:ring-destructive"
              )}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-destructive"
            >
              {errors.confirmPassword.message}
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
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="mr-2 h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
            />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? "Création en cours..." : "Créer mon compte"}
        </Button>
      </form>
    </motion.div>
  );
}

export default function CreerComptePage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 rounded-xl bg-muted" />}>
      <CreerCompteContent />
    </Suspense>
  );
}
