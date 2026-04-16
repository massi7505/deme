"use client";

import { useState, useEffect } from "react";
import { cn, formatDateShort, formatPrice } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv-export";
import {
  Search, Download, RefreshCw, Eye, Trash2, Send, X,
  Users, Lock, Unlock, ChevronLeft,
  MapPin, User, Phone, Mail, Hash, Truck,
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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [distributeLeadId, setDistributeLeadId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState("");

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

  const filtered = leads.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterCategory !== "all" && l.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.prospect_id.toLowerCase().includes(q) ||
        (l.from_city || "").toLowerCase().includes(q) ||
        (l.to_city || "").toLowerCase().includes(q) ||
        (l.client_name || "").toLowerCase().includes(q) ||
        (l.client_email || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Refresh selectedLead data when leads change
  useEffect(() => {
    if (selectedLead) {
      const updated = leads.find(l => l.id === selectedLead.id);
      if (updated) setSelectedLead(updated);
    }
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
          <button onClick={() => downloadCSV(filtered.map(l => ({ "Prospect ID": l.prospect_id, Client: l.client_name, Email: l.client_email, Téléphone: l.client_phone, "De": `${l.from_address || ""} ${l.from_city || ""}`, "Vers": `${l.to_address || ""} ${l.to_city || ""}`, Catégorie: l.category, Statut: l.status, Distributions: l.distributions, Date: formatDateShort(l.created_at) })), "leads")} className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50">
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
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{search ? "Aucun résultat" : "Aucune demande de devis"}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Prospect ID</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Client</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Trajet</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Catégorie</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-5 py-3 text-center font-medium text-muted-foreground">Distrib.</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const status = statusMap[lead.status] || statusMap.new;
                const category = categoryMap[lead.category] || categoryMap.national;

                return (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-mono text-xs">{lead.prospect_id}</td>
                    <td className="px-5 py-3 font-medium">{lead.client_name || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium">{lead.from_city || "?"}</span>
                      <span className="mx-1.5 text-muted-foreground">→</span>
                      <span className="font-medium">{lead.to_city || "?"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", category.color)}>{category.label}</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDateShort(lead.created_at)}</td>
                    <td className="px-5 py-3 text-center">{lead.distributions}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", status.color)}>{status.label}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
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
    </div>
  );
}
