"use client";

import { useState, useEffect } from "react";
import { cn, formatDateShort, formatPrice } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv-export";
import {
  Search, CheckCircle2, Clock, XCircle, Shield, Ban,
  Eye, RefreshCw, Download, Trash2, ChevronLeft, MapPin,
  Mail, Phone, Globe, Building2, Star, Play, Wallet,
  RotateCcw, Loader2, X as XIcon, Gift,
} from "lucide-react";
import toast from "react-hot-toast";

interface Region {
  id: string;
  department_code: string;
  department_name: string;
  categories: string[];
}

interface Company {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  siret: string;
  vat_number: string | null;
  phone: string | null;
  email_contact: string | null;
  email_billing: string | null;
  email_general: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  employee_count: number | null;
  legal_status: string | null;
  account_status: string;
  kyc_status: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
  pending_name: string | null;
  pending_name_requested_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  profiles: { id: string; email: string; full_name: string | null; phone: string | null } | null;
  company_regions: Region[];
  quote_distributions: Array<{
    id: string;
    status: string;
    price_cents: number;
    created_at: string;
    quote_requests: { id: string; prospect_id: string; from_city: string | null; to_city: string | null; client_name: string | null } | null;
  }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Actif", color: "bg-green-50 text-green-700" },
  trial: { label: "Essai", color: "bg-blue-50 text-blue-700" },
  pending: { label: "En attente", color: "bg-yellow-50 text-yellow-700" },
  suspended: { label: "Suspendu", color: "bg-red-50 text-red-700" },
  closed: { label: "Fermé", color: "bg-gray-100 text-gray-600" },
};

const kycConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  approved: { label: "Vérifié", icon: CheckCircle2, color: "text-green-500" },
  pending: { label: "En attente", icon: Clock, color: "text-yellow-500" },
  in_review: { label: "En cours", icon: Shield, color: "text-blue-500" },
  rejected: { label: "Refusé", icon: XCircle, color: "text-red-500" },
};

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [refundsEnabled, setRefundsEnabled] = useState(false);
  const [walletData, setWalletData] = useState<{
    balance: number;
    transactions: Array<{
      id: string;
      amount_cents: number;
      type: string;
      refund_method: string | null;
      refund_percent: number | null;
      reason: string | null;
      expires_at: string | null;
      created_at: string;
    }>;
    refundableTransactions: Array<{
      id: string;
      amount_cents: number;
      created_at: string;
      mollie_payment_id: string | null;
      quote_distribution_id: string | null;
      already_refunded: boolean;
    }>;
    caps: {
      refundsEnabled: boolean;
      maxPercent: number;
      monthlyCapCents: number;
      yearlyCapCents: number;
      monthRefundedCents: number;
      yearRefundedCents: number;
      monthRemainingCents: number;
      yearRemainingCents: number;
    };
  } | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // Refund modal state (reused for any transaction on this company)
  const [refundTarget, setRefundTarget] = useState<
    | { id: string; amount_cents: number; mollie_payment_id: string | null }
    | null
  >(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundBankMode, setRefundBankMode] = useState(false);
  const [refundBusy, setRefundBusy] = useState(false);

  async function fetchCompanies() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/companies");
      if (res.ok) setCompanies(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchCompanies(); }, []);

  // Load refund settings to know whether to show the wallet panel
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!s) return;
        setRefundsEnabled(!!s.refundsEnabled);
      })
      .catch(() => {});
  }, []);

  // Fetch wallet state when a company is selected
  useEffect(() => {
    if (!selectedCompany || !refundsEnabled) {
      setWalletData(null);
      return;
    }
    setWalletLoading(true);
    fetch(`/api/admin/wallet?companyId=${selectedCompany.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setWalletData(d))
      .finally(() => setWalletLoading(false));
  }, [selectedCompany, refundsEnabled]);

  function openRefund(txn: {
    id: string;
    amount_cents: number;
    mollie_payment_id: string | null;
  }) {
    const maxPct = walletData?.caps?.maxPercent ?? 30;
    const abs = Math.abs(txn.amount_cents);
    // Pre-fill at exactly the configured %, admin can lower but never exceed
    const capCents = Math.floor((abs * maxPct) / 100);
    setRefundTarget(txn);
    setRefundAmount((capCents / 100).toFixed(2));
    setRefundReason("Geste commercial");
    setRefundBankMode(false);
  }

  function closeRefund() {
    if (refundBusy) return;
    setRefundTarget(null);
    setRefundAmount("");
    setRefundReason("");
    setRefundBankMode(false);
  }

  async function submitRefund() {
    if (!refundTarget || !selectedCompany) return;
    const amount = parseFloat(refundAmount.replace(",", "."));
    if (!amount || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (refundBankMode) {
      if (
        !confirm(
          `Rembourser ${amount.toFixed(2)} € sur la carte bancaire via Mollie ? Action définitive.`
        )
      ) return;
    }
    setRefundBusy(true);
    try {
      const res = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refund",
          transactionId: refundTarget.id,
          amountCents: Math.round(amount * 100),
          method: refundBankMode ? "bank" : "wallet",
          reason: refundReason || "Geste commercial",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur de remboursement");
        return;
      }
      toast.success(
        refundBankMode
          ? "Remboursement carte effectué"
          : "Crédit portefeuille envoyé + email"
      );
      closeRefund();
      // refresh wallet panel
      const r = await fetch(`/api/admin/wallet?companyId=${selectedCompany.id}`);
      if (r.ok) setWalletData(await r.json());
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setRefundBusy(false);
    }
  }

  async function handleDeleteRegion(regionId: string) {
    if (!confirm("Supprimer cette région ?")) return;
    const res = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_region", regionId }),
    });
    if (res.ok) { toast.success("Région supprimée"); fetchCompanies(); }
    else toast.error("Erreur lors de la suppression");
  }

  async function handleAction(id: string, action: string, extra?: Record<string, string>) {
    const res = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, ...extra }),
    });
    if (res.ok) {
      toast.success("Action effectuée !");
      fetchCompanies();
      if (selectedCompany?.id === id && action === "delete") setSelectedCompany(null);
    } else {
      const data = await res.json();
      toast.error(data.error || "Erreur");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteConfirmText.trim() !== deleteTarget.name.trim()) {
      toast.error("Le nom saisi ne correspond pas");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id: deleteTarget.id,
          confirmName: deleteConfirmText.trim(),
        }),
      });
      if (res.ok) {
        toast.success("Déménageur supprimé définitivement");
        if (selectedCompany?.id === deleteTarget.id) setSelectedCompany(null);
        setDeleteTarget(null);
        setDeleteConfirmText("");
        fetchCompanies();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } finally {
      setDeleting(false);
    }
  }

  // Refresh selected when companies change
  useEffect(() => {
    if (selectedCompany) {
      const updated = companies.find(c => c.id === selectedCompany.id);
      if (updated) setSelectedCompany(updated);
    }
  }, [companies, selectedCompany?.id]);

  const filtered = companies.filter((c) => {
    if (filterStatus !== "all" && c.account_status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.city || "").toLowerCase().includes(q) || (c.email_contact || "").toLowerCase().includes(q) || c.siret.includes(q);
    }
    return true;
  });

  // ─── DELETE CONFIRMATION MODAL ───────────────────────────
  const deleteModal = deleteTarget && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => { if (!deleting) { setDeleteTarget(null); setDeleteConfirmText(""); } }}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">
              Suppression définitive
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Cette action est <span className="font-semibold text-red-600">irréversible</span>.
              Elle supprime l&apos;entreprise, ses leads, transactions, factures, avis,
              photos, notifications, le compte utilisateur et les fichiers stockés.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-900">
            Pour confirmer, copiez le nom exact de l&apos;entreprise ci-dessous :
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 rounded bg-white px-3 py-2 font-mono text-sm">
            <span className="truncate">{deleteTarget.name}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(deleteTarget.name)}
              className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-gray-200"
            >
              Copier
            </button>
          </div>
        </div>

        <input
          type="text"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder="Collez le nom exact ici"
          className="mt-3 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          autoFocus
          disabled={deleting}
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
            disabled={deleting}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={confirmDelete}
            disabled={deleting || deleteConfirmText.trim() !== deleteTarget.name.trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Suppression..." : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── REFUND MODAL ────────────────────────────────────────
  const refundModal = refundTarget && walletData && (() => {
    const maxPct = walletData.caps.maxPercent ?? 100;
    const sourceAbs = Math.abs(refundTarget.amount_cents);
    const capCents = Math.floor((sourceAbs * maxPct) / 100);
    const amountNum = parseFloat((refundAmount || "0").replace(",", ".")) || 0;
    const overCap = amountNum * 100 > capCents + 0.5;
    return (
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
                <Gift className="h-5 w-5 text-[var(--brand-green-dark)]" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Geste commercial</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Transaction source : {formatPrice(sourceAbs)} · Max{" "}
                  {(capCents / 100).toFixed(2)} € ({maxPct} %)
                </p>
              </div>
            </div>
            <button
              onClick={closeRefund}
              className="rounded p-1 text-muted-foreground hover:bg-gray-100"
              aria-label="Fermer"
            >
              <XIcon className="h-4 w-4" />
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
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-base font-semibold outline-none",
                  overCap ? "border-red-500 focus:border-red-500" : "focus:border-[var(--brand-green)]"
                )}
                disabled={refundBusy}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Maximum autorisé : <strong className="text-foreground">{(capCents / 100).toFixed(2)} €</strong>{" "}
                ({maxPct} % de {formatPrice(sourceAbs)})
              </p>
              {overCap && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Dépasse le plafond {maxPct} %.
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
                disabled={refundBusy}
              />
            </div>

            {refundBankMode ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold">⚠ Cas exceptionnel</p>
                <p className="mt-0.5">
                  Le montant sera remboursé sur la <strong>carte bancaire</strong> via Mollie. Action irréversible.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
                Crédit portefeuille — un email « Vous avez reçu un remboursement » est envoyé automatiquement. Consommé sur les prochains achats de leads.
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-xs">
              <input
                type="checkbox"
                checked={refundBankMode}
                onChange={(e) => setRefundBankMode(e.target.checked)}
                disabled={refundBusy || !refundTarget.mollie_payment_id}
                className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-amber-600"
              />
              <span className="flex-1 text-muted-foreground">
                <strong className="text-amber-700">Cas exceptionnel</strong> — rembourser sur carte au lieu du portefeuille
                {!refundTarget.mollie_payment_id && (
                  <span className="ml-1 text-[10px] italic">
                    (indisponible : pas de paiement Mollie)
                  </span>
                )}
              </span>
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={closeRefund}
              disabled={refundBusy}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={submitRefund}
              disabled={refundBusy || !refundAmount || overCap}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-50",
                refundBankMode
                  ? "bg-amber-600 shadow-amber-500/20"
                  : "bg-brand-gradient shadow-green-500/20"
              )}
            >
              {refundBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : refundBankMode ? (
                <RotateCcw className="h-3.5 w-3.5" />
              ) : (
                <Gift className="h-3.5 w-3.5" />
              )}
              {refundBusy
                ? "En cours..."
                : refundBankMode
                  ? "Rembourser sur carte"
                  : "Créditer + email"}
            </button>
          </div>
        </div>
      </div>
    );
  })();

  // ─── DETAIL VIEW ─────────────────────────────────────────
  if (selectedCompany) {
    const c = selectedCompany;
    const status = statusConfig[c.account_status] || statusConfig.pending;
    const kyc = kycConfig[c.kyc_status] || kycConfig.pending;
    const KycIcon = kyc.icon;

    return (
      <div className="space-y-6">
        {deleteModal}
        {refundModal}
        <button onClick={() => setSelectedCompany(null)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Retour à la liste
        </button>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {c.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logo_url} alt={c.name} className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-green-100 text-xl font-bold text-green-700">
                {c.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{c.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", status.color)}>{status.label}</span>
                <span className={cn("flex items-center gap-1 text-xs font-semibold", kyc.color)}><KycIcon className="h-3.5 w-3.5" /> {kyc.label}</span>
                {c.is_verified && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Vérifié</span>}
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3 w-3" /> {Number(c.rating).toFixed(1)}/10 ({c.review_count} avis)</span>
              </div>
            </div>
          </div>
          {/* Statut & KYC summary */}
          <div className="rounded-lg border bg-gray-50 p-3 mb-3">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">Statut du compte</span>
                <p className="font-medium">{statusConfig[c.account_status]?.label || c.account_status}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Vérification identité (KYC)</span>
                <p className={cn("font-medium", kycConfig[c.kyc_status]?.color || "")}>{kycConfig[c.kyc_status]?.label || c.kyc_status}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Activer le compte directement */}
            {c.account_status !== "active" && (
              <button onClick={() => handleAction(c.id, "update_status", { status: "active" })} className="flex items-center gap-1.5 rounded-lg border bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"><CheckCircle2 className="h-3 w-3" /> Activer le compte</button>
            )}
            {/* KYC: approuver */}
            {c.kyc_status !== "approved" && (
              <button onClick={() => handleAction(c.id, "update_kyc", { kyc_status: "approved" })} className="flex items-center gap-1.5 rounded-lg border bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"><Shield className="h-3 w-3" /> Vérifier KYC</button>
            )}
            {/* KYC: rejeter */}
            {c.kyc_status !== "rejected" && c.kyc_status !== "approved" && (
              <button onClick={() => handleAction(c.id, "update_kyc", { kyc_status: "rejected" })} className="flex items-center gap-1.5 rounded-lg border bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"><XCircle className="h-3 w-3" /> Rejeter KYC</button>
            )}
            {/* KYC: révoquer */}
            {c.kyc_status === "approved" && (
              <button onClick={() => { if (confirm("Révoquer la vérification KYC ?")) handleAction(c.id, "update_kyc", { kyc_status: "pending" }); }} className="flex items-center gap-1.5 rounded-lg border bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"><Shield className="h-3 w-3" /> Révoquer KYC</button>
            )}
            {/* KYC: re-demander une nouvelle vérification (reset session) */}
            {(c.kyc_status === "approved" || c.kyc_status === "rejected") && (
              <button
                onClick={() => {
                  if (confirm("Re-demander une nouvelle vérification KYC ? Le déménageur devra la refaire depuis le début."))
                    handleAction(c.id, "reset_kyc");
                }}
                className="flex items-center gap-1.5 rounded-lg border bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                <Shield className="h-3 w-3" /> Re-demander KYC
              </button>
            )}
            {/* Suspendre / Réactiver */}
            {c.account_status !== "suspended" ? (
              <button onClick={() => { if (confirm("Suspendre ce compte ?")) handleAction(c.id, "suspend"); }} className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"><Ban className="h-3 w-3" /> Suspendre</button>
            ) : (
              <button onClick={() => handleAction(c.id, "reactivate")} className="flex items-center gap-1.5 rounded-lg border bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"><Play className="h-3 w-3" /> Réactiver</button>
            )}
            <button onClick={() => { setDeleteTarget(c); setDeleteConfirmText(""); }} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3" /> Supprimer</button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* Infos entreprise */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b px-5 py-3"><Building2 className="h-4 w-4 text-[var(--brand-green)]" /><h3 className="text-sm font-semibold">Informations entreprise</h3></div>
              <div className="grid gap-3 p-5 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">Nom</span><p className="font-medium">{c.name}</p></div>
                <div><span className="text-muted-foreground">SIRET</span><p className="font-mono font-medium">{c.siret}</p></div>
                <div><span className="text-muted-foreground">Adresse</span><p className="font-medium">{c.address || "—"}</p></div>
                <div><span className="text-muted-foreground">Ville</span><p className="font-medium">{c.postal_code} {c.city}</p></div>
                <div><span className="text-muted-foreground">Statut juridique</span><p className="font-medium">{c.legal_status || "—"}</p></div>
                <div><span className="text-muted-foreground">Effectif</span><p className="font-medium">{c.employee_count || "—"}</p></div>
                <div><span className="text-muted-foreground">TVA</span><p className="font-medium">{c.vat_number || "—"}</p></div>
                <div><span className="text-muted-foreground">Slug</span><p className="font-mono text-xs">{c.slug}</p></div>
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b px-5 py-3"><Mail className="h-4 w-4 text-[var(--brand-green)]" /><h3 className="text-sm font-semibold">Contact</h3></div>
              <div className="grid gap-3 p-5 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">Responsable</span><p className="font-medium">{c.profiles?.full_name || "—"}</p></div>
                <div><span className="text-muted-foreground">Email responsable</span><p className="font-medium">{c.profiles?.email || "—"}</p></div>
                <div><span className="text-muted-foreground">Email contact</span><p className="font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{c.email_contact || "—"}</p></div>
                <div><span className="text-muted-foreground">Email facturation</span><p className="font-medium">{c.email_billing || "—"}</p></div>
                <div><span className="text-muted-foreground">Téléphone</span><p className="font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{c.phone || "—"}</p></div>
                <div><span className="text-muted-foreground">Site web</span><p className="font-medium flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{c.website || "—"}</p></div>
              </div>
            </div>

            {/* Description */}
            {c.description && (
              <div className="rounded-xl border bg-white shadow-sm">
                <div className="border-b px-5 py-3"><h3 className="text-sm font-semibold">Description</h3></div>
                <div className="p-5 text-sm text-muted-foreground">{c.description}</div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Régions */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b px-5 py-3"><MapPin className="h-4 w-4 text-[var(--brand-green)]" /><h3 className="text-sm font-semibold">Régions ({c.company_regions?.length || 0})</h3></div>
              <div className="p-4">
                {(c.company_regions || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Aucune région</p>
                ) : (
                  <div className="space-y-2">
                    {c.company_regions.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                        <div>
                          <span className="font-medium">{r.department_name} ({r.department_code})</span>
                          <div className="flex gap-1 mt-1">{r.categories.map(cat => (
                            <span key={cat} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium capitalize">{cat}</span>
                          ))}</div>
                        </div>
                        <button onClick={() => handleDeleteRegion(r.id)} className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" title="Supprimer cette région">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Wallet / remboursements */}
            {refundsEnabled && (
              <div className="rounded-xl border bg-white shadow-sm">
                <div className="flex items-center justify-between border-b px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-[var(--brand-green)]" />
                    <h3 className="text-sm font-semibold">Portefeuille</h3>
                  </div>
                  {walletData?.caps?.maxPercent && walletData.caps.maxPercent < 100 && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                      Plafond {walletData.caps.maxPercent} %
                    </span>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  {/* Balance + caps usage */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-green-50 px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Solde
                      </p>
                      <p className="mt-0.5 text-base font-bold text-[var(--brand-green-dark)]">
                        {walletLoading ? "…" : formatPrice(walletData?.balance || 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Mois
                      </p>
                      <p className="mt-0.5 text-sm font-semibold">
                        {formatPrice(walletData?.caps?.monthRefundedCents || 0)}
                      </p>
                      {walletData?.caps && walletData.caps.monthlyCapCents > 0 && (
                        <p className="text-[9px] text-muted-foreground">
                          / {formatPrice(walletData.caps.monthlyCapCents)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border px-3 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        365 j
                      </p>
                      <p className="mt-0.5 text-sm font-semibold">
                        {formatPrice(walletData?.caps?.yearRefundedCents || 0)}
                      </p>
                      {walletData?.caps && walletData.caps.yearlyCapCents > 0 && (
                        <p className="text-[9px] text-muted-foreground">
                          / {formatPrice(walletData.caps.yearlyCapCents)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Refundable transactions */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">Geste commercial</p>
                      <span className="text-[10px] text-muted-foreground">
                        Sélectionnez une transaction à rembourser
                      </span>
                    </div>
                    <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border bg-gray-50/50 p-1.5">
                      {walletLoading ? (
                        <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                          Chargement…
                        </p>
                      ) : (walletData?.refundableTransactions?.length || 0) === 0 ? (
                        <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                          Aucune transaction remboursable.
                        </p>
                      ) : (
                        walletData?.refundableTransactions.map((t) => {
                          const pctMax = walletData.caps?.maxPercent ?? 100;
                          const capEuros = ((Math.abs(t.amount_cents) * pctMax) / 10000).toFixed(2);
                          return (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1.5 text-xs shadow-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                  {formatPrice(t.amount_cents)}
                                  <span className="ml-1.5 text-[10px] text-muted-foreground">
                                    {formatDateShort(t.created_at)}
                                  </span>
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {t.already_refunded
                                    ? "Déjà remboursé"
                                    : `Max remboursable : ${capEuros} €`}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  openRefund({
                                    id: t.id,
                                    amount_cents: t.amount_cents,
                                    mollie_payment_id: t.mollie_payment_id,
                                  })
                                }
                                disabled={t.already_refunded}
                                className="flex shrink-0 items-center gap-1 rounded-md bg-[var(--brand-green)] px-2 py-1 text-[11px] font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Gift className="h-3 w-3" />
                                Rembourser
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Wallet ledger history */}
                  {(walletData?.transactions?.length || 0) > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold">Historique portefeuille</p>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {walletData?.transactions.slice(0, 10).map((t) => {
                          const isBank = t.refund_method === "bank";
                          return (
                            <div
                              key={t.id}
                              className="flex items-center justify-between rounded border px-2 py-1.5 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                  {t.reason || t.type}
                                  {t.refund_percent != null && (
                                    <span className="ml-1 text-[10px] text-muted-foreground">
                                      ({t.refund_percent.toFixed(0)} %)
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatDateShort(t.created_at)}
                                  {t.expires_at && t.amount_cents > 0 &&
                                    ` · Expire ${formatDateShort(t.expires_at)}`}
                                  {isBank && " · Carte"}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "shrink-0 font-semibold",
                                  isBank
                                    ? "text-red-600"
                                    : t.amount_cents > 0
                                      ? "text-green-600"
                                      : "text-gray-600"
                                )}
                              >
                                {t.amount_cents > 0 && !isBank ? "+" : isBank ? "-" : ""}
                                {formatPrice(Math.abs(t.amount_cents))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Distribution stats */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-3"><h3 className="text-sm font-semibold">Distribution de leads</h3></div>
              <div className="grid grid-cols-3 divide-x p-4 text-center text-sm">
                <div>
                  <p className="text-2xl font-bold text-foreground">{(c.quote_distributions || []).length}</p>
                  <p className="text-xs text-muted-foreground">Reçus</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--brand-green)]">{(c.quote_distributions || []).filter(d => d.status === "unlocked").length}</p>
                  <p className="text-xs text-muted-foreground">Achetés</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{(c.quote_distributions || []).filter(d => d.status === "pending").length}</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </div>

            {/* Leads achetés */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-3"><h3 className="text-sm font-semibold">Leads achetés ({(c.quote_distributions || []).filter(d => d.status === "unlocked").length})</h3></div>
              <div className="p-4">
                {(c.quote_distributions || []).filter(d => d.status === "unlocked").length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Aucun lead acheté</p>
                ) : (
                  <div className="space-y-2">
                    {c.quote_distributions.filter(d => d.status === "unlocked").map((d) => (
                      <div key={d.id} className="rounded-lg border p-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{d.quote_requests?.from_city || "?"} → {d.quote_requests?.to_city || "?"}</span>
                            <p className="text-xs text-muted-foreground">{d.quote_requests?.client_name || "Client"} · {d.quote_requests?.prospect_id}</p>
                          </div>
                          <span className="text-xs font-semibold">{formatPrice(d.price_cents)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(c.quote_distributions || []).filter(d => d.status === "pending").length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">En attente ({c.quote_distributions.filter(d => d.status === "pending").length})</p>
                    {c.quote_distributions.filter(d => d.status === "pending").map((d) => (
                      <div key={d.id} className="flex items-center justify-between rounded-lg border border-dashed p-2 text-xs text-muted-foreground mb-1">
                        <span>{d.quote_requests?.from_city || "?"} → {d.quote_requests?.to_city || "?"}</span>
                        <span>{formatPrice(d.price_cents)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-3"><h3 className="text-sm font-semibold">Dates</h3></div>
              <div className="space-y-2 p-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Inscrit le</span><span className="font-medium">{formatDateShort(c.created_at)}</span></div>
                {c.trial_ends_at && <div className="flex justify-between"><span className="text-muted-foreground">Fin d&apos;essai</span><span className="font-medium">{formatDateShort(c.trial_ends_at)}</span></div>}
              </div>
            </div>

            {/* Profil public */}
            <a href={`/entreprises-demenagement/${c.slug}`} target="_blank" className="flex items-center justify-center gap-2 rounded-xl border bg-white p-3 text-sm font-medium text-[var(--brand-green)] hover:bg-green-50 transition-colors">
              <Eye className="h-4 w-4" /> Voir le profil public
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      {deleteModal}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Déménageurs</h2>
          <p className="text-sm text-muted-foreground">{companies.length} entreprise{companies.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCompanies} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button onClick={() => downloadCSV(filtered.map(c => ({ Nom: c.name, Ville: c.city, SIRET: c.siret, Statut: c.account_status, KYC: c.kyc_status, Note: c.rating, Avis: c.review_count, Email: c.email_contact, Téléphone: c.phone, Inscrit: formatDateShort(c.created_at) })), "demenageurs")} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Rechercher par nom, ville, SIRET, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="all">Tous statuts</option>
          <option value="active">Actif</option>
          <option value="pending">En attente</option>
          <option value="suspended">Suspendu</option>
        </select>
      </div>

      {(() => {
        const pending = companies.filter((c) => c.pending_name);
        if (pending.length === 0) return null;
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-sm font-semibold text-amber-900">
              ⚠ {pending.length} demande{pending.length > 1 ? "s" : ""} de changement de nom à valider
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pending.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompany(c)}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100"
                >
                  {c.name} → {c.pending_name}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{search ? "Aucun résultat" : "Aucune entreprise"}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Entreprise</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">SIRET</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">KYC</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Leads</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Note</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Inscrit le</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => {
                const status = statusConfig[company.account_status] || statusConfig.pending;
                const kyc = kycConfig[company.kyc_status] || kycConfig.pending;
                const KycIcon = kyc.icon;
                const dists = company.quote_distributions || [];
                const unlockedCount = dists.filter((d) => d.status === "unlocked").length;
                const totalCount = dists.length;

                return (
                  <tr key={company.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <span className="font-medium">{company.name}</span>
                      {company.city && <span className="ml-2 text-xs text-muted-foreground">{company.city}</span>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{company.siret}</td>
                    <td className="px-5 py-3"><span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", status.color)}>{status.label}</span></td>
                    <td className="px-5 py-3"><span className={cn("flex items-center gap-1 text-xs font-semibold", kyc.color)}><KycIcon className="h-3.5 w-3.5" />{kyc.label}</span></td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold text-foreground">{unlockedCount}</span>
                      <span className="text-xs text-muted-foreground"> / {totalCount} reçus</span>
                    </td>
                    <td className="px-5 py-3">{company.rating > 0 ? <span className="text-sm font-semibold">{Number(company.rating).toFixed(1)}/10</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDateShort(company.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedCompany(company)} className="rounded-md p-1.5 text-muted-foreground hover:bg-green-50 hover:text-green-600" title="Voir détail"><Eye className="h-4 w-4" /></button>
                        {company.account_status !== "suspended" ? (
                          <button onClick={() => { if (confirm("Suspendre ?")) handleAction(company.id, "suspend"); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" title="Suspendre"><Ban className="h-4 w-4" /></button>
                        ) : (
                          <button onClick={() => handleAction(company.id, "reactivate")} className="rounded-md p-1.5 text-muted-foreground hover:bg-green-50 hover:text-green-600" title="Réactiver"><Play className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => { setDeleteTarget(company); setDeleteConfirmText(""); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
