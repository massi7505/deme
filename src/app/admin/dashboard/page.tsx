"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CreditCard,
  Building2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Trophy,
  Receipt,
  Unlock,
  Clock,
} from "lucide-react";
import { cn, formatPrice, formatDateShort } from "@/lib/utils";

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3 },
  }),
};

interface TopMover {
  id: string;
  name: string;
  city: string | null;
  revenue: number;
}

interface SparkPoint {
  date: string;
  cents: number;
}

interface Stats {
  companies: number;
  companiesActive: number;
  companiesTrial: number;
  leads: number;
  leadsPendingVerif: number;
  distributionsUnlocked: number;
  distributionsPending: number;
  conversionRate: number;
  revenue: number;
  revenue30d: number;
  pendingClaims: number;
  sparkline: SparkPoint[];
  topMovers: TopMover[];
}

interface RecentCompany {
  id: string;
  name: string;
  city: string | null;
  account_status: string;
  created_at: string;
}

interface RecentLead {
  id: string;
  prospect_id: string;
  from_city: string | null;
  to_city: string | null;
  status: string;
  created_at: string;
}

const DEFAULT_STATS: Stats = {
  companies: 0,
  companiesActive: 0,
  companiesTrial: 0,
  leads: 0,
  leadsPendingVerif: 0,
  distributionsUnlocked: 0,
  distributionsPending: 0,
  conversionRate: 0,
  revenue: 0,
  revenue30d: 0,
  pendingClaims: 0,
  sparkline: [],
  topMovers: [],
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([]);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentCompanies(data.recentCompanies);
        setRecentLeads(data.recentLeads);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  const kpiCards = [
    {
      label: "Revenus 30j",
      value: formatPrice(stats.revenue30d),
      sublabel: `Total : ${formatPrice(stats.revenue)}`,
      icon: CreditCard,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Déménageurs",
      value: String(stats.companies),
      sublabel: `${stats.companiesActive} actifs · ${stats.companiesTrial} en essai`,
      icon: Building2,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Leads total",
      value: String(stats.leads),
      sublabel:
        stats.leadsPendingVerif > 0
          ? `${stats.leadsPendingVerif} en attente de vérification`
          : undefined,
      icon: FileText,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Taux conversion",
      value: `${stats.conversionRate}%`,
      sublabel: `${stats.distributionsUnlocked} débloqués / ${stats.distributionsUnlocked + stats.distributionsPending} distribués`,
      icon: TrendingUp,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      label: "Distributions actives",
      value: String(stats.distributionsPending),
      sublabel: "En attente d'achat",
      icon: Clock,
      color: "text-slate-600 bg-slate-50",
    },
    {
      label: "Leads débloqués",
      value: String(stats.distributionsUnlocked),
      sublabel: "Revenus générés",
      icon: Unlock,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Réclamations",
      value: String(stats.pendingClaims),
      sublabel: stats.pendingClaims > 0 ? "À traiter" : "Aucune en attente",
      icon: AlertTriangle,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  const sparkMax = Math.max(1, ...stats.sparkline.map((p) => p.cents));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Vue d&apos;ensemble de la plateforme
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={i}
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <div className={cn("inline-flex rounded-lg p-2", kpi.color)}>
              <kpi.icon className="h-5 w-5" />
            </div>
            <div className="mt-3">
              <div className="font-display text-2xl font-bold">
                {loading ? "..." : kpi.value}
              </div>
              <div className="text-sm text-muted-foreground">{kpi.label}</div>
              {kpi.sublabel && (
                <div className="mt-1 text-[11px] text-muted-foreground/80">
                  {kpi.sublabel}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue sparkline + Top movers */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[var(--brand-green)]" />
            <h3 className="font-display text-base font-semibold">
              Revenus plateforme sur 30 jours
            </h3>
          </div>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            </div>
          ) : stats.revenue30d === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg bg-muted/30 text-sm text-muted-foreground">
              Aucun achat de lead sur les 30 derniers jours
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Total :{" "}
                  <span className="font-semibold text-foreground">
                    {formatPrice(stats.revenue30d)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Pic : {formatPrice(sparkMax)}
                </span>
              </div>
              <div className="mt-3 flex h-32 items-end gap-[3px] rounded-lg bg-muted/20 p-2">
                {stats.sparkline.map((p) => {
                  const hasData = p.cents > 0;
                  const h = hasData
                    ? Math.max(10, Math.round((p.cents / sparkMax) * 100))
                    : 100;
                  return (
                    <div
                      key={p.date}
                      title={`${p.date} · ${formatPrice(p.cents)}`}
                      style={{ height: `${h}%` }}
                      className={cn(
                        "flex-1 rounded-t transition-colors",
                        hasData
                          ? "bg-[var(--brand-green)] hover:bg-[var(--brand-green-dark)]"
                          : "bg-muted-foreground/10"
                      )}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                <span>il y a 30 jours</span>
                <span>aujourd&apos;hui</span>
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="font-display text-base font-semibold">Top déménageurs</h3>
          </div>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            </div>
          ) : stats.topMovers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucun revenu enregistré.
            </p>
          ) : (
            <ul className="space-y-3">
              {stats.topMovers.map((m, idx) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        idx === 0
                          ? "bg-amber-100 text-amber-700"
                          : idx === 1
                            ? "bg-slate-100 text-slate-700"
                            : idx === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-green-50 text-green-700"
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {m.name}
                      </span>
                      {m.city && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {m.city}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold">
                    {formatPrice(m.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Recent Companies */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="font-display text-base font-semibold">
              Derniers déménageurs inscrits
            </h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            </div>
          ) : recentCompanies.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Aucune entreprise inscrite
            </div>
          ) : (
            <div className="divide-y">
              {recentCompanies.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.city && <span className="ml-2 text-xs text-muted-foreground">{c.city}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        c.account_status === "active"
                          ? "bg-green-50 text-green-700"
                          : c.account_status === "trial"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-yellow-50 text-yellow-700"
                      )}
                    >
                      {c.account_status === "active"
                        ? "Actif"
                        : c.account_status === "trial"
                          ? "Essai"
                          : "En attente"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateShort(c.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="font-display text-base font-semibold">
              Dernières demandes de devis
            </h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Aucune demande de devis
            </div>
          ) : (
            <div className="divide-y">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {lead.prospect_id}
                    </span>
                    <p className="text-sm">
                      {lead.from_city || "?"} → {lead.to_city || "?"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateShort(lead.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
