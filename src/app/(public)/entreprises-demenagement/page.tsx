"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, Star, CheckCircle2, ArrowRight, MapPin, Building2, Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Mover {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  postal_code: string | null;
  logo_url: string | null;
  description: string | null;
  rating: number;
  review_count: number;
  is_verified: boolean;
  company_regions: Array<{ department_code: string; categories: string[] }>;
}

const COLORS = ["bg-green-600", "bg-blue-600", "bg-purple-600", "bg-orange-500", "bg-teal-600", "bg-red-500", "bg-indigo-600", "bg-pink-600"];

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function getColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function EntreprisesDemenagementPage() {
  const [movers, setMovers] = useState<Mover[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("rating");

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    fetch(`/api/public/movers?sort=${sort}&limit=20&offset=0`)
      .then((r) => r.ok ? r.json() : { movers: [], total: 0 })
      .then((d) => { setMovers(d.movers); setTotal(d.total); })
      .finally(() => setLoading(false));
  }, [sort]);

  const loadMore = () => {
    const nextOffset = offset + 20;
    setLoadingMore(true);
    fetch(`/api/public/movers?sort=${sort}&limit=20&offset=${nextOffset}`)
      .then((r) => r.ok ? r.json() : { movers: [], total: 0 })
      .then((d) => {
        setMovers((prev) => [...prev, ...d.movers]);
        setOffset(nextOffset);
        setTotal(d.total);
      })
      .finally(() => setLoadingMore(false));
  };

  const filtered = search
    ? movers.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.city || "").toLowerCase().includes(search.toLowerCase())
      )
    : movers;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Entreprises de déménagement en France",
    numberOfItems: filtered.length,
    itemListElement: filtered.map((mover, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "LocalBusiness",
        name: mover.name,
        address: {
          "@type": "PostalAddress",
          addressLocality: mover.city || undefined,
          postalCode: mover.postal_code || undefined,
          addressCountry: "FR",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: Number(mover.rating).toFixed(1),
          reviewCount: mover.review_count,
          bestRating: 10,
        },
        url: `https://demenagement24.fr/entreprises-demenagement/${mover.slug}`,
      },
    })),
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl">
              Entreprises de déménagement en France
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {total} entreprise{total !== 1 ? "s" : ""} trouvée{total !== 1 ? "s" : ""} en France
            </p>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <section className="sticky top-16 z-30 border-b bg-white/95 backdrop-blur-sm">
        <div className="container flex flex-wrap items-center gap-3 py-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom ou ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Les mieux évalués</SelectItem>
              <SelectItem value="reviews">Plus d&apos;avis</SelectItem>
              <SelectItem value="recent">Plus récents</SelectItem>
            </SelectContent>
          </Select>
          <span className="hidden text-sm text-muted-foreground sm:block">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </section>

      {/* Grid */}
      <section className="container py-10">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-lg font-medium">
              {search ? "Aucun résultat pour cette recherche" : "Aucun déménageur inscrit pour le moment"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? "Essayez un autre terme de recherche" : "Revenez bientôt !"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((mover, i) => {
              const categories = mover.company_regions?.flatMap((r) => r.categories) || [];
              const uniqueCategories = Array.from(new Set(categories));

              return (
                <motion.div
                  key={mover.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                >
                  <Link
                    href={`/entreprises-demenagement/${mover.slug}`}
                    className="group flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 hover:border-green-200"
                  >
                    <div className="flex items-start gap-4">
                      {mover.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={mover.logo_url} alt={mover.name} className="h-14 w-14 rounded-xl object-cover" />
                      ) : (
                        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white", getColor(mover.name))}>
                          {getInitials(mover.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-display text-base font-bold text-gray-900">{mover.name}</h3>
                          {mover.is_verified && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {mover.city || "France"}{mover.postal_code ? ` ${mover.postal_code}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1">
                        <Star className="h-4 w-4 fill-green-500 text-green-500" />
                        <span className="text-sm font-bold text-green-700">{Number(mover.rating).toFixed(1)}</span>
                        <span className="text-xs text-green-600">/10</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{mover.review_count} avis</span>
                    </div>

                    {uniqueCategories.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {uniqueCategories.slice(0, 3).map((cat) => (
                          <span key={cat} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 capitalize">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-[var(--brand-green)] opacity-0 transition-opacity group-hover:opacity-100">
                      Voir le profil <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Load more button */}
        {!loading && filtered.length > 0 && movers.length < total && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 rounded-xl border bg-white px-8 py-3 text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:border-green-200 disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  Charger plus ({movers.length} sur {total})
                </>
              )}
            </button>
          </div>
        )}

        {!loading && movers.length >= total && movers.length > 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Tous les résultats sont affichés ({total} entreprise{total !== 1 ? "s" : ""})
          </p>
        )}
      </section>
    </>
  );
}
