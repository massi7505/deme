"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, Phone, ShieldCheck, Send } from "lucide-react";
import toast from "react-hot-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { cn } from "@/lib/utils";

interface Status {
  emailVerified: boolean;
  phoneVerified: boolean;
  emailMasked: string;
  phoneMasked: string;
  emailCooldownSec: number;
  phoneCooldownSec: number;
  distributed: boolean;
}

export default function VerifierDemandePage() {
  const params = useParams();
  const quoteId = params?.id as string;

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [phoneCooldown, setPhoneCooldown] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/quotes/verification-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      if (r.status === 404) {
        setNotFound(true);
        return;
      }
      if (!r.ok) return;
      const data = (await r.json()) as Status;
      setStatus(data);
      setEmailCooldown(data.emailCooldownSec);
      setPhoneCooldown(data.phoneCooldownSec);
    } catch {
      // network error — keep current state
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    if (!quoteId) return;
    refresh();
  }, [quoteId, refresh]);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const t = setTimeout(() => setEmailCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCooldown]);

  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const t = setTimeout(() => setPhoneCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneCooldown]);

  async function submitCode(channel: "email" | "phone") {
    const code = channel === "email" ? emailOtp : phoneOtp;
    if (code.length !== 6) {
      toast.error("Saisissez le code à 6 chiffres reçu");
      return;
    }
    const setSubmitting = channel === "email" ? setEmailSubmitting : setPhoneSubmitting;
    setSubmitting(true);
    try {
      const r = await fetch(`/api/quotes/verify-${channel}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, code }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(body?.error || "Code invalide");
        return;
      }
      toast.success(channel === "email" ? "Email vérifié" : "Téléphone vérifié");
      if (channel === "email") setEmailOtp("");
      else setPhoneOtp("");
      await refresh();
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  }

  async function resend(channel: "email" | "phone") {
    const path =
      channel === "email" ? "/api/quotes/send-email-otp" : "/api/quotes/resend-phone-otp";
    try {
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(body?.error || "Impossible d'envoyer le code");
        return;
      }
      toast.success("Nouveau code envoyé");
      if (channel === "email") setEmailCooldown(30);
      else setPhoneCooldown(30);
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-[var(--brand-green)]" />
      </div>
    );
  }

  if (notFound || !status) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold">Demande introuvable</h1>
        <p className="text-muted-foreground">
          Ce lien ne correspond à aucune demande active. Votre demande a peut-être expiré.
        </p>
        <Link
          href="/devis"
          className="rounded-lg bg-[var(--brand-green)] px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Faire une nouvelle demande
        </Link>
      </div>
    );
  }

  const anyVerified = status.emailVerified || status.phoneVerified;

  return (
    <div className="container max-w-3xl py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
            <ShieldCheck className="h-6 w-6 text-[var(--brand-green)]" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Confirmez votre demande
          </h1>
          <p className="text-sm text-muted-foreground">
            Validez au moins un canal pour que les déménageurs reçoivent votre demande.
            Valider les deux améliore la qualité du contact.
          </p>
        </div>

        {anyVerified && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-sm text-green-800">
            <strong>✓ Votre demande est transmise.</strong> Vous pouvez valider le second
            canal pour améliorer vos chances d&apos;être recontacté.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ChannelCard
            icon={Mail}
            title="Email"
            masked={status.emailMasked}
            verified={status.emailVerified}
            otp={emailOtp}
            onOtpChange={setEmailOtp}
            cooldown={emailCooldown}
            onSubmit={() => submitCode("email")}
            onResend={() => resend("email")}
            submitting={emailSubmitting}
          />
          <ChannelCard
            icon={Phone}
            title="Téléphone"
            masked={status.phoneMasked}
            verified={status.phoneVerified}
            otp={phoneOtp}
            onOtpChange={setPhoneOtp}
            cooldown={phoneCooldown}
            onSubmit={() => submitCode("phone")}
            onResend={() => resend("phone")}
            submitting={phoneSubmitting}
          />
        </div>
      </motion.div>
    </div>
  );
}

function ChannelCard({
  icon: Icon,
  title,
  masked,
  verified,
  otp,
  onOtpChange,
  cooldown,
  onSubmit,
  onResend,
  submitting,
}: {
  icon: typeof Mail;
  title: string;
  masked: string;
  verified: boolean;
  otp: string;
  onOtpChange: (v: string) => void;
  cooldown: number;
  onSubmit: () => void;
  onResend: () => void;
  submitting: boolean;
}) {
  return (
    <Card className={cn(verified && "border-green-200 bg-green-50/30")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon
            className={cn(
              "h-4 w-4",
              verified ? "text-[var(--brand-green)]" : "text-muted-foreground"
            )}
          />
          {title}
          {verified && (
            <CheckCircle2 className="ml-auto h-5 w-5 text-[var(--brand-green)]" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{masked}</p>
        {verified ? (
          <p className="text-sm font-medium text-[var(--brand-green-dark)]">Vérifié ✓</p>
        ) : (
          <>
            <OtpInput value={otp} onChange={onOtpChange} disabled={submitting} />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={onSubmit}
                disabled={submitting || otp.length !== 6}
                className="w-full gap-2 bg-brand-gradient text-white hover:brightness-110"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Valider
              </Button>
              <button
                type="button"
                onClick={onResend}
                disabled={cooldown > 0}
                className="text-xs font-medium text-[var(--brand-green)] transition-colors hover:text-[var(--brand-green-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : "Renvoyer le code"}
              </button>
            </div>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Send className="h-3 w-3" /> Pas reçu ? Vérifiez vos spams.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
