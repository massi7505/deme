"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Mail, Send, CheckCircle2, KeyRound, Lock } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Step = "email" | "otp" | "done";

const emailSchema = z.object({
  email: z.string().min(1, "L'email est requis").email("Email invalide"),
});
type EmailFormData = z.infer<typeof emailSchema>;

const resetSchema = z
  .object({
    password: z.string().min(8, "8 caractères minimum"),
    confirmPassword: z.string().min(1, "Confirmez le mot de passe"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
type ResetFormData = z.infer<typeof resetSchema>;

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  function setDigit(i: number, d: string) {
    const clean = d.replace(/\D/g, "").slice(0, 1);
    const arr = value.padEnd(6, " ").split("");
    arr[i] = clean || " ";
    onChange(arr.join("").trim());
    if (clean && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="flex justify-between gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          disabled={disabled}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          aria-label={`Chiffre ${i + 1}`}
          className="h-14 w-full rounded-lg border border-input bg-background text-center font-mono text-xl font-semibold text-foreground outline-none ring-offset-background transition focus:border-[var(--brand-green)] focus:ring-2 focus:ring-[var(--brand-green)]/40 disabled:opacity-50"
        />
      ))}
    </div>
  );
}

export default function MotDePasseOubliePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  async function requestOtp(target: string) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      if (!res.ok) {
        toast.error("Une erreur est survenue. Réessayez.");
        return false;
      }
      return true;
    } catch {
      toast.error("Erreur de connexion");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitEmail(data: EmailFormData) {
    const ok = await requestOtp(data.email);
    if (ok) {
      setEmail(data.email);
      setStep("otp");
      setResendCountdown(30);
      toast.success("Si un compte existe, un code a été envoyé");
    }
  }

  async function onResend() {
    if (resendCountdown > 0) return;
    const ok = await requestOtp(email);
    if (ok) {
      setResendCountdown(30);
      toast.success("Nouveau code envoyé");
    }
  }

  async function onSubmitReset(data: ResetFormData) {
    if (otp.length !== 6) {
      toast.error("Saisissez le code à 6 chiffres reçu par email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password: data.password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error || "Code invalide ou expiré");
        return;
      }
      setStep("done");
      toast.success("Mot de passe mis à jour");
      setTimeout(() => router.push("/connexion"), 2000);
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <AnimatePresence mode="wait">
        {step === "email" && (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Mot de passe oublié
              </h1>
              <p className="text-sm text-muted-foreground">
                Entrez votre email pour recevoir un code de vérification à 6 chiffres
              </p>
            </div>

            <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-5">
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
                      emailForm.formState.errors.email &&
                        "border-destructive focus-visible:ring-destructive"
                    )}
                    {...emailForm.register("email")}
                  />
                </div>
                {emailForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-gradient text-white shadow-lg shadow-green-500/20 hover:brightness-110"
                size="lg"
              >
                {submitting ? (
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {submitting ? "Envoi en cours..." : "Envoyer le code"}
              </Button>
            </form>

            <Link
              href="/connexion"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Retour à la connexion
            </Link>
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50">
                <KeyRound className="h-5 w-5 text-[var(--brand-green)]" />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Entrez le code de vérification
              </h1>
              <p className="text-sm text-muted-foreground">
                Un code à 6 chiffres a été envoyé à{" "}
                <span className="font-medium text-foreground">{email}</span>. Il expire dans 60 minutes.
              </p>
            </div>

            <form onSubmit={resetForm.handleSubmit(onSubmitReset)} className="space-y-5">
              <div className="space-y-2">
                <Label>Code à 6 chiffres</Label>
                <OtpInput value={otp} onChange={setOtp} disabled={submitting} />
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">
                    Pas reçu ? Pensez à vérifier vos spams.
                  </span>
                  <button
                    type="button"
                    onClick={onResend}
                    disabled={resendCountdown > 0 || submitting}
                    className="font-medium text-[var(--brand-green)] transition-colors hover:text-[var(--brand-green-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resendCountdown > 0
                      ? `Renvoyer (${resendCountdown}s)`
                      : "Renvoyer le code"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className={cn(
                      "pl-10",
                      resetForm.formState.errors.password &&
                        "border-destructive focus-visible:ring-destructive"
                    )}
                    {...resetForm.register("password")}
                  />
                </div>
                {resetForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {resetForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className={cn(
                      "pl-10",
                      resetForm.formState.errors.confirmPassword &&
                        "border-destructive focus-visible:ring-destructive"
                    )}
                    {...resetForm.register("confirmPassword")}
                  />
                </div>
                {resetForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {resetForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full bg-brand-gradient text-white shadow-lg shadow-green-500/20 hover:brightness-110"
                size="lg"
              >
                {submitting ? (
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : null}
                {submitting ? "Mise à jour..." : "Mettre à jour le mot de passe"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setOtp("");
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Changer d&apos;email
            </button>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-6 text-center"
          >
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
              >
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </motion.div>
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold text-foreground">
                Mot de passe mis à jour
              </h2>
              <p className="text-sm text-muted-foreground">
                Vous allez être redirigé vers la page de connexion...
              </p>
            </div>
            <Link
              href="/connexion"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700"
            >
              Aller à la connexion
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
