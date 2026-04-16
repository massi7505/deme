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
  mollie_id?: string;
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
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(txn.created_at)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {txn.description || txn.type}
                          </TableCell>
                          <TableCell className="text-sm font-semibold">
                            {formatPrice(Math.abs(txn.amount_cents || 0))}
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
                            {txn.invoice_number ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-xs"
                              >
                                <Download className="h-3.5 w-3.5" />
                                PDF
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {transactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {txn.description || txn.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(txn.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
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
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
