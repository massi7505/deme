"use client";

import { useState, useEffect } from "react";
import { cn, formatDateShort, formatPrice } from "@/lib/utils";
import { downloadCSV } from "@/lib/csv-export";
import {
  Search, CheckCircle2, Clock, XCircle, Shield, Ban,
  Eye, RefreshCw, Download, Trash2, ChevronLeft, MapPin,
  Mail, Phone, Globe, Building2, Star, Play,
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

  async function fetchCompanies() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/companies");
      if (res.ok) setCompanies(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchCompanies(); }, []);

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

  // ─── DETAIL VIEW ─────────────────────────────────────────
  if (selectedCompany) {
    const c = selectedCompany;
    const status = statusConfig[c.account_status] || statusConfig.pending;
    const kyc = kycConfig[c.kyc_status] || kycConfig.pending;
    const KycIcon = kyc.icon;

    return (
      <div className="space-y-6">
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
            {/* Activer essai */}
            {c.account_status === "pending" && (
              <button onClick={() => handleAction(c.id, "update_status", { status: "trial" })} className="flex items-center gap-1.5 rounded-lg border bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"><Play className="h-3 w-3" /> Activer essai 3j</button>
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
            {/* Suspendre / Réactiver */}
            {c.account_status !== "suspended" ? (
              <button onClick={() => { if (confirm("Suspendre ce compte ?")) handleAction(c.id, "suspend"); }} className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"><Ban className="h-3 w-3" /> Suspendre</button>
            ) : (
              <button onClick={() => handleAction(c.id, "reactivate")} className="flex items-center gap-1.5 rounded-lg border bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"><Play className="h-3 w-3" /> Réactiver</button>
            )}
            <button onClick={() => { if (confirm("Supprimer définitivement cette entreprise ?")) handleAction(c.id, "delete"); }} className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3" /> Supprimer</button>
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
          <option value="trial">Essai</option>
          <option value="pending">En attente</option>
          <option value="suspended">Suspendu</option>
        </select>
      </div>

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

                return (
                  <tr key={company.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <span className="font-medium">{company.name}</span>
                      {company.city && <span className="ml-2 text-xs text-muted-foreground">{company.city}</span>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{company.siret}</td>
                    <td className="px-5 py-3"><span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", status.color)}>{status.label}</span></td>
                    <td className="px-5 py-3"><span className={cn("flex items-center gap-1 text-xs font-semibold", kyc.color)}><KycIcon className="h-3.5 w-3.5" />{kyc.label}</span></td>
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
                        <button onClick={() => { if (confirm("Supprimer ?")) handleAction(company.id, "delete"); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
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
