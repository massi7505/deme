"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountManagerCard } from "@/components/dashboard/AccountManagerCard";
import { motion } from "framer-motion";
import { formatPrice, formatDate, maskText } from "@/lib/utils";
import {
  FileText,
  Unlock,
  TrendingUp,
  Euro,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Lock,
  MapPin,
  Activity,
} from "lucide-react";

interface TopCity {
  city: string;
  count: number;
}

interface ActivityPoint {
  date: string;
  received: number;
  unlocked: number;
}

interface DashboardData {
  company: Record<string, unknown>;
  leads: Lead[];
  stats: {
    totalLeads: number;
    unlockedLeads: number;
    conversionRate: number;
    revenue: number;
    revenue30d: number;
    leads30d: number;
    unlocked30d: number;
    avgLeadPriceCents: number;
    topCities: TopCity[];
    activity30d: ActivityPoint[];
  };
  notifications: Record<string, unknown>[];
}

interface Lead {
  distributionId: string;
  quoteRequestId: string;
  priceCents: number;
  isTrial: boolean;
  status: string;
  competitorCount: number;
  createdAt: string;
  clientName: string | null;
  fromCity: string | null;
  toCity: string | null;
  moveDate: string | null;
  category: string;
}

export default function ApercuPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/overview")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-6 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">Impossible de charger le dashboard</p>
          <p className="text-sm text-muted-foreground">Connectez-vous ou réessayez</p>
          <Link href="/connexion" className="mt-4 inline-block rounded-lg bg-brand-gradient px-6 py-2 text-sm font-bold text-white">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const { company, leads, stats } = data;
  const accountStatus = company.account_status as string;
  const kycStatus = company.kyc_status as string;

  const statCards = [
    {
      label: "Demandes reçues",
      value: stats.totalLeads,
      sublabel: `${stats.leads30d} ces 30 derniers jours`,
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Débloquées",
      value: stats.unlockedLeads,
      sublabel: stats.avgLeadPriceCents > 0 ? `Prix moyen : ${formatPrice(stats.avgLeadPriceCents)}` : undefined,
      icon: Unlock,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Taux de conversion",
      value: `${stats.conversionRate}%`,
      sublabel: "Leads débloqués / reçus",
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Revenus (30j)",
      value: formatPrice(stats.revenue30d),
      sublabel: `Total : ${formatPrice(stats.revenue)}`,
      icon: Euro,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  const activityMax = Math.max(
    1,
    ...stats.activity30d.map((p) => p.received)
  );

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold tracking-tight">Aperçu</h2>
        <p className="text-sm text-muted-foreground">
          Bienvenue, {company.name as string}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className={`mb-3 inline-flex rounded-lg p-2 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
                {s.sublabel && (
                  <div className="mt-1 text-[11px] text-muted-foreground/80">{s.sublabel}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue sparkline + top cities */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-[var(--brand-green)]" />
                Activité sur 30 jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.leads30d === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Aucune demande reçue sur les 30 derniers jours
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--brand-green)]/30" />
                      Reçues :{" "}
                      <span className="font-semibold text-foreground">
                        {stats.leads30d}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--brand-green)]" />
                      Débloquées :{" "}
                      <span className="font-semibold text-foreground">
                        {stats.unlocked30d}
                      </span>
                    </span>
                  </div>
                  <div className="mt-3 flex h-32 items-end gap-[3px] rounded-lg bg-muted/20 p-2">
                    {stats.activity30d.map((p) => {
                      const total = p.received;
                      if (total === 0) {
                        return (
                          <div
                            key={p.date}
                            className="flex-1"
                            title={`${p.date} · Aucune demande`}
                          >
                            <div
                              className="w-full rounded-t bg-muted-foreground/10"
                              style={{ height: "100%" }}
                            />
                          </div>
                        );
                      }
                      const fullH = Math.max(10, Math.round((total / activityMax) * 100));
                      const unlockedPct =
                        total > 0 ? Math.round((p.unlocked / total) * 100) : 0;
                      return (
                        <div
                          key={p.date}
                          className="group relative flex h-full flex-1 flex-col justify-end"
                          title={`${p.date} · ${p.received} reçue${p.received > 1 ? "s" : ""}${p.unlocked > 0 ? ` · ${p.unlocked} débloquée${p.unlocked > 1 ? "s" : ""}` : ""}`}
                        >
                          <div
                            className="w-full overflow-hidden rounded-t bg-[var(--brand-green)]/30 transition-colors"
                            style={{ height: `${fullH}%` }}
                          >
                            {unlockedPct > 0 && (
                              <div
                                className="w-full bg-[var(--brand-green)] group-hover:bg-[var(--brand-green-dark)]"
                                style={{ height: `${unlockedPct}%`, marginTop: `${100 - unlockedPct}%` }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                    <span>il y a 30 jours</span>
                    <span>aujourd&apos;hui</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
                Top villes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topCities.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucune ville encore — achetez votre premier lead pour commencer.
                </p>
              ) : (
                <ul className="space-y-2">
                  {stats.topCities.map((c, idx) => (
                    <li key={c.city} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-[var(--brand-green-dark)]">
                          {idx + 1}
                        </span>
                        <span className="font-medium">{c.city}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.count} lead{c.count > 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leads */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Dernières demandes</h3>
            <Link href="/demandes-de-devis" className="text-sm font-medium text-[var(--brand-green)] hover:underline">
              Voir tout →
            </Link>
          </div>

          {leads.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <FileText className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="font-medium">Aucune demande pour le moment</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les demandes de devis correspondant à votre zone apparaîtront ici.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {leads.slice(0, 5).map((lead) => (
                <Link key={lead.distributionId} href={`/demandes-de-devis/${lead.distributionId}`}>
                  <Card className="transition-shadow hover:shadow-md cursor-pointer">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${lead.status === "unlocked" ? "bg-green-50" : "bg-gray-100"}`}>
                          {lead.status === "unlocked" ? (
                            <Unlock className="h-5 w-5 text-green-600" />
                          ) : (
                            <Lock className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {lead.clientName || maskText("Client", 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.fromCity} → {lead.toCity}
                            {lead.moveDate && ` · ${formatDate(lead.moveDate)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{formatPrice(lead.priceCents)}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Account status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-[var(--brand-green)]" />
                Statut du compte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accountStatus === "active" ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Compte actif
                </Badge>
              ) : accountStatus === "trial" ? (
                <Badge variant="default" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Essai gratuit (3 jours)
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1">
                  <Clock className="h-3 w-3" />
                  En attente de vérification
                </Badge>
              )}

              {accountStatus === "trial" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Vous êtes en période d&apos;essai de 3 jours. Vous pouvez consulter les leads mais pour les acheter vous devez :
                  </p>
                  <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                    <li className={kycStatus === "approved" ? "text-green-600 line-through" : "font-medium text-foreground"}>
                      Vérifier votre pièce d&apos;identité
                    </li>
                    <li className="text-muted-foreground">Acheter votre premier lead → compte actif</li>
                  </ol>
                  {kycStatus !== "approved" && (
                    <a href="/verification-identite" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient px-4 py-2 text-xs font-bold text-white shadow-md shadow-green-500/20 hover:brightness-110">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Vérifier mon identité
                    </a>
                  )}
                </div>
              )}

              {accountStatus === "active" && (
                <p className="text-xs text-muted-foreground">
                  Votre compte est vérifié et actif. Vous pouvez acheter des leads sans restriction.
                </p>
              )}

              {accountStatus === "pending" && (
                <p className="text-xs text-muted-foreground">
                  Vérifiez votre identité pour activer votre compte.
                </p>
              )}
            </CardContent>
          </Card>

          <AccountManagerCard />
        </div>
      </div>
    </div>
  );
}
