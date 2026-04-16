"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, formatPrice, formatDateShort } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv-export";
import { Download, Search, Loader2, FileX } from "lucide-react";
import toast from "react-hot-toast";

interface Transaction {
  id: string;
  company_id: string;
  company_name: string;
  type: string;
  amount_cents: number;
  status: string;
  mollie_id?: string | null;
  invoice_number?: string | null;
  description?: string;
  created_at: string;
}

const typeMap: Record<string, string> = {
  unlock: "Déverrouillage",
  subscription: "Abonnement",
  refund: "Remboursement",
  credit: "Crédit",
};

const statusColors: Record<string, string> = {
  paid: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  pending: "bg-yellow-50 text-yellow-700",
  refunded: "bg-blue-50 text-blue-700",
};

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/transactions");
      if (!res.ok) {
        throw new Error("Erreur lors du chargement");
      }
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
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (tx.company_name || "").toLowerCase().includes(q) ||
      (tx.mollie_id || "").toLowerCase().includes(q) ||
      (tx.invoice_number || "").toLowerCase().includes(q) ||
      (tx.description || "").toLowerCase().includes(q)
    );
  });

  const total = filtered.reduce(
    (sum, t) => sum + (t.status === "paid" ? t.amount_cents : 0),
    0
  );

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
          <p className="text-sm text-muted-foreground">
            Revenus ce mois :{" "}
            <span className="font-semibold text-foreground">
              {formatPrice(total)}
            </span>
          </p>
        </div>
        <button
          onClick={() =>
            downloadCSV(
              filtered.map((tx) => ({
                Entreprise: tx.company_name,
                Type: typeMap[tx.type] || tx.type,
                "Montant (EUR)": (tx.amount_cents / 100).toFixed(2),
                Statut: tx.status,
                "Mollie ID": tx.mollie_id || "",
                Facture: tx.invoice_number || "",
                Description: tx.description || "",
                Date: formatDateShort(tx.created_at),
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher par entreprise, Mollie ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)] focus:ring-1 focus:ring-[var(--brand-green)]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-16 shadow-sm">
          <FileX className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucune transaction trouvée.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Entreprise
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Montant
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Statut
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Mollie ID
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                  Facture
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b last:border-0 hover:bg-gray-50/50"
                >
                  <td className="px-5 py-3 font-medium">{tx.company_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {typeMap[tx.type] || tx.type}
                  </td>
                  <td
                    className={cn(
                      "px-5 py-3 font-semibold",
                      tx.amount_cents < 0 ? "text-red-600" : ""
                    )}
                  >
                    {formatPrice(Math.abs(tx.amount_cents))}
                    {tx.amount_cents === 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (essai)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        statusColors[tx.status] || "bg-gray-50 text-gray-700"
                      )}
                    >
                      {tx.status === "paid"
                        ? "Payé"
                        : tx.status === "failed"
                        ? "Échoué"
                        : tx.status === "refunded"
                        ? "Remboursé"
                        : "En attente"}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                    {tx.mollie_id || "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {formatDateShort(tx.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    {tx.invoice_number ? (
                      <a
                        href="#"
                        className="text-xs font-medium text-[var(--brand-green)] hover:underline"
                      >
                        {tx.invoice_number}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
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
