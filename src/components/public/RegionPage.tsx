"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Star, CheckCircle2, MapPin, ChevronRight, Loader2, Building2, Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, DEPARTMENTS, REGIONS } from "@/lib/utils";

interface Mover {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  postal_code: string | null;
  logo_url: string | null;
  rating: number;
  review_count: number;
  is_verified: boolean;
  company_regions: Array<{ department_code: string; categories: string[] }>;
}

const COLORS = ["bg-green-600", "bg-blue-600", "bg-purple-600", "bg-orange-500", "bg-teal-600", "bg-red-500"];
function getColor(name: string) { let h = 0; for (const c of name) h = c.charCodeAt(0) + ((h << 5) - h); return COLORS[Math.abs(h) % COLORS.length]; }
function getInitials(name: string) { return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); }

export default function RegionPage({ regionSlug, regionName }: { regionSlug: string; regionName: string }) {
  const [movers, setMovers] = useState<Mover[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDept, setActiveDept] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const departments = REGIONS[regionName] || [];

  useEffect(() => {
    const params = new URLSearchParams({ region: regionSlug, limit: "100" });
    if (activeDept) params.set("department", activeDept);

    fetch(`/api/public/movers?${params}`)
      .then((r) => r.ok ? r.json() : { movers: [] })
      .then((data) => setMovers(data.movers || []))
      .finally(() => setLoading(false));
  }, [regionSlug, activeDept]);

  const filtered = search
    ? movers.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.city?.toLowerCase().includes(search.toLowerCase()))
    : movers;

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b bg-gray-50/50">
        <div className="container flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Accueil</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/entreprises-demenagement" className="hover:text-foreground">Déménageurs</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{regionName}</span>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold">Déménageurs en {regionName}</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? "Chargement..." : `${filtered.length} déménageur${filtered.length !== 1 ? "s" : ""} disponible${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </motion.div>

        {/* Department filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setActiveDept(null); setLoading(true); }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
              !activeDept ? "bg-green-500 text-white border-green-500" : "hover:border-gray-400"
            )}
          >
            Tous
          </button>
          {departments.map((code) => (
            <button
              key={code}
              onClick={() => { setActiveDept(activeDept === code ? null : code); setLoading(true); }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                activeDept === code ? "bg-green-500 text-white border-green-500" : "hover:border-gray-400"
              )}
            >
              {DEPARTMENTS[code] || code} ({code})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou ville..."
            className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]"
          />
        </div>

        {/* Mover list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-green)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-muted-foreground">Aucun déménageur trouvé dans cette zone.</p>
            <Link href="/devis" className="mt-4 rounded-xl bg-brand-gradient px-6 py-2.5 text-sm font-bold text-white">
              Demander un devis gratuit
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((mover) => {
              const categories = Array.from(new Set(mover.company_regions?.flatMap(r => r.categories) || []));
              return (
                <Link
                  key={mover.id}
                  href={`/entreprises-demenagement/${mover.slug}`}
                  className="group rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-green-200"
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
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-sm font-semibold group-hover:text-green-600">{mover.name}</h3>
                        {mover.is_verified && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />}
                      </div>
                      {mover.city && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {mover.postal_code} {mover.city}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded bg-green-50 px-2 py-0.5">
                          <Star className="h-3.5 w-3.5 fill-green-500 text-green-500" />
                          <span className="text-sm font-bold text-green-700">{Number(mover.rating).toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{mover.review_count} avis</span>
                      </div>
                    </div>
                  </div>
                  {categories.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {categories.slice(0, 3).map((c) => (
                        <Badge key={c} variant="outline" className="text-[10px] capitalize">{c}</Badge>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
