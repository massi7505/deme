"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  Fingerprint,
  ArrowRight,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------- Trust badges ---------- */
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

/* ---------- Page ---------- */
export default function VerificationIdentitePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Shield icon */}
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
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-green-400"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      {/* Header */}
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

      {/* What you need */}
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

      {/* CTA */}
      <div className="space-y-3">
        <Button
          className="w-full bg-brand-gradient text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl hover:shadow-green-500/30 hover:brightness-110"
          size="lg"
          onClick={() => {
            // TODO: Launch Sumsub SDK
            console.log("Launching KYC verification...");
          }}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Vérifier mon identité
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <Link
          href="/apercu"
          className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Passer pour l&apos;instant
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Trust badges */}
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
