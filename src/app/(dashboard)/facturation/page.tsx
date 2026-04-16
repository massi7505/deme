"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Receipt,
  CreditCard,
  Calendar,
  Download,
  Euro,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Loader2,
  FileX,
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

interface Plan {
  name: string;
  priceCents: number;
  nextBilling: string | null;
}

interface Summary {
  totalCents: number;
  subscriptionCents: number;
  unlockCents: number;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FacturationPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/billing");
      if (!res.ok) {
        throw new Error("Erreur lors du chargement");
      }
      const data = await res.json();
      setTransactions(data.transactions || []);
      setPlan(data.plan || null);
      setSummary(data.summary || null);
    } catch {
      toast.error("Impossible de charger la facturation");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

      {/* Plan card + summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-[var(--brand-green)]" />
                Abonnement actuel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">
                  {plan ? formatPrice(plan.priceCents) : "0,00 \u20ac"}
                </span>
                <span className="text-sm text-muted-foreground">/ mois</span>
              </div>
              <Badge variant="default" className="gap-1">
                {plan?.name || "Aucun"}
              </Badge>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Prochaine facturation :{" "}
                <span className="font-medium text-foreground">
                  {plan?.nextBilling
                    ? formatDate(plan.nextBilling)
                    : "Non planifiée"}
                </span>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-1.5">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Changer de forfait
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Euro className="h-4 w-4 text-[var(--brand-green)]" />
                Résumé du mois
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-[var(--brand-green)]" />
              Historique des transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                      {transactions.filter((t) => statusFilter === "all" || t.status === statusFilter).map((txn) => {
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
                  {transactions.filter((t) => statusFilter === "all" || t.status === statusFilter).map((txn) => {
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
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
