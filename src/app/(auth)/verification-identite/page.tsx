"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Fingerprint,
  ArrowRight,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TRUST_BADGES = [
  {
    icon: Lock,
    label: "Chiffré",
    description: "Données chiffrées de bout en bout",
  },
  {
    icon: ShieldCheck,
    label: "Conforme RGPD",
    description: "Respect de la réglementation européenne",
  },
  {
    icon: Fingerprint,
    label: "Sécurisé",
    description: "Vérification par un tiers de confiance",
  },
] as const;

type KycStatus = "pending" | "in_review" | "approved" | "rejected";

function VerificationIdentiteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReturning = searchParams.get("return") === "1";
  // didit appends ?status=Approved|Declined|... on the callback URL. Use it
  // as the immediate UI state, while the webhook persists the true kyc_status
  // asynchronously.
  const diditStatus = searchParams.get("status");
  const urlHintedStatus: KycStatus | null =
    diditStatus === "Approved"
      ? "approved"
      : diditStatus === "Declined"
      ? "rejected"
      : diditStatus === "In Review"
      ? "in_review"
      : null;

  const [starting, setStarting] = useState(false);
  const [returnStatus, setReturnStatus] = useState<KycStatus | null>(
    urlHintedStatus
  );
  // Initial status fetched on mount. If the company is already approved or
  // stuck in_review (and reconciled via self-heal), render the return UI
  // instead of the start UI.
  const [initialStatus, setInitialStatus] = useState<KycStatus | null>(null);

  useEffect(() => {
    // Always check current status on mount — catches the case where the mover
    // navigates back here after a completed verification whose webhook was
    // dropped (/api/kyc/status self-heals against didit).
    let cancelled = false;
    fetch("/api/kyc/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { kyc_status: KycStatus } | null) => {
        if (!cancelled && data) setInitialStatus(data.kyc_status);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReturning) return;
    if (urlHintedStatus === "approved" || urlHintedStatus === "rejected") return;

    let stopped = false;
    let attempts = 0;

    const poll = async () => {
      if (stopped) return;
      attempts += 1;
      try {
        const r = await fetch("/api/kyc/status");
        if (r.ok) {
          const data = (await r.json()) as { kyc_status: KycStatus };
          setReturnStatus(data.kyc_status);
          if (data.kyc_status === "approved" || data.kyc_status === "rejected") return;
        }
      } catch {
        // ignore; retry
      }
      if (attempts >= 24) return; // 24 * 5s = 2 minutes
      setTimeout(poll, 5000);
    };

    poll();
    return () => {
      stopped = true;
    };
  }, [isReturning, urlHintedStatus]);

  // Treat as "returning" (show status UI) if the URL says so, OR if we just
  // learned the mover is already approved / has a terminal status.
  const effectiveReturn =
    isReturning ||
    initialStatus === "approved" ||
    initialStatus === "rejected" ||
    initialStatus === "in_review";
  const effectiveStatus = returnStatus ?? initialStatus;

  async function handleStart() {
    setStarting(true);
    try {
      const r = await fetch("/api/kyc/start-session", { method: "POST" });
      if (!r.ok) {
        toast.error("Impossible de démarrer la vérification. Réessayez.");
        setStarting(false);
        return;
      }
      const data = (await r.json()) as { verificationUrl: string };
      window.location.href = data.verificationUrl;
    } catch {
      toast.error("Erreur réseau. Réessayez.");
      setStarting(false);
    }
  }

  // Return UI — shown either on the didit callback (?return=1) OR when the
  // mover navigates here with a non-pending status (approved, rejected, in_review).
  if (effectiveReturn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <div className="flex justify-center">
          {effectiveStatus === "approved" ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          ) : effectiveStatus === "rejected" ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100">
              <Loader2 className="h-10 w-10 animate-spin text-green-600" />
            </div>
          )}
        </div>
        <div className="space-y-3 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {effectiveStatus === "approved"
              ? "Vérification approuvée"
              : effectiveStatus === "rejected"
              ? "Vérification refusée"
              : "Vérification en cours d'analyse"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {effectiveStatus === "approved"
              ? "Votre identité est confirmée. Votre compte est maintenant actif."
              : effectiveStatus === "rejected"
              ? "Votre vérification n'a pas pu être validée. Vous pouvez réessayer."
              : "Cela prend en général moins d'une minute."}
          </p>
        </div>
        {effectiveStatus === "approved" ? (
          <Button
            className="w-full bg-brand-gradient text-white"
            size="lg"
            onClick={() => router.push("/apercu")}
          >
            Accéder à mon compte <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : effectiveStatus === "rejected" ? (
          <Button
            className="w-full bg-brand-gradient text-white"
            size="lg"
            onClick={() => {
              setInitialStatus(null);
              setReturnStatus(null);
              router.replace("/verification-identite");
            }}
          >
            Réessayer <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </motion.div>
    );
  }

  // Start UI
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-8"
    >
      <div className="flex justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="relative"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100">
            <ShieldCheck className="h-10 w-10 text-green-600" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-green-400"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      <div className="space-y-3 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Vérification d&apos;identité
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Pour garantir la confiance entre les déménageurs et les clients, nous
          devons vérifier votre identité. Ce processus est rapide, sécurisé et
          conforme au RGPD.
        </p>
      </div>

      <div className="rounded-xl border bg-muted/30 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ce dont vous avez besoin
        </p>
        <ul className="space-y-2.5">
          {[
            "Une pièce d'identité valide (CNI ou passeport)",
            "Un appareil avec caméra (smartphone ou webcam)",
            "Un environnement bien éclairé",
          ].map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-start gap-2.5 text-sm text-foreground"
            >
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              {item}
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <Button
          className="w-full bg-brand-gradient text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl hover:shadow-green-500/30 hover:brightness-110"
          size="lg"
          disabled={starting}
          onClick={handleStart}
        >
          {starting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          {starting ? "Démarrage…" : "Vérifier mon identité"}
          {!starting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>

        <Link
          href="/apercu"
          className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Passer pour l&apos;instant
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {TRUST_BADGES.map((badge, i) => {
          const Icon = badge.icon;
          return (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border bg-white p-4 text-center"
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <Icon className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                {badge.label}
              </p>
              <p className="text-[10px] leading-tight text-muted-foreground">
                {badge.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function VerificationIdentitePage() {
  return (
    <Suspense fallback={null}>
      <VerificationIdentiteInner />
    </Suspense>
  );
}
