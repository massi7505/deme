"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, formatPrice, formatDateShort, formatDate } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Clock, Loader2, FileX, ChevronLeft,
  Send, RefreshCw, MessageSquare, AlertTriangle, CreditCard, Search,
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
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [replying, setReplying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/claims");
      if (res.ok) setClaims(await res.json());
    } catch { toast.error("Impossible de charger les réclamations"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  useEffect(() => {
    if (selectedClaim) {
      const updated = claims.find(c => c.id === selectedClaim.id);
      if (updated) setSelectedClaim(updated);
    }
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
      } else toast.error("Erreur");
    } catch { toast.error("Erreur"); }
    finally { setActionLoading(false); }
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

  // ─── DETAIL VIEW ─────────────────────────────────────────
  if (selectedClaim) {
    const claim = selectedClaim;
    const status = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
    const StatusIcon = status.icon;
    const conversation = parseConversation(claim.admin_note);

    return (
      <div className="space-y-6">
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
              value={claim.status}
              onChange={(e) => handleStatusChange(claim.id, e.target.value)}
              disabled={actionLoading}
              className="rounded-lg border px-3 py-1.5 text-sm"
            >
              <option value="pending">En attente</option>
              <option value="in_review">En cours de vérification</option>
              <option value="approved">Approuvé</option>
              <option value="rejected">Rejeté</option>
              <option value="refunded">Remboursé</option>
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
                    onClick={() => handleStatusChange(claim.id, "refunded")}
                    disabled={actionLoading}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Réclamations</h2>
          <p className="text-sm text-muted-foreground">{claims.length} réclamation{claims.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={fetchClaims} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

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
