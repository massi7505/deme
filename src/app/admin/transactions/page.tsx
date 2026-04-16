"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv-export";
import { Download, Search, Loader2, FileX, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

interface Transaction {
  id: string;
  company_id: string;
  company_name: string;
  quote_distribution_id?: string | null;
  type: string;
  amount_cents: number;
  currency: string;
  status: string;
  mollie_payment_id?: string | null;
  invoice_number?: string | null;
  invoice_url?: string | null;
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
  }).format(new Date(date));
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/transactions");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTransactions(data || []);
    } catch {
      toast.error("Impossible de charger les transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filtered = transactions.filter((tx) => {
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (tx.company_name || "").toLowerCase().includes(q) ||
      (tx.mollie_payment_id || "").toLowerCase().includes(q) ||
      (tx.invoice_number || "").toLowerCase().includes(q)
    );
  });

  const totalPaid = filtered
    .filter((t) => t.status === "paid")
    .reduce((sum, t) => sum + t.amount_cents, 0);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Paiements</h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Revenus :{" "}
              <span className="font-semibold text-green-600">
                {formatPrice(totalPaid)}
              </span>
            </span>
            <span>Total : {filtered.length} transactions</span>
            {totalFailed > 0 && (
              <span className="font-medium text-red-600">
                {totalFailed} échec{totalFailed > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() =>
            downloadCSV(
              filtered.map((tx) => ({
                Entreprise: tx.company_name,
                Type: typeMap[tx.type] || tx.type,
                "Montant (EUR)": (tx.amount_cents / 100).toFixed(2),
                Statut: statusLabels[tx.status] || tx.status,
                "Mollie ID": tx.mollie_payment_id || "",
                Facture: tx.invoice_number || "",
                Date: formatDateTime(tx.created_at),
              })),
              "transactions"
            )
          }
          className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par entreprise, Mollie ID, facture..."
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-16 shadow-sm">
          <FileX className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucune transaction trouvée.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date / Heure</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entreprise</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Montant</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mollie ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Facture</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr
                  key={tx.id}
                  className={cn(
                    "border-b last:border-0 hover:bg-gray-50/50",
                    tx.status === "failed" && "bg-red-50/30"
                  )}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatDateTime(tx.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium">{tx.company_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {typeMap[tx.type] || tx.type}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 font-semibold",
                      tx.status === "failed" ? "text-red-600" : ""
                    )}
                  >
                    {formatPrice(Math.abs(tx.amount_cents))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        statusColors[tx.status] || "bg-gray-50 text-gray-700"
                      )}
                    >
                      {statusLabels[tx.status] || tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {tx.mollie_payment_id ? (
                      <a
                        href={`https://my.mollie.com/dashboard/payments/${tx.mollie_payment_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--brand-green)] hover:underline"
                      >
                        {tx.mollie_payment_id.slice(0, 14)}...
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {tx.invoice_number ? (
                      tx.invoice_url ? (
                        <a
                          href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/invoices/${tx.invoice_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-green)] hover:underline"
                        >
                          {tx.invoice_number}
                          <Download className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs font-medium">{tx.invoice_number}</span>
                      )
                    ) : tx.status === "failed" ? (
                      <span className="text-xs text-red-500">Échec</span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
