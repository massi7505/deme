"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, formatDateShort, formatDate } from "@/lib/utils";
import {
  Search, Download, Trash2, ShieldAlert, RefreshCw, Loader2, X,
} from "lucide-react";
import toast from "react-hot-toast";

interface Quote {
  id: string;
  prospect_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  from_city: string | null;
  to_city: string | null;
  status: string;
  created_at: string;
}

interface HistoryRow {
  id: string;
  action: "export" | "anonymize";
  email_hash: string;
  admin_email: string;
  affected_rows: number;
  notes: string | null;
  created_at: string;
}

export default function AdminGdprPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"email" | "prospectId">("email");
  const [searching, setSearching] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [notes, setNotes] = useState("");

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/gdpr");
      if (res.ok) {
        const d = await res.json();
        setHistory(d.history || []);
      }
    } catch {
      toast.error("Impossible de charger l'historique");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setQuotes([]);
    setResolvedEmail(null);
    try {
      const body: { email?: string; prospectId?: string } = {};
      if (searchMode === "email") body.email = searchQuery.trim();
      else body.prospectId = searchQuery.trim();

      const res = await fetch("/api/admin/gdpr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || "Erreur");
        return;
      }
      setQuotes(d.quotes || []);
      setResolvedEmail(d.resolvedEmail || null);
      if ((d.quotes || []).length === 0) {
        toast("Aucune donnée trouvée");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setSearching(false);
    }
  }

  async function handleExport() {
    if (quotes.length === 0) return;
    setExporting(true);
    try {
      const body: { email?: string; prospectId?: string } = {};
      if (resolvedEmail) body.email = resolvedEmail;
      else if (quotes[0].prospect_id) body.prospectId = quotes[0].prospect_id;

      const res = await fetch("/api/admin/gdpr/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Erreur export");
        return;
      }
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition") || "";
      const match = dispo.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `gdpr-export-${Date.now()}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export téléchargé + tracé dans l'historique");
      loadHistory();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setExporting(false);
    }
  }

  async function handleAnonymize() {
    if (confirmText !== "ANONYMISER") {
      toast.error("Tapez ANONYMISER pour confirmer");
      return;
    }
    setAnonymizing(true);
    try {
      const res = await fetch("/api/admin/gdpr/anonymize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteRequestIds: quotes.map((q) => q.id),
          confirmation: "ANONYMISER",
          notes: notes || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || "Erreur anonymisation");
        return;
      }
      toast.success(
        `Anonymisation OK — ${d.totalAffected} lignes modifiées`
      );
      setConfirmOpen(false);
      setConfirmText("");
      setNotes("");
      setQuotes([]);
      setResolvedEmail(null);
      setSearchQuery("");
      loadHistory();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setAnonymizing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">RGPD</h2>
          <p className="text-sm text-muted-foreground">
            Export + anonymisation des données clients (art. 15 + 17)
          </p>
        </div>
      </div>

      {/* Zone 1 — Search */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b pb-3 mb-4">
          <Search className="h-4 w-4 text-[var(--brand-green)]" />
          <h3 className="text-sm font-semibold">Rechercher un client</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={searchMode}
            onChange={(e) => setSearchMode(e.target.value as "email" | "prospectId")}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="email">Email</option>
            <option value="prospectId">ID Prospect</option>
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={searchMode === "email" ? "client@example.com" : "59613706FR640240"}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="flex items-center gap-2 rounded-lg bg-brand-gradient px-5 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Rechercher
          </button>
        </div>
      </div>

      {/* Zone 2 — Detail + actions */}
      {quotes.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/40 p-5 shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-200 pb-3 mb-4">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold">
              {quotes.length} demande{quotes.length > 1 ? "s" : ""} trouvée{quotes.length > 1 ? "s" : ""}
              {resolvedEmail && <> — <span className="font-mono text-xs">{resolvedEmail}</span></>}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-200/70">
                  <th className="text-left py-2 font-medium text-muted-foreground">Prospect</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Client</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Trajet</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Statut</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Créé le</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-b border-amber-100/70 last:border-0">
                    <td className="py-2 font-mono text-xs">{q.prospect_id || "—"}</td>
                    <td className="py-2">{q.client_name || "—"}</td>
                    <td className="py-2">{q.from_city || "?"} → {q.to_city || "?"}</td>
                    <td className="py-2"><span className="text-xs">{q.status}</span></td>
                    <td className="py-2 text-xs text-muted-foreground">{formatDateShort(q.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exporter les données (JSON)
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={anonymizing}
              className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Anonymiser
            </button>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !anonymizing && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Confirmer l&apos;anonymisation</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {quotes.length} demande{quotes.length > 1 ? "s" : ""} — irréversible
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={anonymizing}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <p className="text-sm text-gray-700">
                Cette action remplace toutes les PII du client ({resolvedEmail || "—"})
                par des placeholders, supprime ses tokens d&apos;avis et les events
                rate-limit associés. Les factures des déménageurs sont conservées
                (obligation comptable 10 ans) mais sans info client.
              </p>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Notes internes (facultatif)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Demande reçue par email le 23/04/2026"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  disabled={anonymizing}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Tapez <strong>ANONYMISER</strong> pour confirmer
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                  disabled={anonymizing}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t bg-gray-50 p-4">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={anonymizing}
                className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleAnonymize}
                disabled={anonymizing || confirmText !== "ANONYMISER"}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {anonymizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {anonymizing ? "Anonymisation..." : "Anonymiser définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zone 3 — History */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[var(--brand-green)]" />
            <h3 className="text-sm font-semibold">Historique des demandes (50 dernières)</h3>
          </div>
          <button
            onClick={loadHistory}
            className="flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", historyLoading && "animate-spin")} />
            Actualiser
          </button>
        </div>

        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune demande RGPD traitée pour l&apos;instant
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Action</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Hash email</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Admin</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Lignes</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b last:border-0">
                    <td className="py-2 text-xs">{formatDate(h.created_at)}</td>
                    <td className="py-2">
                      <span className={cn(
                        "text-xs font-semibold",
                        h.action === "anonymize" ? "text-red-600" : "text-blue-600"
                      )}>
                        {h.action === "anonymize" ? "Anonymisé" : "Exporté"}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-xs">{h.email_hash.slice(0, 8)}…</td>
                    <td className="py-2 text-xs">{h.admin_email}</td>
                    <td className="py-2 text-xs">{h.affected_rows}</td>
                    <td className="py-2 text-xs text-muted-foreground truncate max-w-[240px]">{h.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
