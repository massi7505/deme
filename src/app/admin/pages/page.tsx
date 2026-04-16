"use client";

import { useState, useEffect } from "react";
import { cn, formatDateShort } from "@/lib/utils";
import { Plus, Edit, Trash2, Eye, RefreshCw, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

interface CmsPage {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string;
}

export default function AdminPages() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [formData, setFormData] = useState({ title: "", slug: "", content: "", meta_title: "", meta_description: "" });
  const [saving, setSaving] = useState(false);

  async function fetchPages() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pages");
      if (res.ok) setPages(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchPages(); }, []);

  function openEdit(page: CmsPage) {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content || "",
      meta_title: page.meta_title || "",
      meta_description: page.meta_description || "",
    });
    setShowForm(true);
  }

  function openCreate() {
    setEditingPage(null);
    setFormData({ title: "", slug: "", content: "", meta_title: "", meta_description: "" });
    setShowForm(true);
  }

  async function handleSave() {
    if (!formData.title || !formData.slug) { toast.error("Titre et slug requis"); return; }
    setSaving(true);
    try {
      const action = editingPage ? "update" : "create";
      const res = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: editingPage?.id, ...formData }),
      });
      if (res.ok) {
        toast.success(editingPage ? "Page mise à jour !" : "Page créée !");
        setShowForm(false);
        setEditingPage(null);
        fetchPages();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch { toast.error("Erreur réseau"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette page ?")) return;
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (res.ok) { toast.success("Page supprimée"); fetchPages(); }
    else toast.error("Erreur lors de la suppression");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Pages CMS</h2>
          <p className="text-sm text-muted-foreground">{pages.length} page{pages.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPages} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-bold text-white shadow-md shadow-green-500/20 hover:brightness-110">
            <Plus className="h-4 w-4" /> Nouvelle page
          </button>
        </div>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">{editingPage ? "Modifier la page" : "Nouvelle page"}</h3>
            <button onClick={() => { setShowForm(false); setEditingPage(null); }}><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Titre</label>
              <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: editingPage ? formData.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Slug</label>
              <input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:border-[var(--brand-green)]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Meta titre (SEO)</label>
              <input value={formData.meta_title} onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Meta description (SEO)</label>
              <input value={formData.meta_description} onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Contenu</label>
            <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={10} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]" placeholder="Contenu HTML de la page..." />
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand-gradient px-5 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Enregistrement..." : editingPage ? "Mettre à jour" : "Créer la page"}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" /></div>
        ) : pages.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Aucune page — créez la première !</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Titre</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Slug</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Mise à jour</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium">{page.title}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">/{page.slug}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDateShort(page.updated_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/${page.slug}`} target="_blank" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" title="Voir"><Eye className="h-4 w-4" /></a>
                      <button onClick={() => openEdit(page)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" title="Éditer"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(page.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
