"use client";

import { useState, useEffect } from "react";
import { cn, formatDateShort, formatPrice } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv-export";
import {
  Search, Download, RefreshCw, Eye, Trash2, Send, X,
  Users, Lock, Unlock, ChevronLeft,
  MapPin, User, Phone, Mail, Hash, Truck, ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

interface Distribution {
  id: string;
  company_id: string;
  status: string;
  price_cents: number;
  is_trial: boolean;
  unlocked_at: string | null;
  companies: { id: string; name: string; city: string | null } | null;
}

interface Lead {
  id: string;
  prospect_id: string;
  from_city: string | null;
  from_address: string | null;
  from_postal_code: string | null;
  from_housing_type: string | null;
  from_floor: number | null;
  from_elevator: boolean;
  defect_status: string | null;
  to_city: string | null;
  to_address: string | null;
  to_postal_code: string | null;
  to_housing_type: string | null;
  to_floor: number | null;
  to_elevator: boolean;
  category: string;
  status: string;
  move_date: string | null;
  volume_m3: number | null;
  room_count: number | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_salutation: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
  source: string | null;
  geographic_zone: string | null;
  created_at: string;
  distributions: number;
  unlocked: number;
  distributions_list: Distribution[];
  email_verified: boolean | null;
  phone_verified: boolean | null;
  distributed_at: string | null;
}

interface Company {
  id: string;
  name: string;
  city: string | null;
  account_status: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  new: { label: "Nouveau", color: "bg-blue-50 text-blue-700" },
  active: { label: "Actif", color: "bg-green-50 text-green-700" },
  blocked: { label: "Bloqué", color: "bg-red-50 text-red-700" },
  completed: { label: "Terminé", color: "bg-gray-100 text-gray-600" },
  archived: { label: "Archivé", color: "bg-gray-100 text-gray-500" },
};

const categoryMap: Record<string, { label: string; color: string }> = {
  national: { label: "National", color: "bg-blue-50 text-blue-700" },
  entreprise: { label: "Entreprise", color: "bg-purple-50 text-purple-700" },
  international: { label: "International", color: "bg-amber-50 text-amber-700" },
};

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterVerif, setFilterVerif] = useState("all");
  const [filterDistribution, setFilterDistribution] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "distributions_desc" | "unlocked_desc">("created_desc");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [distributeLeadId, setDistributeLeadId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [filterDefect, setFilterDefect] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const ITEMS_PER_PAGE = 20;

  async function fetchLeads() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        setCompanies(data.companies || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchLeads(); }, []);

  async function handleDistribute(quoteRequestId: string) {
    if (!selectedCompany) { toast.error("Sélectionnez un déménageur"); return; }
    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "distribute", quoteRequestId, companyId: selectedCompany }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Lead distribué !");
      setDistributeLeadId(null);
      setSelectedCompany("");
      fetchLeads();
      // Refresh selected lead
      if (selectedLead?.id === quoteRequestId) {
        const updated = leads.find(l => l.id === quoteRequestId);
        if (updated) setSelectedLead({ ...updated });
      }
    } else {
      toast.error(data.error || "Erreur");
    }
  }

  async function handleRemoveDistribution(distributionId: string) {
    if (!confirm("Retirer cette distribution ?")) return;
    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_distribution", distributionId }),
    });
    if (res.ok) { toast.success("Distribution retirée"); fetchLeads(); }
    else toast.error("Erreur");
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce lead et toutes ses distributions ?")) return;
    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (res.ok) { toast.success("Lead supprimé"); setSelectedLead(null); fetchLeads(); }
    else toast.error("Erreur");
  }

  async function handleUpdateStatus(id: string, status: string) {
    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", id, status }),
    });
    if (res.ok) { toast.success("Statut mis à jour"); fetchLeads(); }
    else toast.error("Erreur");
  }

  async function handleRetryDistribution(leadId: string) {
    if (!confirm("Relancer la distribution de ce lead aux déménageurs ?")) return;
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_distribution", id: leadId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body?.error || "Erreur lors de la relance");
        return;
      }
      toast.success(
        body.matchedMovers > 0
          ? `Lead distribué à ${body.matchedMovers} déménageur${body.matchedMovers > 1 ? "s" : ""}`
          : "Lead traité mais aucun déménageur correspondant"
      );
      fetchLeads();
    } catch {
      toast.error("Erreur de connexion");
    }
  }

  async function bulkAction(action: "bulk_block" | "bulk_unblock" | "bulk_delete") {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (action === "bulk_delete" && !confirm(`Supprimer ${ids.length} lead(s) ? Action définitive.`)) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      if (res.ok) {
        const d = await res.json();
        toast.success(`${d.count} lead(s) traités`);
        setSelectedIds(new Set());
        fetchLeads();
      } else {
        const d = await res.json();
        toast.error(d.error || "Erreur");
      }
    } finally {
      setBulkBusy(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = leads.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterDefect && l.defect_status !== "suspected") return false;
    if (filterCategory !== "all" && l.category !== filterCategory) return false;
    if (filterVerif !== "all") {
      const emailV = !!l.email_verified;
      const phoneV = !!l.phone_verified;
      if (filterVerif === "both" && !(emailV && phoneV)) return false;
      if (filterVerif === "any" && !(emailV || phoneV)) return false;
      if (filterVerif === "email-only" && !emailV) return false;
      if (filterVerif === "phone-only" && !phoneV) return false;
      if (filterVerif === "none" && (emailV || phoneV)) return false;
    }
    if (filterDistribution === "zero" && l.distributions > 0) return false;
    if (filterDistribution === "with" && l.distributions === 0) return false;
    if (filterDistribution === "unlocked" && l.unlocked === 0) return false;
    if (filterDistribution === "full" && l.distributions < 6) return false;
    if (dateFrom) {
      if (new Date(l.created_at) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (new Date(l.created_at) > end) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return (
        l.prospect_id.toLowerCase().includes(q) ||
        (l.from_city || "").toLowerCase().includes(q) ||
        (l.to_city || "").toLowerCase().includes(q) ||
        (l.from_postal_code || "").toLowerCase().includes(q) ||
        (l.to_postal_code || "").toLowerCase().includes(q) ||
        (l.client_name || "").toLowerCase().includes(q) ||
        (l.client_email || "").toLowerCase().includes(q) ||
        (l.client_phone || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "created_asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "distributions_desc":
        return b.distributions - a.distributions;
      case "unlocked_desc":
        return b.unlocked - a.unlocked;
      case "created_desc":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // Reset pagination + selection when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterCategory, filterVerif, filterDistribution, filterDefect, dateFrom, dateTo, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = sorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const defectTotal = leads.filter((l) => l.defect_status === "suspected").length;
  const allPageSelected = paginated.length > 0 && paginated.every((l) => selectedIds.has(l.id));

  function toggleSelectAllPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginated.forEach((l) => next.delete(l.id));
      } else {
        paginated.forEach((l) => next.add(l.id));
      }
      return next;
    });
  }

  // Refresh selectedLead data when leads change
  useEffect(() => {
    if (selectedLead) {
      const updated = leads.find(l => l.id === selectedLead.id);
      if (updated) setSelectedLead(updated);
    }
    // Only id as dep: passing full selectedLead would re-run every time
    // setSelectedLead replaces the ref with the fresh object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, selectedLead?.id]);

  // ─── DETAIL VIEW ─────────────────────────────────────────
  if (selectedLead) {
    const lead = selectedLead;
    const status = statusMap[lead.status] || statusMap.new;
    const category = categoryMap[lead.category] || categoryMap.national;

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedLead(null)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Retour à la liste
        </button>

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Demande de devis de {lead.client_name || "Client"}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{lead.prospect_id}</span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", category.color)}>{category.label}</span>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", status.color)}>{status.label}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> {lead.distributions} distribué{lead.distributions !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={lead.status} onChange={(e) => handleUpdateStatus(lead.id, e.target.value)} className="rounded-lg border px-3 py-1.5 text-sm">
              <option value="new">Nouveau</option>
              <option value="active">Actif</option>
              <option value="blocked">Bloqué</option>
              <option value="completed">Terminé</option>
              <option value="archived">Archivé</option>
            </select>
            <button onClick={() => handleDelete(lead.id)} className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100">
              <Trash2 className="h-3 w-3" /> Supprimer
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="space-y-4 lg:col-span-2">
            {/* Le déménagement */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <Truck className="h-4 w-4 text-[var(--brand-green)]" />
                <h3 className="text-sm font-semibold">Le déménagement</h3>
              </div>
              <div className="grid gap-3 p-5 text-sm sm:grid-cols-3">
                <div><span className="text-muted-foreground">Catégorie</span><p className="font-medium capitalize">{lead.category}</p></div>
                <div><span className="text-muted-foreground">Date</span><p className="font-medium">{lead.move_date ? formatDateShort(lead.move_date) : "Non précisée"}</p></div>
                <div><span className="text-muted-foreground">Volume</span><p className="font-medium">{lead.volume_m3 ? `${lead.volume_m3} m³` : lead.room_count ? `${lead.room_count} pièces` : "Non précisé"}</p></div>
              </div>
            </div>

            {/* Départ */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <MapPin className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold">Déménagement de</h3>
              </div>
              <div className="grid gap-3 p-5 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2"><span className="text-muted-foreground">Adresse</span><p className="font-medium">{lead.from_address || "—"}</p></div>
                <div><span className="text-muted-foreground">Ville</span><p className="font-medium">{lead.from_city || "—"}</p></div>
                <div><span className="text-muted-foreground">Code postal</span><p className="font-medium">{lead.from_postal_code || "—"}</p></div>
                <div><span className="text-muted-foreground">Type</span><p className="font-medium">{lead.from_housing_type || "—"}</p></div>
                <div><span className="text-muted-foreground">Étage / Ascenseur</span><p className="font-medium">{lead.from_floor != null ? `${lead.from_floor}e` : "—"} / {lead.from_elevator ? "Oui" : "Non"}</p></div>
              </div>
            </div>

            {/* Arrivée */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <MapPin className="h-4 w-4 text-green-500" />
                <h3 className="text-sm font-semibold">Emménagement à</h3>
              </div>
              <div className="grid gap-3 p-5 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2"><span className="text-muted-foreground">Adresse</span><p className="font-medium">{lead.to_address || "—"}</p></div>
                <div><span className="text-muted-foreground">Ville</span><p className="font-medium">{lead.to_city || "—"}</p></div>
                <div><span className="text-muted-foreground">Code postal</span><p className="font-medium">{lead.to_postal_code || "—"}</p></div>
                <div><span className="text-muted-foreground">Type</span><p className="font-medium">{lead.to_housing_type || "—"}</p></div>
                <div><span className="text-muted-foreground">Ascenseur</span><p className="font-medium">{lead.to_elevator ? "Oui" : "Non"}</p></div>
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <User className="h-4 w-4 text-[var(--brand-green)]" />
                <h3 className="text-sm font-semibold">Contact client</h3>
              </div>
              <div className="grid gap-3 p-5 text-sm sm:grid-cols-3">
                <div><span className="text-muted-foreground">Nom</span><p className="font-medium">{lead.client_salutation ? `${lead.client_salutation} ` : ""}{lead.client_first_name || ""} {lead.client_last_name || ""}</p></div>
                <div><span className="text-muted-foreground">Téléphone</span><p className="font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{lead.client_phone || "—"}</p></div>
                <div><span className="text-muted-foreground">Email</span><p className="font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{lead.client_email || "—"}</p></div>
              </div>
            </div>

            {/* Détails */}
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b px-5 py-3">
                <Hash className="h-4 w-4 text-[var(--brand-green)]" />
                <h3 className="text-sm font-semibold">Détails</h3>
              </div>
              <div className="grid gap-3 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><span className="text-muted-foreground">Prospect ID</span><p className="font-mono font-medium">{lead.prospect_id}</p></div>
                <div><span className="text-muted-foreground">Zone</span><p className="font-medium">{lead.geographic_zone || "—"}</p></div>
                <div><span className="text-muted-foreground">Source</span><p className="font-medium">{lead.source || "website"}</p></div>
                <div><span className="text-muted-foreground">Date réception</span><p className="font-medium">{formatDateShort(lead.created_at)}</p></div>
              </div>
            </div>
          </div>

          {/* Sidebar — Distributions */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <h3 className="text-sm font-semibold">Distributions ({lead.distributions_list.length})</h3>
                <button onClick={() => setDistributeLeadId(lead.id)} className="flex items-center gap-1.5 rounded-lg bg-brand-gradient px-3 py-1.5 text-xs font-bold text-white hover:brightness-110">
                  <Send className="h-3 w-3" /> Distribuer
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Distribute form */}
                {distributeLeadId === lead.id && (
                  <div className="space-y-2 rounded-lg border bg-gray-50 p-3">
                    <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm">
                      <option value="">Sélectionner un déménageur...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.city || "France"})</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => handleDistribute(lead.id)} className="flex-1 rounded-lg bg-green-500 py-1.5 text-xs font-bold text-white hover:bg-green-600">Envoyer</button>
                      <button onClick={() => { setDistributeLeadId(null); setSelectedCompany(""); }} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                )}

                {lead.distributions_list.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">Aucune distribution</p>
                ) : (
                  lead.distributions_list.map((dist) => (
                    <div key={dist.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", dist.status === "unlocked" ? "bg-green-50" : "bg-gray-100")}>
                          {dist.status === "unlocked" ? <Unlock className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-gray-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{dist.companies?.name || "Inconnu"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(dist.price_cents)}
                            {dist.is_trial && " · Essai"}
                            {dist.status === "unlocked" && " · Déverrouillé"}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveDistribution(dist.id)} className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" title="Retirer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
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
          <h2 className="font-display text-2xl font-bold">Leads</h2>
          <p className="text-sm text-muted-foreground">{leads.length} demande{leads.length !== 1 ? "s" : ""} de devis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLeads} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button onClick={() => downloadCSV(sorted.map(l => ({ "Prospect ID": l.prospect_id, Client: l.client_name, Email: l.client_email, Téléphone: l.client_phone, "De": `${l.from_address || ""} ${l.from_city || ""}`, "Vers": `${l.to_address || ""} ${l.to_city || ""}`, Catégorie: l.category, Statut: l.status, Distributions: l.distributions, Date: formatDateShort(l.created_at) })), "leads")} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Rechercher par ID, ville, client, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]" />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="all">Toutes catégories</option>
          <option value="national">National</option>
          <option value="entreprise">Entreprise</option>
          <option value="international">International</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="all">Tous statuts</option>
          <option value="new">Nouveau</option>
          <option value="active">Actif</option>
          <option value="blocked">Bloqué</option>
          <option value="completed">Terminé</option>
        </select>
        <select value={filterVerif} onChange={(e) => setFilterVerif(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="all">Vérification : tous</option>
          <option value="both">Email + Tél vérifiés</option>
          <option value="any">Au moins un vérifié</option>
          <option value="email-only">Email vérifié</option>
          <option value="phone-only">Tél vérifié</option>
          <option value="none">Non vérifié</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={filterDistribution} onChange={(e) => setFilterDistribution(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="all">Distrib. : toutes</option>
          <option value="zero">Sans distribution</option>
          <option value="with">Avec distribution</option>
          <option value="unlocked">Au moins 1 débloqué</option>
          <option value="full">Complet (6/6)</option>
        </select>
        <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm">
          <span className="text-muted-foreground">Du</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent outline-none" />
          <span className="text-muted-foreground">au</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent outline-none" />
          {(dateFrom || dateTo) && (
            <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }} className="ml-1 text-xs text-muted-foreground hover:text-foreground">×</button>
          )}
        </div>
        {defectTotal > 0 && (
          <button
            type="button"
            onClick={() => setFilterDefect((v) => !v)}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-semibold",
              filterDefect
                ? "border-red-400 bg-red-50 text-red-700"
                : "border-red-200 bg-white text-red-700 hover:bg-red-50"
            )}
          >
            🚨 Défectueux ({defectTotal})
          </button>
        )}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="ml-auto rounded-lg border bg-white px-3 py-2 text-sm">
          <option value="created_desc">Plus récents d&apos;abord</option>
          <option value="created_asc">Plus anciens d&apos;abord</option>
          <option value="distributions_desc">Plus distribués</option>
          <option value="unlocked_desc">Plus débloqués</option>
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-[var(--brand-green)]/40 bg-green-50/70 p-3 shadow-sm">
          <span className="text-sm font-semibold text-[var(--brand-green-dark)]">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => bulkAction("bulk_block")}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" /> Bloquer
            </button>
            <button
              onClick={() => bulkAction("bulk_unblock")}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
            >
              <Unlock className="h-3.5 w-3.5" /> Débloquer
            </button>
            <button
              onClick={() => bulkAction("bulk_delete")}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
            <button
              onClick={() => {
                const rows = leads
                  .filter((l) => selectedIds.has(l.id))
                  .map((l) => ({
                    "Prospect ID": l.prospect_id,
                    Client: l.client_name,
                    Email: l.client_email,
                    Téléphone: l.client_phone,
                    De: `${l.from_address || ""} ${l.from_city || ""}`,
                    Vers: `${l.to_address || ""} ${l.to_city || ""}`,
                    Catégorie: l.category,
                    Statut: l.status,
                    Distributions: l.distributions,
                    Date: formatDateShort(l.created_at),
                  }));
                downloadCSV(rows, "leads-selection");
              }}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkBusy}
              className="inline-flex items-center rounded-lg border bg-white px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Désélectionner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {sorted.length} lead{sorted.length !== 1 ? "s" : ""} affiché{sorted.length !== 1 ? "s" : ""}
        {sorted.length !== leads.length && ` sur ${leads.length}`}
      </p>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" /></div>
        ) : sorted.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{search ? "Aucun résultat" : "Aucune demande de devis"}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAllPage}
                    className="h-4 w-4 cursor-pointer accent-[var(--brand-green)]"
                  />
                </th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Prospect ID</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Client</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Trajet</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Catégorie</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Vérif.</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-5 py-3 text-center font-medium text-muted-foreground">Distrib.</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((lead) => {
                const status = statusMap[lead.status] || statusMap.new;
                const category = categoryMap[lead.category] || categoryMap.national;
                const checked = selectedIds.has(lead.id);

                return (
                  <tr key={lead.id} className={cn("border-b last:border-0 hover:bg-gray-50/50", checked && "bg-green-50/30")}>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(lead.id)}
                        className="h-4 w-4 cursor-pointer accent-[var(--brand-green)]"
                      />
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {lead.prospect_id}
                      {lead.defect_status === "suspected" && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700" title="Lead signalé collectivement comme défectueux">
                          🚨 Défectueux
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-medium">{lead.client_name || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium">{lead.from_city || "?"}</span>
                      <span className="mx-1.5 text-muted-foreground">→</span>
                      <span className="font-medium">{lead.to_city || "?"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", category.color)}>{category.label}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {lead.email_verified && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700" title="Email vérifié">
                            <ShieldCheck className="h-3 w-3" /> Email
                          </span>
                        )}
                        {lead.phone_verified && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700" title="Téléphone vérifié">
                            <ShieldCheck className="h-3 w-3" /> Tél
                          </span>
                        )}
                        {!lead.email_verified && !lead.phone_verified && (
                          <span className="text-[11px] text-muted-foreground/60">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDateShort(lead.created_at)}</td>
                    <td className="px-5 py-3 text-center">{lead.distributions}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", status.color)}>{status.label}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {lead.distributions === 0 && (
                          <button
                            type="button"
                            onClick={() => handleRetryDistribution(lead.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                            title="Lead sans distribution — relancer le matching"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Relancer distribution
                          </button>
                        )}
                        <button onClick={() => setSelectedLead(lead)} className="rounded-md p-1.5 text-muted-foreground hover:bg-green-50 hover:text-green-600" title="Voir le détail">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(lead.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" title="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {sorted.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)} de {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </button>
            <span className="px-2 text-sm font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
