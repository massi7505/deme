"use client";

import Link from "next/link";
import { Truck, Mail, Phone, MapPin } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

const FOOTER_LINKS = {
  "Déménagement": [
    { href: "/devis", label: "Demander un devis" },
    { href: "/entreprises-demenagement", label: "Trouver un déménageur" },
    { href: "/prix-demenagement", label: "Prix déménagement" },
    { href: "/demenagement-international", label: "Déménagement international" },
  ],
  "Villes populaires": [
    { href: "/entreprises-demenagement/paris", label: "Déménagement Paris" },
    { href: "/entreprises-demenagement/lyon", label: "Déménagement Lyon" },
    { href: "/entreprises-demenagement/marseille", label: "Déménagement Marseille" },
    { href: "/entreprises-demenagement/toulouse", label: "Déménagement Toulouse" },
    { href: "/entreprises-demenagement/lille", label: "Déménagement Lille" },
    { href: "/entreprises-demenagement/bordeaux", label: "Déménagement Bordeaux" },
  ],
  "Ressources": [
    { href: "/blog", label: "Blog" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
    { href: "/reclamation", label: "Réclamation" },
  ],
  "Professionnels": [
    { href: "/inscription/etape-1", label: "Devenir partenaire" },
    { href: "/connexion", label: "Espace pro" },
    { href: "/recommandations", label: "Recommandations" },
  ],
};

export function Footer() {
  const { siteName, contactEmail, contactPhone, contactAddress } = useSiteSettings();

  return (
    <footer className="border-t bg-gray-950 text-gray-300">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient">
                <Truck className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display text-lg font-extrabold text-white">
                {siteName}
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              La plateforme de référence pour comparer les déménageurs
              professionnels en France. Gratuit et sans engagement.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Mail className="h-4 w-4 text-[var(--brand-green)]" />
                {contactEmail}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Phone className="h-4 w-4 text-[var(--brand-green)]" />
                {contactPhone}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
                {contactAddress}
              </div>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                {title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-400 transition-colors hover:text-[var(--brand-green)]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 text-xs text-gray-500 md:flex-row">
          <p>&copy; {new Date().getFullYear()} {siteName}. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="/mentions-legales" className="transition-colors hover:text-gray-300">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="transition-colors hover:text-gray-300">Politique de confidentialité</Link>
            <Link href="/cgv" className="transition-colors hover:text-gray-300">CGV</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
