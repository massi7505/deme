"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { FileText, Lock, Unlock, ArrowRight, Search, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

interface Lead {
  distributionId: string;
  priceCents: number;
  isTrial: boolean;
  status: string;
  competitorCount: number;
  createdAt: string;
  unlockedAt: string | null;
  clientName: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  fromCity: string | null;
  fromPostalCode: string | null;
  toCity: string | null;
  toPostalCode: string | null;
  moveDate: string | null;
  category: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

function formatLeadName(lead: Lead): string {
  const first = lead.clientFirstName?.trim();
  const last = lead.clientLastName?.trim();
  if (last && first) return `${last} ${first}`;
  if (first) return first;
  if (last) return last;
  if (lead.status === "unlocked" && lead.clientName) return lead.clientName;
  return "Client";
}

function formatLeadRoute(lead: Lead): string {
  const from = [lead.fromPostalCode, lead.fromCity].filter(Boolean).join(" ") || "?";
  const to = [lead.toPostalCode, lead.toCity].filter(Boolean).join(" ") || "?";
  return `${from} → ${to}`;
}

const ITEMS_PER_PAGE = 10;

export default function DemandesDeDevisPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [spentCents, setSpentCents] = useState(0);
  const [pendingCents, setPendingCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/dashboard/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.leads) setLeads(d.leads);
        setSpentCents(d?.spentCents || 0);
        setPendingCents(d?.pendingCents || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = leads.filter((l) => {
    if (filterStatus === "unlocked" && l.status !== "unlocked") return false;
    if (filterStatus === "pending" && l.status === "unlocked") return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.fromCity || "").toLowerCase().includes(q) || (l.toCity || "").toLowerCase().includes(q);
    }
    return true;
  });

  const unlocked = leads
    .filter((l) => l.status === "unlocked")
    .sort((a, b) => {
      const ta = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
      const tb = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
      return tb - ta;
    });
  const pending = leads.filter((l) => l.status !== "unlocked");
  const lastUnlocked = unlocked[0];

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLeads = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold tracking-tight">Demandes de devis</h2>
        <p className="text-sm text-muted-foreground">
          {leads.length} demande{leads.length !== 1 ? "s" : ""} reçue{leads.length !== 1 ? "s" : ""}
        </p>
      </motion.div>

      {unlocked.length > 0 && lastUnlocked && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Achetés</p>
              <p className="mt-1 text-2xl font-bold">{unlocked.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Dépensé</p>
              <p className="mt-1 text-2xl font-bold">{formatPrice(spentCents)}</p>
              {pendingCents > 0 && (
                <p className="mt-0.5 text-[11px] text-amber-700">
                  + {formatPrice(pendingCents)} en attente
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Dernier achat</p>
              <p className="mt-1 text-sm font-semibold truncate">
                {formatLeadRoute(lastUnlocked)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatDate(lastUnlocked.unlockedAt || lastUnlocked.createdAt)}
              </p>
            </CardContent>
          </Card>
          <Link
            href={`/demandes-de-devis/${lastUnlocked.distributionId}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 text-sm font-bold text-white shadow-md shadow-green-500/20 hover:brightness-110"
          >
            Voir mon dernier achat <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher par ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]"
        />
      </div>

      <div className="flex gap-1 border-b">
        {[
          { key: "all", label: `Tous (${leads.length})` },
          { key: "unlocked", label: `Achetés (${unlocked.length})` },
          { key: "pending", label: `Disponibles (${pending.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              filterStatus === tab.key
                ? "border-[var(--brand-green)] text-[var(--brand-green-dark)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-20 rounded-xl" />))}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <FileText className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-lg font-medium">{search || filterStatus !== "all" ? "Aucun résultat" : "Aucune demande pour le moment"}</p>
            <p className="mt-1 text-sm text-muted-foreground">Les demandes correspondant à votre zone apparaîtront ici.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedLeads.map((lead, i) => (
              <motion.div key={lead.distributionId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Link href={`/demandes-de-devis/${lead.distributionId}`}>
                  <Card className="transition-all hover:shadow-md cursor-pointer">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", lead.status === "unlocked" ? "bg-green-50" : "bg-gray-100")}>
                          {lead.status === "unlocked" ? <Unlock className="h-5 w-5 text-green-600" /> : <Lock className="h-5 w-5 text-gray-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{formatLeadName(lead)}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-xs text-muted-foreground">
                              {formatLeadRoute(lead)}
                              {lead.moveDate && ` · ${formatDate(lead.moveDate)}`}
                            </p>
                            {lead.emailVerified && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                                <ShieldCheck className="h-3 w-3" /> Email
                              </span>
                            )}
                            {lead.phoneVerified && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                                <ShieldCheck className="h-3 w-3" /> Tél
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px]">{lead.competitorCount} concurrent{lead.competitorCount !== 1 ? "s" : ""}</Badge>
                        <span className="text-sm font-bold">{formatPrice(lead.priceCents)}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </Button>
              <span className="px-2 text-sm font-medium">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="gap-1"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
