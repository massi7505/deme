"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Zap,
  Star,
  MapPin,
  Users,
  CheckCircle2,
  Truck,
  Package,
  Globe,
  Building2,
  ChevronRight,
} from "lucide-react";
import { REGIONS, regionToSlug } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/use-site-settings";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const POPULAR_CITIES = [
  "Paris", "Lyon", "Marseille", "Toulouse", "Lille",
  "Bordeaux", "Nantes", "Strasbourg", "Nice", "Montpellier",
  "Rennes", "Grenoble",
];

const BENEFITS = [
  {
    icon: Zap,
    title: "Rapide & gratuit",
    desc: "Recevez jusqu'à 6 devis de déménageurs en moins de 48h. Entièrement gratuit.",
  },
  {
    icon: Shield,
    title: "Professionnels vérifiés",
    desc: "Chaque entreprise est vérifiée (SIRET, KYC) avant d'accéder à notre plateforme.",
  },
  {
    icon: Star,
    title: "Avis authentiques",
    desc: "Des avis clients réels et vérifiés pour choisir en toute confiance.",
  },
  {
    icon: Users,
    title: "Sans engagement",
    desc: "Comparez librement, choisissez le déménageur qui vous convient. Zéro obligation.",
  },
];

const SERVICES = [
  {
    icon: Truck,
    title: "Déménagement national",
    desc: "Partout en France métropolitaine",
    href: "/devis",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: Building2,
    title: "Déménagement entreprise",
    desc: "Bureaux, locaux commerciaux",
    href: "/devis",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Globe,
    title: "Déménagement international",
    desc: "Europe et monde entier",
    href: "/demenagement-international",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Package,
    title: "Garde-meuble",
    desc: "Stockage sécurisé temporaire",
    href: "/devis",
    color: "bg-amber-50 text-amber-600",
  },
];

export default function HomePage() {
  const { siteName } = useSiteSettings();
  return (
    <>
      {/* ── HERO ────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-green-50/80 via-white to-white">
        {/* Decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(to right, #22c55e 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-green-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-green-100/40 blur-3xl" />

        <div className="container relative py-20 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-semibold text-green-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                +200 déménageurs vérifiés en France
              </span>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
              className="mt-8 font-display text-5xl font-extrabold leading-[1.1] tracking-tight text-gray-950 sm:text-6xl lg:text-7xl"
            >
              Déménagez en toute
              <span className="relative whitespace-nowrap">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 418 42"
                  className="absolute left-0 top-2/3 h-[0.6em] w-full fill-green-300/50"
                  preserveAspectRatio="none"
                >
                  <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.23-7.825 47.116-13.595 58.923-14.241C272.252 2.966 325 6.037 375.583 11.37c14.24 1.502 42.676 5.32 47.645 6.4 1.037.225-.01.997-1.8 1.324-6.48 1.19-43.56-1.56-109.18-5.61C255.996 10.223 229.392 3.035 203.371.916z" />
                </svg>
                <span className="relative text-[var(--brand-green)]"> sérénité</span>
              </span>
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
              className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl"
            >
              Comparez gratuitement les devis de déménageurs professionnels
              près de chez vous. Rapide, fiable et sans engagement.
            </motion.p>

            {/* CTA Form */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={3}
              className="mt-10"
            >
              <Link
                href="/devis"
                className="group inline-flex items-center gap-3 rounded-2xl bg-brand-gradient px-8 py-4 text-lg font-bold text-white shadow-xl shadow-green-500/25 transition-all hover:shadow-2xl hover:shadow-green-500/30 hover:brightness-110"
              >
                Obtenir mes devis gratuits
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-[var(--brand-green)]" />
                Gratuit &bull; Sans engagement &bull; Réponse en 48h
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SERVICES ────────────────────────────────── */}
      <section className="container py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center"
        >
          <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold sm:text-4xl">
            Tous types de déménagement
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="mt-3 text-muted-foreground">
            Quel que soit votre projet, nous avons les professionnels qu&apos;il vous faut.
          </motion.p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service, i) => (
            <motion.div
              key={service.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              custom={i}
            >
              <Link
                href={service.href}
                className="group flex flex-col items-start rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className={`rounded-xl p-3 ${service.color}`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{service.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{service.desc}</p>
                <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-[var(--brand-green)] opacity-0 transition-opacity group-hover:opacity-100">
                  Demander un devis <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── BENEFITS ────────────────────────────────── */}
      <section className="bg-gray-950 py-20 text-white">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center"
          >
            <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold sm:text-4xl">
              Pourquoi choisir {siteName} ?
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="mt-3 text-gray-400">
              Une plateforme conçue pour simplifier votre déménagement.
            </motion.p>
          </motion.div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b, i) => (
              <motion.div
                key={b.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                custom={i}
                className="group rounded-2xl border border-gray-800 bg-gray-900/60 p-6 backdrop-blur transition-colors hover:border-green-500/30 hover:bg-gray-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-[var(--brand-green)] transition-colors group-hover:bg-green-500/20">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REGIONS ──────────────────────────────────── */}
      <section className="container py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center"
        >
          <motion.h2 variants={fadeUp} custom={0} className="font-display text-3xl font-bold sm:text-4xl">
            Déménageurs par région
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="mt-3 text-muted-foreground">
            Trouvez un déménageur professionnel dans votre région.
          </motion.p>
        </motion.div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(REGIONS).map(([region, depts], i) => (
            <motion.div
              key={region}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-20px" }}
              variants={fadeUp}
              custom={i % 4}
            >
              <Link
                href={`/entreprises-demenagement/${regionToSlug(region)}`}
                className="group flex items-center justify-between rounded-xl border bg-white p-4 transition-all hover:border-green-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
                  <span className="text-sm font-medium">{region}</span>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground transition-colors group-hover:bg-green-50 group-hover:text-green-700">
                  {depts.length} dépts
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Popular cities */}
        <div className="mt-10 text-center">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Villes populaires
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_CITIES.map((city) => (
              <Link
                key={city}
                href={`/entreprises-demenagement/${city.toLowerCase()}`}
                className="rounded-full border bg-white px-4 py-1.5 text-sm font-medium text-foreground transition-all hover:border-green-200 hover:bg-green-50 hover:text-green-700"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────── */}
      <section className="container pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-10 text-center text-white shadow-2xl shadow-green-600/20 sm:p-16">
          <div className="noise-overlay absolute inset-0" />
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-white/10" />

          <div className="relative z-10">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Prêt à déménager ?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-white/80">
              Obtenez jusqu&apos;à 6 devis gratuits de déménageurs professionnels
              en quelques minutes.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/devis"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-green-700 shadow-lg transition-all hover:shadow-xl hover:brightness-95"
              >
                Demander mes devis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/inscription/etape-1"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-8 py-3.5 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Vous êtes déménageur ?
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
