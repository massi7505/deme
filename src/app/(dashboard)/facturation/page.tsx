"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv-export";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Receipt,
  Download,
  Euro,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Loader2,
  FileX,
  Wallet,
  ArrowDownLeft,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Transaction {
  id: string;
  type: string;
  description: string;
  amount_cents: number;
  status: string;
  invoice_number?: string;
  invoice_url?: string;
  invoice_full_url?: string;
  mollie_payment_id?: string;
  created_at: string;
}

interface Summary {
  totalCents: number;
  subscriptionCents: number;
  unlockCents: number;
  yearTotalCents: number;
}

interface WalletTxn {
  id: string;
  amount_cents: number;
  type: string;
  reason: string | null;
  expires_at: string | null;
  created_at: string;
}

interface Wallet {
  enabled: boolean;
  balanceCents: number;
  transactions: WalletTxn[];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FacturationPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "7d" | "30d" | "90d" | "year">("all");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/billing");
      if (!res.ok) {
        throw new Error("Erreur lors du chargement");
      }
      const data = await res.json();
      setTransactions(data.transactions || []);
      setSummary(data.summary || null);
      setWallet(data.wallet || null);
    } catch {
      toast.error("Impossible de charger la facturation");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  useEffect(() => {
    setPage(1);
  }, [search, periodFilter, statusFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = transactions
    .filter((t) => statusFilter === "all" || t.status === statusFilter)
    .filter((t) => {
      if (periodFilter === "all") return true;
      if (periodFilter === "year") {
        return new Date(t.created_at).getFullYear() === new Date().getFullYear();
      }
      const days = ({ "7d": 7, "30d": 30, "90d": 90 } as const)[periodFilter];
      return new Date(t.created_at).getTime() >= Date.now() - days * 86400000;
    })
    .filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (t.description || "").toLowerCase().includes(q) ||
        (t.invoice_number || "").toLowerCase().includes(q) ||
        (t.mollie_payment_id || "").toLowerCase().includes(q)
      );
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-8">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-2xl font-bold tracking-tight">Facturation</h2>
        <p className="text-sm text-muted-foreground">
          Gérez votre abonnement et consultez vos transactions.
        </p>
      </motion.div>

      {/* Wallet */}
      {wallet?.enabled && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-green-200 bg-gradient-to-br from-green-50/60 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-[var(--brand-green)]" />
                Mon portefeuille
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-1 rounded-lg bg-white/80 p-4">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Solde disponible
                </span>
                <span className="text-3xl font-bold text-[var(--brand-green-dark)]">
                  {formatPrice(wallet.balanceCents)}
                </span>
              </div>

              {/* How it works */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900">
                <p className="font-semibold">Comment utiliser votre solde</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  <li>
                    Votre portefeuille est <strong>automatiquement utilisé en priorité</strong> sur chaque achat de lead.
                  </li>
                  <li>
                    Solde ≥ prix du lead → <strong>0 € sur votre carte</strong>, tout prélevé sur le portefeuille.
                  </li>
                  <li>
                    Solde insuffisant → <strong>paiement mixte</strong>. Exemple : lead 12 €, solde 1 € → 1 € portefeuille + 11 € carte.
                  </li>
                  <li>
                    Les crédits expirent à la date indiquée dans l&apos;historique — utilisez-les avant.
                  </li>
                </ul>
              </div>

              {wallet.transactions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Historique récent
                  </p>
                  <div className="space-y-1">
                    {wallet.transactions.slice(0, 5).map((t) => {
                      const isCredit = t.amount_cents > 0;
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                                isCredit
                                  ? "bg-green-50 text-green-600"
                                  : "bg-gray-100 text-gray-500"
                              )}
                            >
                              {isCredit ? (
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">
                                {t.reason ||
                                  (isCredit ? "Crédit" : "Achat lead")}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatDateTime(t.created_at)}
                                {isCredit && t.expires_at && (
                                  <>
                                    {" · Expire le "}
                                    {new Date(t.expires_at).toLocaleDateString(
                                      "fr-FR",
                                      { day: "2-digit", month: "2-digit", year: "numeric" }
                                    )}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              isCredit ? "text-green-600" : "text-gray-700"
                            )}
                          >
                            {isCredit ? "+" : ""}
                            {formatPrice(t.amount_cents)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Euro className="h-4 w-4 text-[var(--brand-green)]" />
                Résumé
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Total dépensé ce mois
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {formatPrice(summary?.totalCents || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Total dépensé en {new Date().getFullYear()}
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatPrice(summary?.yearTotalCents || 0)}
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Abonnement</span>
                  <span className="font-medium">
                    {formatPrice(summary?.subscriptionCents || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Déblocages leads
                  </span>
                  <span className="font-medium">
                    {formatPrice(summary?.unlockCents || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transaction history */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-[var(--brand-green)]" />
              Historique des transactions
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={filtered.length === 0}
              onClick={() => {
                const rows = filtered.map((t) => ({
                  Date: formatDateTime(t.created_at),
                  Type: t.type,
                  Description: t.description || "",
                  Montant: (Math.abs(t.amount_cents) / 100).toFixed(2),
                  Statut: t.status,
                  "N° facture": t.invoice_number || "",
                }));
                downloadCSV(rows, "transactions");
              }}
            >
              <Download className="h-3.5 w-3.5" /> Exporter CSV
            </Button>
          </CardHeader>
          <CardContent>
            {/* Search + period filter */}
            {transactions.length > 0 && (
              <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Rechercher (description, N° facture, ID Mollie)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]"
                  />
                </div>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as "all" | "7d" | "30d" | "90d" | "year")}
                  className="rounded-lg border bg-white px-3 py-2 text-sm"
                >
                  <option value="all">Toutes périodes</option>
                  <option value="7d">7 derniers jours</option>
                  <option value="30d">30 derniers jours</option>
                  <option value="90d">90 derniers jours</option>
                  <option value="year">Cette année</option>
                </select>
              </div>
            )}

            {/* Status filter */}
            {transactions.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  { value: "all", label: "Tout", color: "" },
                  { value: "paid", label: "Payé", color: "bg-green-50 text-green-700 border-green-200" },
                  { value: "failed", label: "Échoué", color: "bg-red-50 text-red-700 border-red-200" },
                  { value: "pending", label: "En attente", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
                  { value: "refunded", label: "Remboursé", color: "bg-blue-50 text-blue-700 border-blue-200" },
                ].map((f) => {
                  const count = f.value === "all" ? transactions.length : transactions.filter((t) => t.status === f.value).length;
                  if (f.value !== "all" && count === 0) return null;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setStatusFilter(f.value)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                        statusFilter === f.value
                          ? f.value === "all" ? "bg-gray-900 text-white border-gray-900" : f.color + " ring-1 ring-offset-1"
                          : "hover:bg-gray-50"
                      )}
                    >
                      {f.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <FileX className="h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Aucune transaction pour le moment.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Facture</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((txn) => {
                        const desc =
                          txn.type === "lead_purchase" || txn.type === "unlock"
                            ? "Achat de lead"
                            : txn.type === "subscription"
                            ? "Abonnement"
                            : txn.type === "refund"
                            ? "Remboursement"
                            : txn.description || txn.type;
                        return (
                          <TableRow key={txn.id} className={txn.status === "failed" ? "bg-red-50/50" : undefined}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateTime(txn.created_at)}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {desc}
                              {txn.invoice_number && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {txn.invoice_number}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                              {txn.status === "failed" ? (
                                <span className="text-red-600">{formatPrice(Math.abs(txn.amount_cents || 0))}</span>
                              ) : (
                                formatPrice(Math.abs(txn.amount_cents || 0))
                              )}
                            </TableCell>
                            <TableCell>
                              <div
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                  txn.status === "paid"
                                    ? "bg-green-50 text-green-700"
                                    : txn.status === "refunded"
                                    ? "bg-blue-50 text-blue-700"
                                    : txn.status === "failed"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-yellow-50 text-yellow-700"
                                )}
                              >
                                {txn.status === "paid" ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                                {txn.status === "paid"
                                  ? "Payé"
                                  : txn.status === "refunded"
                                  ? "Remboursé"
                                  : txn.status === "failed"
                                  ? "Échoué"
                                  : "En attente"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {txn.invoice_number && txn.invoice_url ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5 text-xs"
                                  onClick={() => window.open(
                                    txn.invoice_full_url,
                                    "_blank"
                                  )}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Facture
                                </Button>
                              ) : txn.status === "failed" ? (
                                <span className="text-xs text-red-500 font-medium">
                                  Échec
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {paginated.map((txn) => {
                    const desc =
                      txn.type === "lead_purchase" || txn.type === "unlock"
                        ? "Achat de lead"
                        : txn.type === "subscription"
                        ? "Abonnement"
                        : txn.type === "refund"
                        ? "Remboursement"
                        : txn.description || txn.type;
                    return (
                      <div
                        key={txn.id}
                        className={cn(
                          "rounded-lg border p-3",
                          txn.status === "failed" ? "border-red-200 bg-red-50/50" : ""
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{desc}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(txn.created_at)}
                            </p>
                            {txn.invoice_number && (
                              <p className="text-[10px] text-muted-foreground">
                                {txn.invoice_number}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={cn("text-sm font-semibold", txn.status === "failed" && "text-red-600")}>
                              {formatPrice(Math.abs(txn.amount_cents || 0))}
                            </p>
                            <div
                              className={cn(
                                "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                txn.status === "paid"
                                  ? "bg-green-50 text-green-700"
                                  : txn.status === "refunded"
                                  ? "bg-blue-50 text-blue-700"
                                  : txn.status === "failed"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-yellow-50 text-yellow-700"
                              )}
                            >
                              {txn.status === "paid"
                                ? "Payé"
                                : txn.status === "refunded"
                                ? "Remboursé"
                                : txn.status === "failed"
                                ? "Échoué"
                                : "En attente"}
                            </div>
                          </div>
                        </div>
                        {txn.invoice_number && txn.invoice_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full gap-1.5 text-xs"
                            onClick={() => window.open(
                              txn.invoice_full_url,
                              "_blank"
                            )}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Télécharger la facture
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
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
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
