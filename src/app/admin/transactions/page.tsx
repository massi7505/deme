"use client";

import { Fragment } from "react";
import { useState, useEffect, useCallback } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv-export";
import {
  Download, Search, Loader2, FileX, ExternalLink, ChevronDown,
  ChevronRight, RefreshCw, RotateCcw, User, MapPin, Phone, Mail,
  Calendar, Hash, Truck, Building2, Receipt, Wallet, X,
} from "lucide-react";
import toast from "react-hot-toast";

interface Transaction {
  id: string;
  company_id: string;
  company_name: string;
  company_email?: string | null;
  company_phone?: string | null;
  company_city?: string | null;
  quote_distribution_id?: string | null;
  type: string;
  amount_cents: number;
  currency: string;
  status: string;
  mollie_payment_id?: string | null;
  invoice_number?: string | null;
  invoice_full_url?: string | null;
  lead_prospect_id?: string | null;
  lead_client_name?: string | null;
  lead_client_phone?: string | null;
  lead_client_email?: string | null;
  lead_from_city?: string | null;
  lead_to_city?: string | null;
  lead_category?: string | null;
  lead_move_date?: string | null;
  lead_status?: string | null;
  created_at: string;
}

const typeMap: Record<string, string> = {
  unlock: "Achat de lead",
  lead_purchase: "Achat de lead",
  subscription: "Abonnement",
  refund: "Remboursement",
  credit: "Crédit",
};

const statusLabels: Record<string, string> = {
  paid: "Payé",
  failed: "Échoué",
  pending: "En attente",
  refunded: "Remboursé",
};

const statusColors: Record<string, string> = {
  paid: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  pending: "bg-yellow-50 text-yellow-700",
  refunded: "bg-blue-50 text-blue-700",
};

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date));
}

