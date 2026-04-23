"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, formatPrice, formatDateShort, formatDate } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Clock, Loader2, FileX, ChevronLeft,
  Send, RefreshCw, MessageSquare, AlertTriangle, CreditCard, Search,
  Wallet, X,
} from "lucide-react";
import toast from "react-hot-toast";

interface Message {
  from: string;
  message: string;
  date: string;
}

interface Claim {
  id: string;
  company_id: string;
  company_name: string;
  company_email: string;
  quote_distribution_id: string | null;
  prospect_id: string | null;
  quote_request_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  admin_note: string | null;
  amount_cents: number;
  created_at: string;
  resolved_at: string | null;
}

interface DefectiveLead {
  quoteRequestId: string;
  fromCity: string | null;
  toCity: string | null;
  category: string | null;
  flaggedAt: string;
  reasonsBreakdown: Record<string, number>;
  totalRefundCents: number;
  claims: Array<{
    id: string;
    companyId: string;
    companyName: string;
    reason: string;
    amountCents: number;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: { label: "En attente", color: "text-yellow-600", bgColor: "bg-yellow-50 border-yellow-200", icon: Clock },
  in_review: { label: "En cours de vérification", color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200", icon: Search },
  approved: { label: "Approuvé", color: "text-green-600", bgColor: "bg-green-50 border-green-200", icon: CheckCircle2 },
  rejected: { label: "Rejeté", color: "text-red-600", bgColor: "bg-red-50 border-red-200", icon: XCircle },
  refunded: { label: "Remboursé", color: "text-purple-600", bgColor: "bg-purple-50 border-purple-200", icon: CreditCard },
};

function parseConversation(adminNote: string | null): Message[] {
  if (!adminNote) return [];
  try {
    const parsed = JSON.parse(adminNote);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    if (adminNote) return [{ from: "admin", message: adminNote, date: new Date().toISOString() }];
    return [];
  }
}

export default function AdminClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [defectiveLeads, setDefectiveLeads] = useState<DefectiveLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [replying, setReplying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  // Refund modal state — mirrors /admin/transactions flow
  const [refundTarget, setRefundTarget] = useState<Claim | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundCardMode, setRefundCardMode] = useState(false);
  const [refundSourceTxn, setRefundSourceTxn] = useState<{
    id: string;
    mollie_payment_id: string | null;
  } | null>(null);
  const [walletCaps, setWalletCaps] = useState<{
    maxPercent: number;
    monthRemaining: number;
    yearRemaining: number;
  } | null>(null);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/claims");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setClaims(data);
          setDefectiveLeads([]);
        } else {
          setClaims(data.claims || []);
          setDefectiveLeads(data.defectiveLeads || []);
        }
      }
    } catch { toast.error("Impossible de charger les réclamations"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  async function handleAcceptDefect(quoteRequestId: string, claimCount: number) {
    if (!confirm(`Rembourser tous les ${claimCount} claims de ce lead ? Action définitive.`)) return;
    const res = await fetch("/api/admin/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept_defect", quoteRequestId }),
    });
    if (res.ok) {
      const d = await res.json();
      toast.success(`${d.refundedCount} remboursements effectués`);
      fetchClaims();
    } else {
      const err = await res.json();
      toast.error(err.error || "Erreur");
    }
  }

  async function handleRejectDefect(quoteRequestId: string) {
    if (!confirm("Refuser la détection collective ? Les claims resteront à traiter individuellement.")) return;
    const res = await fetch("/api/admin/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject_defect", quoteRequestId }),
    });
    if (res.ok) {
      toast.success("Détection refusée");
      fetchClaims();
    } else {
      toast.error("Erreur");
    }
  }

  useEffect(() => {
    if (selectedClaim) {
      const updated = claims.find(c => c.id === selectedClaim.id);
      if (updated) setSelectedClaim(updated);
    }
    // Only id as dep: passing full selectedClaim would re-run every time
    // setSelectedClaim replaces the ref with the fresh object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims, selectedClaim?.id]);

  async function handleStatusChange(id: string, status: string) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", id, status }),
      });
      if (res.ok) {
        toast.success(`Statut mis à jour : ${STATUS_CONFIG[status]?.label || status}`);
        fetchClaims();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Erreur");
      }
    } catch { toast.error("Erreur"); }
    finally { setActionLoading(false); }
  }

  async function openRefund(claim: Claim) {
    setRefundTarget(claim);
    setRefundReason(`Réclamation : ${claim.reason}`);
    setRefundCardMode(false);
    setRefundSourceTxn(null);
    setWalletCaps(null);

    try {
      const res = await fetch(`/api/admin/wallet?companyId=${claim.company_id}`);
      const data = await res.json();
      if (!data.caps?.refundsEnabled) {
        toast.error("Remboursements désactivés dans les paramètres");
        setRefundTarget(null);
        return;
      }
      const maxPct = data.caps.maxPercent ?? 30;
      const sourceTxn = (data.refundableTransactions || []).find(
        (t: { quote_distribution_id: string | null; already_refunded: boolean }) =>
          t.quote_distribution_id === claim.quote_distribution_id && !t.already_refunded
      );
      if (!sourceTxn) {
        toast.error("Aucune transaction payée non-remboursée trouvée pour ce lead");
        setRefundTarget(null);
        return;
      }
      setRefundSourceTxn({
        id: sourceTxn.id,
        mollie_payment_id: sourceTxn.mollie_payment_id,
      });
      const capCents = Math.floor((Math.abs(sourceTxn.amount_cents) * maxPct) / 100);
      setRefundAmount((capCents / 100).toFixed(2));
      setWalletCaps({
        maxPercent: maxPct,
        monthRemaining: data.caps.monthRemainingCents ?? -1,
        yearRemaining: data.caps.yearRemainingCents ?? -1,
      });
    } catch {
      toast.error("Impossible de charger les plafonds");
      setRefundTarget(null);
    }
  }

  function closeRefund() {
    if (refunding) return;
    setRefundTarget(null);
    setRefundAmount("");
    setRefundReason("");
    setRefundCardMode(false);
    setRefundSourceTxn(null);
    setWalletCaps(null);
  }

  async function submitRefund() {
    if (!refundTarget) return;
    const amount = parseFloat(refundAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (refundCardMode && !refundSourceTxn?.mollie_payment_id) {
      toast.error("Transaction source sans Mollie — impossible de rembourser par carte");
      return;
    }
    setRefunding(true);
    try {
      const res = await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refund",
          claimId: refundTarget.id,
          amountCents: Math.round(amount * 100),
          method: refundCardMode ? "bank" : "wallet",
          reason: refundReason || "Réclamation acceptée",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur de remboursement");
        return;
      }
      toast.success(
        refundCardMode ? "Remboursement carte effectué" : "Portefeuille crédité"
      );
      closeRefund();
      fetchClaims();
    } catch {
      toast.error("Erreur de remboursement");
    } finally {
      setRefunding(false);
    }
  }

  async function handleReply() {
    if (!replyMessage.trim() || !selectedClaim) return;
    setReplying(true);
    try {
      const res = await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          id: selectedClaim.id,
          message: replyMessage,
          sendEmail,
          companyEmail: selectedClaim.company_email,
          reason: selectedClaim.reason,
        }),
      });
      if (res.ok) {
        toast.success(sendEmail ? "Réponse envoyée + email envoyé" : "Réponse enregistrée");
        setReplyMessage("");
        fetchClaims();
      } else toast.error("Erreur lors de l'envoi");
    } catch { toast.error("Erreur"); }
    finally { setReplying(false); }
  }

  const stats = Object.entries(STATUS_CONFIG).map(([key, config]) => ({
    key,
    label: config.label,
    count: claims.filter(c => c.status === key).length,
    bgColor: config.bgColor,
  }));

  const filtered = claims.filter(c => filterStatus === "all" || c.status === filterStatus);

  // ─── REFUND MODAL (shared by list + detail view) ─────────
  const refundModal = refundTarget && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={closeRefund}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-green-light,#f0fdf4)]">
              <Wallet className="h-5 w-5 text-[var(--brand-green-dark,#16a34a)]" />
            </div>
            <div>
              <h3 className="font-semibold">Remboursement — réclamation</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {refundTarget.company_name}
                {refundTarget.amount_cents > 0 && (
                  <> · {formatPrice(refundTarget.amount_cents)} initial</>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={closeRefund}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Montant (€)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green,#22c55e)]"
              disabled={refunding}
            />
            {walletCaps && refundTarget.amount_cents > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Maximum autorisé :{" "}
                <strong>
                  {((refundTarget.amount_cents * walletCaps.maxPercent) / 10000).toFixed(2)} €
                </strong>{" "}
                ({walletCaps.maxPercent} % de {formatPrice(refundTarget.amount_cents)})
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Motif
            </label>
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green,#22c55e)]"
              disabled={refunding}
            />
          </div>

          {!refundCardMode && (
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
              <p>
                Le montant est crédité sur le <strong>portefeuille</strong> du déménageur.
                Un email de remboursement est envoyé automatiquement.
              </p>
              {walletCaps && (
                <div className="mt-2 space-y-1">
                  {walletCaps.monthRemaining >= 0 && (
                    <p>
                      Reste ce mois :{" "}
                      <strong>{(walletCaps.monthRemaining / 100).toFixed(2)} €</strong>
                    </p>
                  )}
                  {walletCaps.yearRemaining >= 0 && (
                    <p>
                      Reste sur 365 j :{" "}
                      <strong>{(walletCaps.yearRemaining / 100).toFixed(2)} €</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {refundCardMode && (
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              Remboursement sur la carte d&apos;origine via Mollie. Le montant quitte
              définitivement le compte — les plafonds restent appliqués.
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={refundCardMode}
              onChange={(e) => setRefundCardMode(e.target.checked)}
              disabled={refunding || !refundSourceTxn?.mollie_payment_id}
              className="rounded"
            />
            <span>
              Rembourser sur la carte (Mollie)
              {!refundSourceTxn?.mollie_payment_id && (
                <span className="ml-1 text-xs text-muted-foreground">
                  — indisponible (pas de paiement Mollie)
                </span>
              )}
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-gray-50 p-4">
          <button
            onClick={closeRefund}
            disabled={refunding}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={submitRefund}
            disabled={refunding || !refundAmount || !refundSourceTxn}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50",
              refundCardMode
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-[var(--brand-green-dark,#16a34a)] hover:brightness-110"
            )}
          >
            {refunding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wallet className="h-3.5 w-3.5" />
            )}
            {refunding
              ? "Remboursement..."
              : refundCardMode
              ? "Rembourser sur carte"
              : "Créditer le portefeuille"}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── DETAIL VIEW ─────────────────────────────────────────
  if (selectedClaim) {
    const claim = selectedClaim;
    const status = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
    const StatusIcon = status.icon;
    const conversation = parseConversation(claim.admin_note);

    return (
      <div className="space-y-6">
        {refundModal}
        <button onClick={() => setSelectedClaim(null)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Retour aux réclamations
        </button>

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Réclamation — {claim.company_name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={cn("flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", status.bgColor, status.color)}>
                <StatusIcon className="h-3 w-3" /> {status.label}
              </span>
              <span className="text-xs text-muted-foreground">{formatDate(claim.created_at)}</span>
              {claim.amount_cents > 0 && <span className="text-xs font-medium">{formatPrice(claim.amount_cents)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={claim.status === "refunded" ? "refunded" : claim.status}
              onChange={(e) => handleStatusChange(claim.id, e.target.value)}
              disabled={actionLoading || claim.status === "refunded"}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              <option value="pending">En attente</option>
              <option value="in_review">En cours de vérification</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
              {claim.status === "refunded" && (
                <option value="refunded" disabled>Remboursé</option>
              )}
            </select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main — Conversation */}
          <div className="space-y-4 lg:col-span-2">
            {/* Raison + Description */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Motif de réclamation</h3>
              </div>
              <div className="p-5">
                <p className="text-sm font-semibold">{claim.reason}</p>
                {claim.description && <p className="mt-2 text-sm text-muted-foreground">{claim.description}</p>}
              </div>
            </div>

            {/* Conversation */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <MessageSquare className="h-4 w-4 text-[var(--brand-green)]" />
                <h3 className="text-sm font-semibold">Échanges ({conversation.length})</h3>
              </div>
              <div className="p-5 space-y-4">
                {conversation.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Aucun échange — envoyez une première réponse ci-dessous</p>
                ) : (
                  conversation.map((msg, i) => (
                    <div key={i} className={cn("rounded-lg p-4", msg.from === "admin" ? "bg-green-50 border border-green-100 ml-8" : "bg-gray-50 border mr-8")}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn("text-xs font-semibold", msg.from === "admin" ? "text-green-700" : "text-gray-700")}>
                          {msg.from === "admin" ? "Admin" : claim.company_name}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(msg.date)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))
                )}

                {/* Reply form */}
                <div className="border-t pt-4 space-y-3">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={4}
                    placeholder="Tapez votre réponse..."
                    className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-[var(--brand-green)] resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="rounded" />
                      Envoyer par email à <span className="font-medium">{claim.company_email || "—"}</span>
                    </label>
                    <button
                      onClick={handleReply}
                      disabled={!replyMessage.trim() || replying}
                      className="flex items-center gap-2 rounded-lg bg-brand-gradient px-5 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
                    >
                      {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {replying ? "Envoi..." : "Répondre"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-3"><h3 className="text-sm font-semibold">Informations</h3></div>
              <div className="space-y-3 p-4 text-sm">
                {claim.prospect_id && (
                  <div><span className="text-muted-foreground">ID Prospect</span><p className="font-mono text-xs font-semibold text-blue-600">{claim.prospect_id}</p></div>
                )}
                <div><span className="text-muted-foreground">Entreprise</span><p className="font-medium">{claim.company_name}</p></div>
                <div><span className="text-muted-foreground">Email</span><p className="font-medium">{claim.company_email || "—"}</p></div>
                <div><span className="text-muted-foreground">Montant</span><p className="font-medium">{formatPrice(claim.amount_cents)}</p></div>
                <div><span className="text-muted-foreground">Date</span><p className="font-medium">{formatDate(claim.created_at)}</p></div>
                {claim.resolved_at && <div><span className="text-muted-foreground">Résolu le</span><p className="font-medium">{formatDate(claim.resolved_at)}</p></div>}
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="border-b px-5 py-3"><h3 className="text-sm font-semibold">Actions rapides</h3></div>
              <div className="p-4 space-y-2">
                {claim.status !== "refunded" && (
                  <button
                    onClick={() => openRefund(claim)}
                    disabled={actionLoading || refunding}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Rembourser
                  </button>
                )}
                {claim.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleStatusChange(claim.id, "in_review")}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border bg-blue-50 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      <Search className="h-3.5 w-3.5" /> Marquer en vérification
                    </button>
                    <button
                      onClick={() => handleStatusChange(claim.id, "approved")}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border bg-green-50 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approuver
                    </button>
                    <button
                      onClick={() => handleStatusChange(claim.id, "rejected")}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border bg-red-50 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Rejeter
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      {refundModal}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Réclamations</h2>
          <p className="text-sm text-muted-foreground">{claims.length} réclamation{claims.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={fetchClaims} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {defectiveLeads.length > 0 && (
        <div className="rounded-xl border-2 border-red-300 bg-red-50/80 p-5 shadow-sm">
          <p className="text-base font-bold text-red-900">
            🚨 {defectiveLeads.length} lead{defectiveLeads.length > 1 ? "s" : ""} confirmé{defectiveLeads.length > 1 ? "s" : ""} défectueux — validation requise
          </p>
          <div className="mt-3 space-y-3">
            {defectiveLeads.map((lead) => (
              <div key={lead.quoteRequestId} className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold">
                  {lead.fromCity || "?"} → {lead.toCity || "?"}
                  {lead.category && <span className="ml-2 text-xs font-normal text-muted-foreground">{lead.category}</span>}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Flagué le {new Date(lead.flaggedAt).toLocaleString("fr-FR")}
                </p>
                <p className="mt-1 text-xs">
                  {lead.claims.length} signalements : {Object.entries(lead.reasonsBreakdown)
                    .map(([r, n]) => `${n} × ${r}`)
                    .join(" · ")}
                </p>
                <p className="mt-1 text-xs">
                  Remboursement total : <strong>{(lead.totalRefundCents / 100).toFixed(2)} €</strong>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Movers : {lead.claims.map((c) => c.companyName).join(", ")}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAcceptDefect(lead.quoteRequestId, lead.claims.length)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                  >
                    ✓ Rembourser tous
                  </button>
                  <button
                    onClick={() => handleRejectDefect(lead.quoteRequestId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    ✗ Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? "all" : s.key)} className={cn("rounded-xl border p-3 text-left transition-all", filterStatus === s.key ? s.bgColor + " ring-2 ring-offset-1" : "bg-white hover:bg-gray-50")}>
            <div className="text-xl font-bold">{s.count}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 rounded-xl border bg-white">
          <FileX className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">{filterStatus !== "all" ? "Aucune réclamation avec ce statut" : "Aucune réclamation"}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Entreprise</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">ID Prospect</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Raison</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Montant</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Échanges</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((claim) => {
                const st = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
                const StIcon = st.icon;
                const msgCount = parseConversation(claim.admin_note).length;

                return (
                  <tr key={claim.id} className="border-b last:border-0 hover:bg-gray-50/50 cursor-pointer" onClick={() => setSelectedClaim(claim)}>
                    <td className="px-5 py-3 font-medium">{claim.company_name}</td>
                    <td className="px-5 py-3">
                      {claim.prospect_id ? (
                        <span className="font-mono text-xs font-medium text-blue-600">{claim.prospect_id}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium">{claim.reason}</span>
                      {claim.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{claim.description}</p>}
                    </td>
                    <td className="px-5 py-3">{formatPrice(claim.amount_cents)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDateShort(claim.created_at)}</td>
                    <td className="px-5 py-3">
                      <span className={cn("flex items-center gap-1 text-xs font-semibold", st.color)}>
                        <StIcon className="h-3.5 w-3.5" /> {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {msgCount > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" /> {msgCount}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium hover:bg-gray-200">
                        Voir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
