"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatPrice } from "@/lib/utils";
import {
  FileText,
  Unlock,
  TrendingUp,
  Euro,
  ArrowUp,
  ArrowDown,
  Minus,
  MapPin,
  Layers,
} from "lucide-react";

type PeriodKey = "30d" | "90d" | "180d" | "365d";

interface PeriodKPIs {
  received: number;
  unlocked: number;
  conversionRate: number;
  spentCents: number;
}

interface CityRow {
  city: string;
  received: number;
  unlocked: number;
  conversionRate: number;
}

interface CategoryRow {
  category: string;
  received: number;
  unlocked: number;
  conversionRate: number;
}

interface PerformanceData {
  period: PeriodKey;
  days: number;
  current: PeriodKPIs;
  previous: PeriodKPIs;
  topCities: CityRow[];
  byCategory: CategoryRow[];
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "30d", label: "30 jours" },
  { key: "90d", label: "90 jours" },
  { key: "180d", label: "6 mois" },
  { key: "365d", label: "12 mois" },
];

const CATEGORY_LABELS: Record<string, string> = {
  national: "National",
  international: "International",
  local: "Local",
};

function computeDelta(current: number, previous: number): {
  pct: number | null;
  direction: "up" | "down" | "flat";
} {
  if (previous === 0) {
    if (current === 0) return { pct: null, direction: "flat" };
    return { pct: null, direction: "up" }; // new activity, no baseline
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { pct: 0, direction: "flat" };
  return { pct, direction: pct > 0 ? "up" : "down" };
}

export default function PerformancePage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/dashboard/performance?period=${period}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: PerformanceData) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const kpis = useMemo(() => {
    if (!data) return null;
    return [
      {
        label: "Demandes reçues",
        value: data.current.received,
        previousValue: data.previous.received,
        formatter: (v: number) => v.toString(),
        icon: FileText,
        color: "bg-blue-50 text-blue-600",
        higherIsBetter: true,
      },
      {
        label: "Leads débloqués",
        value: data.current.unlocked,
        previousValue: data.previous.unlocked,
        formatter: (v: number) => v.toString(),
        icon: Unlock,
        color: "bg-green-50 text-green-600",
        higherIsBetter: true,
      },
      {
        label: "Taux de conversion",
        value: data.current.conversionRate,
        previousValue: data.previous.conversionRate,
        formatter: (v: number) => `${v}%`,
        icon: TrendingUp,
        color: "bg-purple-50 text-purple-600",
        higherIsBetter: true,
      },
      {
        label: "Dépensé en leads",
        value: data.current.spentCents,
        previousValue: data.previous.spentCents,
        formatter: (v: number) => formatPrice(v),
        icon: Euro,
        color: "bg-amber-50 text-amber-600",
        higherIsBetter: false, // spending less for same output is better
      },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance</h2>
          <p className="text-sm text-muted-foreground">
            Évolution sur {PERIODS.find((p) => p.key === period)?.label.toLowerCase()},
            comparée à la période précédente
          </p>
        </div>
        <div className="inline-flex rounded-lg border bg-white p-0.5 shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                period === p.key
                  ? "bg-[var(--brand-green)] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Impossible de charger les statistiques : {error}
        </div>
      )}

      {/* KPI cards */}
      {loading || !kpis ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => {
            const delta = computeDelta(k.value, k.previousValue);
            const isPositive =
              (delta.direction === "up" && k.higherIsBetter) ||
              (delta.direction === "down" && !k.higherIsBetter);
            const isNegative =
              (delta.direction === "down" && k.higherIsBetter) ||
              (delta.direction === "up" && !k.higherIsBetter);
            return (
              <Card key={k.label}>
                <CardContent className="p-5">
                  <div className={`mb-3 inline-flex rounded-lg p-2 ${k.color}`}>
                    <k.icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold">{k.formatter(k.value)}</div>
                  <div className="text-sm text-muted-foreground">{k.label}</div>
                  <div className="mt-2 flex items-center gap-1 text-[11px]">
                    {delta.direction === "up" && <ArrowUp className="h-3 w-3" />}
                    {delta.direction === "down" && <ArrowDown className="h-3 w-3" />}
                    {delta.direction === "flat" && <Minus className="h-3 w-3" />}
                    <span
                      className={cn(
                        "font-medium",
                        isPositive && "text-emerald-600",
                        isNegative && "text-red-600",
                        delta.direction === "flat" && "text-muted-foreground"
                      )}
                    >
                      {delta.pct === null
                        ? "Aucune donnée précédente"
                        : delta.pct === 0
                          ? "Stable"
                          : `${delta.pct > 0 ? "+" : ""}${delta.pct}% vs période précédente`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Top cities + categories */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
              Top villes de départ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 rounded" />
            ) : !data || data.topCities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune demande sur la période.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 text-left font-medium">Ville</th>
                    <th className="py-2 text-right font-medium">Reçues</th>
                    <th className="py-2 text-right font-medium">Débloquées</th>
                    <th className="py-2 text-right font-medium">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCities.map((c) => (
                    <tr key={c.city} className="border-b last:border-0">
                      <td className="py-2 font-medium">{c.city}</td>
                      <td className="py-2 text-right font-mono">{c.received}</td>
                      <td className="py-2 text-right font-mono">{c.unlocked}</td>
                      <td className="py-2 text-right font-mono">
                        {c.conversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-[var(--brand-green)]" />
              Par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 rounded" />
            ) : !data || data.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune demande sur la période.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 text-left font-medium">Catégorie</th>
                    <th className="py-2 text-right font-medium">Reçues</th>
                    <th className="py-2 text-right font-medium">Débloquées</th>
                    <th className="py-2 text-right font-medium">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((c) => (
                    <tr key={c.category} className="border-b last:border-0">
                      <td className="py-2 font-medium">
                        {CATEGORY_LABELS[c.category] || c.category}
                      </td>
                      <td className="py-2 text-right font-mono">{c.received}</td>
                      <td className="py-2 text-right font-mono">{c.unlocked}</td>
                      <td className="py-2 text-right font-mono">
                        {c.conversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