function formatDateOnly(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundsEnabled, setRefundsEnabled] = useState(false);
  const [refundCardMode, setRefundCardMode] = useState(false);
  const [walletCaps, setWalletCaps] = useState<{
    monthRemaining: number;
    yearRemaining: number;
    maxPercent: number;
  } | null>(null);
  const [stuck, setStuck] = useState<Array<{
    id: string;
    amount_cents: number;
    wallet_debit_cents: number | null;
    mollie_payment_id: string | null;
    created_at: string;
    reconciled_at: string | null;
    companies: { name: string } | null;
  }>>([]);
  const [reconciling, setReconciling] = useState(false);

  const fetchStuck = useCallback(async () => {
    const res = await fetch("/api/admin/reconcile-payments");
    if (res.ok) {
      const d = await res.json();
      setStuck(d.stuck || []);
    }
  }, []);

  async function runReconcile() {
    setReconciling(true);
    try {
      const res = await fetch("/api/admin/reconcile-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minAgeMinutes: 0, limit: 100 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erreur");
      toast.success(
        `Réconciliation : ${d.paid} payés, ${d.failed} rollback, ${d.stillPending} encore en attente`
      );
      await Promise.all([fetchStuck(), fetchTransactions()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setReconciling(false);
    }
  }

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setRefundsEnabled(!!s?.refundsEnabled))
      .catch(() => {});
  }, []);

  async function openRefund(tx: Transaction) {
    setRefundTarget(tx);
    setRefundReason(
      tx.lead_prospect_id
        ? `Geste commercial — lead ${tx.lead_prospect_id}`
        : "Geste commercial"
    );
    setRefundCardMode(false);
    // Load the configured % and pre-fill the amount at exactly that cap
    try {
      const res = await fetch(`/api/admin/wallet?companyId=${tx.company_id}`);
      if (res.ok) {
        const d = await res.json();
        const pct = d.caps?.maxPercent ?? 30;
        const capCents = Math.floor((Math.abs(tx.amount_cents) * pct) / 100);
        setRefundAmount((capCents / 100).toFixed(2));
        setWalletCaps({
          monthRemaining: d.caps?.monthRemainingCents ?? -1,
          yearRemaining: d.caps?.yearRemainingCents ?? -1,
          maxPercent: pct,
        });
      } else {
        setRefundAmount((Math.abs(tx.amount_cents) * 0.3 / 100).toFixed(2));
      }
    } catch {
      setRefundAmount((Math.abs(tx.amount_cents) * 0.3 / 100).toFixed(2));
      setWalletCaps(null);
    }
  }

  function closeRefund() {
    if (refunding) return;
    setRefundTarget(null);
    setRefundAmount("");
    setRefundReason("");
    setRefundCardMode(false);
    setWalletCaps(null);
  }

  async function submitRefund() {
    if (!refundTarget) return;
    const amount = parseFloat(refundAmount.replace(",", "."));
    if (!amount || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }
    const maxPct = walletCaps?.maxPercent ?? 30;
    const capCents = Math.floor((Math.abs(refundTarget.amount_cents) * maxPct) / 100);
    if (amount * 100 > capCents + 0.5) {
      toast.error(
        `Maximum autorisé : ${(capCents / 100).toFixed(2)} € (${maxPct} %)`
      );
      return;
    }
    setRefunding(true);
    try {
      if (refundCardMode) {
        if (!confirm(
          `Cas exceptionnel : rembourser ${amount.toFixed(2)} € sur la carte du déménageur via Mollie ? Cette action est définitive.`
        )) {
          setRefunding(false);
          return;
        }
      }
      const res = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refund",
          transactionId: refundTarget.id,
          amountCents: Math.round(amount * 100),
          method: refundCardMode ? "bank" : "wallet",
          reason: refundReason || "Geste commercial",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur de remboursement");
        return;
      }
      toast.success(
        refundCardMode
          ? "Remboursement carte effectué"
          : "Crédit portefeuille envoyé — email envoyé"
      );
      closeRefund();
      fetchTransactions();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setRefunding(false);
    }
  }

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/transactions");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger les transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchStuck();
  }, [fetchTransactions, fetchStuck]);


  const filtered = transactions.filter((tx) => {
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (tx.company_name || "").toLowerCase().includes(q) ||
      (tx.mollie_payment_id || "").toLowerCase().includes(q) ||
      (tx.invoice_number || "").toLowerCase().includes(q) ||
      (tx.lead_prospect_id || "").toLowerCase().includes(q) ||
      (tx.lead_client_name || "").toLowerCase().includes(q)
    );
  });

  const totalPaid = filtered
    .filter((t) => t.status === "paid" && t.amount_cents > 0)
    .reduce((sum, t) => sum + t.amount_cents, 0);
  const totalRefunded = filtered
    .filter((t) => t.status === "refunded" || t.type === "refund")
    .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);
  const totalFailed = filtered.filter((t) => t.status === "failed").length;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Refund modal */}
      {refundTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeRefund}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50">
                  <Wallet className="h-5 w-5 text-[var(--brand-green-dark)]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Rembourser sur le portefeuille
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {refundTarget.company_name}
                    {" · "}
                    {formatPrice(Math.abs(refundTarget.amount_cents))} initial
                  </p>
                </div>
              </div>
              <button
                onClick={closeRefund}
                className="rounded p-1 text-muted-foreground hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Montant à rembourser (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-base font-semibold outline-none focus:border-[var(--brand-green)]"
                  disabled={refunding}
                />
                {walletCaps && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Maximum autorisé : <strong>{((Math.abs(refundTarget.amount_cents) * walletCaps.maxPercent) / 10000).toFixed(2)} €</strong>{" "}
                    ({walletCaps.maxPercent} % de {formatPrice(Math.abs(refundTarget.amount_cents))})
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Raison (visible par le déménageur)
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Geste commercial"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
                  disabled={refunding}
                />
              </div>

              {!refundCardMode && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
                  <p>
                    Le montant est crédité sur le <strong>portefeuille</strong> du déménageur. Un email « Vous avez reçu un remboursement » est envoyé automatiquement. Le crédit sera consommé sur ses prochains achats de leads.
                  </p>
                  {walletCaps && (
                    <div className="mt-2 space-y-0.5 border-t border-blue-200 pt-2 text-[11px]">
                      {walletCaps.maxPercent > 0 && walletCaps.maxPercent < 100 && (
                        <p>
                          Plafond par transaction :{" "}
                          <strong>{walletCaps.maxPercent} %</strong> (soit max{" "}
                          {((Math.abs(refundTarget.amount_cents) * walletCaps.maxPercent) / 10000).toFixed(2)} €)
                        </p>
                      )}
                      {walletCaps.monthRemaining >= 0 && (
                        <p>
                          Reste ce mois : <strong>{(walletCaps.monthRemaining / 100).toFixed(2)} €</strong>
                        </p>
                      )}
                      {walletCaps.yearRemaining >= 0 && (
                        <p>
                          Reste sur 365 j : <strong>{(walletCaps.yearRemaining / 100).toFixed(2)} €</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {refundCardMode && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">⚠ Cas exceptionnel</p>
                  <p className="mt-0.5">
                    Le montant sera remboursé sur la <strong>carte bancaire</strong> du déménageur via Mollie. Action irréversible.
                  </p>
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  checked={refundCardMode}
                  onChange={(e) => setRefundCardMode(e.target.checked)}
                  disabled={refunding || !refundTarget.mollie_payment_id}
                  className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-amber-600"
                />
                <span className="flex-1 text-muted-foreground">
                  <strong className="text-amber-700">Cas exceptionnel</strong> — rembourser sur la carte (Mollie) au lieu du portefeuille
                  {!refundTarget.mollie_payment_id && (
                    <span className="ml-1 text-[10px] italic">
                      (indisponible : transaction sans paiement Mollie)
                    </span>
                  )}
                </span>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeRefund}
                disabled={refunding}
                className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={submitRefund}
                disabled={refunding || !refundAmount}
                className={
                  "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-50 " +
                  (refundCardMode
                    ? "bg-amber-600 shadow-amber-500/20"
                    : "bg-brand-gradient shadow-green-500/20")
                }
              >
                {refunding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wallet className="h-3.5 w-3.5" />
                )}
                {refunding
                  ? "En cours..."
                  : refundCardMode
                    ? "Rembourser sur carte"
                    : "Rembourser + envoyer email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stuck payments panel */}
      {stuck.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                ⚠ {stuck.length} paiement{stuck.length > 1 ? "s" : ""} bloqué{stuck.length > 1 ? "s" : ""} (&gt; 30 min en attente)
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                Le webhook Mollie n&apos;a pas confirmé ces paiements. La réconciliation interroge Mollie et corrige automatiquement (paiement confirmé, rollback, ou crédit portefeuille).
              </p>
            </div>
            <button
              onClick={runReconcile}
              disabled={reconciling}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {reconciling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              {reconciling ? "Réconciliation…" : "Réconcilier maintenant"}
            </button>
          </div>
          <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
            {stuck.slice(0, 10).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md bg-white px-3 py-1.5 text-xs shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {s.companies?.name || "—"}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {formatDateTime(s.created_at)}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Mollie {s.mollie_payment_id}
                    {s.wallet_debit_cents && s.wallet_debit_cents > 0 && (
                      <> · Portefeuille réservé : {formatPrice(s.wallet_debit_cents)}</>
                    )}
                    {s.reconciled_at && (
                      <> · Dernière vérif : {formatDateTime(s.reconciled_at)}</>
                    )}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-amber-900">
                  {formatPrice(s.amount_cents)}
                </span>
              </div>
            ))}
            {stuck.length > 10 && (
              <p className="pt-1 text-center text-[10px] text-amber-700">
                … et {stuck.length - 10} autres
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Paiements</h2>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Revenus :{" "}
              <span className="font-semibold text-green-600">{formatPrice(totalPaid)}</span>
            </span>
            {totalRefunded > 0 && (
              <span className="text-muted-foreground">
                Remboursé :{" "}
                <span className="font-semibold text-blue-600">{formatPrice(totalRefunded)}</span>
              </span>
            )}
            {totalFailed > 0 && (
              <span className="font-medium text-red-600">
                {totalFailed} échec{totalFailed > 1 ? "s" : ""}
              </span>
            )}
            <span className="text-muted-foreground">{filtered.length} transaction{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setLoading(true); fetchTransactions(); }}
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              downloadCSV(
                filtered.map((tx) => ({
                  Date: formatDateTime(tx.created_at),
                  Entreprise: tx.company_name,
                  Type: typeMap[tx.type] || tx.type,
                  "Montant (EUR)": (tx.amount_cents / 100).toFixed(2),
                  Statut: statusLabels[tx.status] || tx.status,
                  "Mollie ID": tx.mollie_payment_id || "",
                  Facture: tx.invoice_number || "",
                  "Lead ID": tx.lead_prospect_id || "",
                  Client: tx.lead_client_name || "",
                  Trajet: tx.lead_from_city && tx.lead_to_city ? `${tx.lead_from_city} → ${tx.lead_to_city}` : "",
                })),
                "transactions"
              )
            }
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par entreprise, client, Mollie ID, prospect..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border bg-white px-3 py-2 text-sm"
        >
          <option value="all">Tous statuts</option>
          <option value="paid">Payés</option>
          <option value="failed">Échoués</option>
          <option value="pending">En attente</option>
          <option value="refunded">Remboursés</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-16 shadow-sm">
          <FileX className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune transaction trouvée.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date / Heure</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entreprise</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Montant</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Facture</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const isExpanded = expandedId === tx.id;
                return (
                  <Fragment key={tx.id}>
                    <tr
                      className={cn(
                        "border-b cursor-pointer hover:bg-gray-50/50 transition-colors",
                        tx.status === "failed" && "bg-red-50/30",
                        tx.status === "refunded" && "bg-blue-50/20",
                        isExpanded && "bg-gray-50"
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                    >
                      <td className="px-2 py-3 text-muted-foreground">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{tx.company_name}</p>
                        {tx.company_city && (
                          <p className="text-xs text-muted-foreground">{tx.company_city}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {typeMap[tx.type] || tx.type}
                      </td>
                      <td className={cn("px-4 py-3 font-semibold", tx.status === "failed" && "text-red-600", tx.type === "refund" && "text-blue-600")}>
                        {tx.type === "refund" ? "-" : ""}{formatPrice(Math.abs(tx.amount_cents))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", statusColors[tx.status] || "bg-gray-50 text-gray-700")}>
                          {statusLabels[tx.status] || tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {tx.invoice_number && tx.invoice_full_url ? (
                          <a
                            href={tx.invoice_full_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-green)] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Receipt className="h-3 w-3" />
                            {tx.invoice_number}
                          </a>
                        ) : tx.status === "failed" ? (
                          <span className="text-xs text-red-500">—</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {tx.status === "paid" && tx.type !== "refund" && refundsEnabled && (
                          <button
                            onClick={() => openRefund(tx)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--brand-green)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--brand-green-dark)] hover:bg-green-50"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Rembourser
                          </button>
                        )}
                        {tx.status === "paid" && tx.type !== "refund" && !refundsEnabled && (
                          <span className="text-[11px] text-muted-foreground" title="Activez les remboursements dans Paramètres → Remboursements">
                            —
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="border-b bg-gray-50/70 px-6 py-4">
                          <div className="grid gap-6 sm:grid-cols-3">
                            {/* Payment details */}
                            <div className="space-y-2">
                              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                <Receipt className="h-3.5 w-3.5" /> Paiement
                              </h4>
                              <dl className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <dt className="text-muted-foreground">ID transaction</dt>
                                  <dd className="font-mono text-xs">{tx.id.slice(0, 8)}...</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-muted-foreground">Mollie ID</dt>
                                  <dd>
                                    {tx.mollie_payment_id ? (
                                      <a
                                        href={`https://my.mollie.com/dashboard/payments/${tx.mollie_payment_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 font-mono text-xs text-[var(--brand-green)] hover:underline"
                                      >
                                        {tx.mollie_payment_id}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Mode test</span>
                                    )}
                                  </dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-muted-foreground">Montant</dt>
                                  <dd className="font-semibold">{formatPrice(Math.abs(tx.amount_cents))}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-muted-foreground">Devise</dt>
                                  <dd>{tx.currency || "EUR"}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-muted-foreground">Date</dt>
                                  <dd>{formatDateTime(tx.created_at)}</dd>
                                </div>
                              </dl>
                            </div>

                            {/* Company details */}
                            <div className="space-y-2">
                              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                <Building2 className="h-3.5 w-3.5" /> Entreprise
                              </h4>
                              <dl className="space-y-1 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-medium">{tx.company_name}</span>
                                </div>
                                {tx.company_email && (
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{tx.company_email}</span>
                                  </div>
                                )}
                                {tx.company_phone && (
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{tx.company_phone}</span>
                                  </div>
                                )}
                                {tx.company_city && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{tx.company_city}</span>
                                  </div>
                                )}
                              </dl>
                            </div>

                            {/* Lead details */}
                            <div className="space-y-2">
                              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                <Truck className="h-3.5 w-3.5" /> Lead associé
                              </h4>
                              {tx.lead_prospect_id ? (
                                <dl className="space-y-1 text-sm">
                                  <div className="flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-mono text-xs">{tx.lead_prospect_id}</span>
                                  </div>
                                  {tx.lead_client_name && (
                                    <div className="flex items-center gap-1.5">
                                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span>{tx.lead_client_name}</span>
                                    </div>
                                  )}
                                  {tx.lead_client_phone && (
                                    <div className="flex items-center gap-1.5">
                                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span>{tx.lead_client_phone}</span>
                                    </div>
                                  )}
                                  {tx.lead_from_city && tx.lead_to_city && (
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span>{tx.lead_from_city} → {tx.lead_to_city}</span>
                                    </div>
                                  )}
                                  {tx.lead_move_date && (
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span>{formatDateOnly(tx.lead_move_date)}</span>
                                    </div>
                                  )}
                                  {tx.lead_category && (
                                    <div className="text-xs">
                                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium capitalize">{tx.lead_category}</span>
                                    </div>
                                  )}
                                </dl>
                              ) : (
                                <p className="text-xs text-muted-foreground">Aucun lead associé</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


