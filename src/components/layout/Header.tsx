"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/hooks/use-site-settings";
import {
  Truck,
  Menu,
  X,
  ChevronDown,
  FileText,
  Building2,
  Globe,
} from "lucide-react";

const NAV_LINKS = [
  {
    label: "Déménagement",
    children: [
      { href: "/devis", label: "Demander un devis", icon: FileText, desc: "Gratuit et sans engagement" },
      { href: "/entreprises-demenagement", label: "Trouver un déménageur", icon: Building2, desc: "Plus de 200 entreprises" },
      { href: "/prix-demenagement", label: "Prix déménagement", icon: Truck, desc: "Estimez votre budget" },
      { href: "/demenagement-international", label: "International", icon: Globe, desc: "Déménager à l'étranger" },
    ],
  },
  { href: "/entreprises-demenagement", label: "Déménageurs" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const { siteName } = useSiteSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-white/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient shadow-md shadow-green-500/20">
            <Truck className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
            {siteName}
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((item) =>
            "children" in item && item.children ? (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  {item.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <AnimatePresence>
                  {openDropdown === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full pt-2"
                    >
                      <div className="w-72 rounded-xl border bg-white p-2 shadow-xl shadow-black/5">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
                          >
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-50 text-[var(--brand-green)]">
                              <child.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {child.label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {child.desc}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* CTA buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/connexion"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Espace pro
          </Link>
          <Link
            href="/devis"
            className="rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-green-500/25 transition-all hover:shadow-lg hover:shadow-green-500/30 hover:brightness-110"
          >
            Devis gratuit
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted lg:hidden"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t bg-white lg:hidden"
          >
            <nav className="container flex flex-col gap-1 py-4">
              {NAV_LINKS.map((item) =>
                "children" in item && item.children ? (
                  item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <child.icon className="h-4 w-4 text-[var(--brand-green)]" />
                      {child.label}
                    </Link>
                  ))
                ) : (
                  <Link
                    key={item.href}
                    href={item.href!}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                )
              )}
              <div className="mt-3 flex flex-col gap-2 border-t pt-4">
                <Link
                  href="/connexion"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border px-4 py-2.5 text-center text-sm font-semibold"
                >
                  Espace pro
                </Link>
                <Link
                  href="/devis"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl bg-brand-gradient px-4 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-green-500/25"
                >
                  Devis gratuit
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
