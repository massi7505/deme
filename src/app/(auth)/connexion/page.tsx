"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Veuillez entrer un email valide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function ConnexionPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error(
          error.message === "Invalid login credentials"
            ? "Email ou mot de passe incorrect"
            : `Erreur : ${error.message}`
        );
        return;
      }

      toast.success("Connexion réussie !");
      router.push("/apercu");
      router.refresh();
    } catch {
      toast.error("Une erreur est survenue");
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
          Connexion à votre espace
        </h1>
        <p className="text-sm text-muted-foreground">
          Accédez à votre tableau de bord pour gérer vos demandes
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Adresse email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="vous@entreprise.fr"
              className={cn(
                "pl-10",
                errors.email && "border-destructive focus-visible:ring-destructive"
              )}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-destructive"
            >
              {errors.email.message}
            </motion.p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Votre mot de passe"
              className={cn(
                "pl-10 pr-10",
                errors.password && "border-destructive focus-visible:ring-destructive"
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
          {errors.password && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-destructive"
            >
              {errors.password.message}
            </motion.p>
          )}
        </div>

        {/* Forgot password link */}
        <div className="flex justify-end">
          <Link
            href="/mot-de-passe-oublie"
            className="text-sm font-medium text-green-600 transition-colors hover:text-green-700"
          >
            Mot de passe oublié ?
          </Link>
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
            <LogIn className="mr-2 h-4 w-4" />
          )}
          {isSubmitting ? "Connexion en cours..." : "Se connecter"}
        </Button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-muted-foreground">
        Pas encore inscrit ?{" "}
        <Link
          href="/inscription/etape-1"
          className="font-semibold text-green-600 transition-colors hover:text-green-700"
        >
          Créer un compte
        </Link>
      </p>
    </motion.div>
  );
}
