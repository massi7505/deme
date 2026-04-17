"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Home, FileText, MessageCircle, Truck } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

export default function NotFound() {
  const { siteName } = useSiteSettings();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-50/50 via-white to-white">
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
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-brand-gradient shadow-lg shadow-green-500/30"
            >
              <span className="font-display text-4xl font-black text-white">
                404
              </span>
            </motion.div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Page introuvable
            </h1>
            <p className="text-base text-muted-foreground">
              La page que vous cherchez n&apos;existe pas, a été déplacée, ou le
              lien que vous avez suivi est peut-être cassé.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 text-sm font-bold text-white shadow-md shadow-green-500/25 transition-all hover:shadow-lg hover:shadow-green-500/30 hover:brightness-110"
            >
              <Home className="h-4 w-4" />
              Retour à l&apos;accueil
            </Link>
            <Link
              href="/devis"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <FileText className="h-4 w-4" />
              Demander un devis
            </Link>
          </div>

          <div className="border-t border-border/60 pt-6">
            <p className="mb-4 text-sm text-muted-foreground">
              Ou explorez ces pages populaires :
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <QuickLink href="/entreprises-demenagement" label="Déménageurs" />
              <QuickLink href="/faq" label="FAQ" />
              <QuickLink href="/contact" label="Contact" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => history.back()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Revenir à la page précédente
          </button>
        </motion.div>
      </main>

      <footer className="container flex h-14 items-center justify-between border-t border-border/60 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} {siteName}</span>
        <Link
          href="/contact"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <MessageCircle className="h-3 w-3" />
          Signaler un problème
        </Link>
      </footer>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition-all hover:border-[var(--brand-green)] hover:bg-green-50 hover:text-[var(--brand-green-dark)]"
    >
      {label}
    </Link>
  );
}
