"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "framer-motion";
import * as Sentry from "@sentry/nextjs";
import { Home, MessageCircle, RefreshCw, AlertTriangle, Truck } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { siteName } = useSiteSettings();

  useEffect(() => {
    console.error("[app error]", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-red-50/40 via-white to-white">
      <header className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient shadow-md shadow-green-500/20">
            <Truck className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
            {siteName}
          </span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-lg space-y-8 text-center"
        >
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.1 }}
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30"
            >
              <AlertTriangle className="h-12 w-12 text-white" strokeWidth={2.5} />
            </motion.div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Une erreur est survenue
            </h1>
            <p className="text-base text-muted-foreground">
              Nos équipes ont été prévenues automatiquement. Vous pouvez
              réessayer ou revenir à l&apos;accueil.
            </p>
            {error.digest && (
              <p className="font-mono text-[11px] text-muted-foreground/60">
                Identifiant technique : {error.digest}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 text-sm font-bold text-white shadow-md shadow-green-500/25 transition-all hover:shadow-lg hover:shadow-green-500/30 hover:brightness-110"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </button>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Home className="h-4 w-4" />
              Retour à l&apos;accueil
            </Link>
          </div>

          <div className="border-t border-border/60 pt-6">
            <p className="text-sm text-muted-foreground">
              Le problème persiste ?{" "}
              <Link
                href="/contact"
                className="inline-flex items-center gap-1 font-medium text-[var(--brand-green)] hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Contactez-nous
              </Link>
            </p>
          </div>
        </motion.div>
      </main>

      <footer className="container flex h-14 items-center border-t border-border/60 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} {siteName}</span>
      </footer>
    </div>
  );
}
