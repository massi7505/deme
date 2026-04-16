"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, Send, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Veuillez entrer un email valide"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function MotDePasseOubliePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/creer-compte`,
      });
      if (error) {
        toast.error(`Erreur : ${error.message}`);
        return;
      }
      setSubmittedEmail(data.email);
      setIsSuccess(true);
    } catch {
      // Handle error
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
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Mot de passe oublié
              </h1>
              <p className="text-sm text-muted-foreground">
                Entrez votre email pour recevoir un lien de réinitialisation
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                      errors.email &&
                        "border-destructive focus-visible:ring-destructive"
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
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? "Envoi en cours..." : "Envoyer le lien"}
              </Button>
            </form>

            {/* Back link */}
            <Link
              href="/connexion"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* Success icon */}
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.15,
                }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
              >
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </motion.div>
            </div>

            {/* Success message */}
            <div className="space-y-2 text-center">
              <h2 className="font-display text-xl font-bold text-foreground">
                Email envoyé !
              </h2>
              <p className="text-sm text-muted-foreground">
                Si un compte existe avec l&apos;adresse{" "}
                <span className="font-medium text-foreground">
                  {submittedEmail}
                </span>
                , vous recevrez un lien de réinitialisation dans quelques
                instants.
              </p>
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-xs text-green-800">
                Pensez à vérifier vos spams si vous ne trouvez pas l&apos;email.
                Le lien expire au bout de 24 heures.
              </p>
            </div>

            {/* Back link */}
            <div className="text-center">
              <Link
                href="/connexion"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 transition-colors hover:text-green-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
