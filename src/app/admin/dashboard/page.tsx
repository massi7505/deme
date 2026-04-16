"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CreditCard,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
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

interface Stats {
  companies: number;
  leads: number;
  revenue: number;
  pendingClaims: number;
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ companies: 0, leads: 0, revenue: 0, pendingClaims: 0 });
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
    { label: "Déménageurs", value: String(stats.companies), icon: Building2, color: "text-green-600 bg-green-50" },
    { label: "Leads total", value: String(stats.leads), icon: FileText, color: "text-blue-600 bg-blue-50" },
    { label: "Revenus total", value: formatPrice(stats.revenue), icon: CreditCard, color: "text-purple-600 bg-purple-50" },
    { label: "Réclamations", value: String(stats.pendingClaims), icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
  ];

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            custom={i}
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className={cn("rounded-lg p-2", kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/30" />
            </div>
            <div className="mt-3">
              <div className="font-display text-2xl font-bold">
                {loading ? "..." : kpi.value}
              </div>
              <div className="text-sm text-muted-foreground">{kpi.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Recent Companies */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="font-display text-base font-semibold">Derniers déménageurs inscrits</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            </div>
          ) : recentCompanies.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Aucune entreprise inscrite</div>
          ) : (
            <div className="divide-y">
              {recentCompanies.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.city && <span className="ml-2 text-xs text-muted-foreground">{c.city}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      c.account_status === "active" ? "bg-green-50 text-green-700" :
                      c.account_status === "trial" ? "bg-blue-50 text-blue-700" :
                      "bg-yellow-50 text-yellow-700"
                    )}>
                      {c.account_status === "active" ? "Actif" : c.account_status === "trial" ? "Essai" : "En attente"}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateShort(c.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Leads */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="font-display text-base font-semibold">Dernières demandes de devis</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Aucune demande de devis</div>
          ) : (
            <div className="divide-y">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{lead.prospect_id}</span>
                    <p className="text-sm">{lead.from_city || "?"} → {lead.to_city || "?"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateShort(lead.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
