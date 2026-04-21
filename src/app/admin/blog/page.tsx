"use client";

import { useState, useEffect } from "react";
import { cn, formatDateShort } from "@/lib/utils";
import { Plus, Edit, Trash2, Eye, Search, RefreshCw, Loader2, Save, ArrowLeft, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { BlogImageUpload } from "@/components/blog/BlogImageUpload";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  category: string | null;
  cover_image: string | null;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
}

const EMPTY_FORM = { title: "", slug: "", category: "", content: "", excerpt: "", status: "draft", seo_title: "", seo_description: "", cover_image: "" };

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog");
      if (res.ok) setPosts(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchPosts(); }, []);

  function openCreate() {
    setEditingPost(null);
    setIsCreating(true);
    setFormData(EMPTY_FORM);
  }

  function openEdit(post: BlogPost) {
    setEditingPost(post);
    setIsCreating(true);
    setFormData({
      title: post.title,
      slug: post.slug,
      category: post.category || "",
      content: post.content || "",
      excerpt: post.excerpt || "",
      status: post.status,
      seo_title: post.seo_title || "",
      seo_description: post.seo_description || "",
      cover_image: post.cover_image || "",
    });
  }

  function closeForm() {
    setIsCreating(false);
    setEditingPost(null);
    setFormData(EMPTY_FORM);
  }

  async function handleSave() {
    if (!formData.title || !formData.slug) { toast.error("Titre et slug requis"); return; }
    setSaving(true);
    try {
      const action = editingPost ? "update" : "create";
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: editingPost?.id, ...formData }),
      });
      if (res.ok) {
        toast.success(editingPost ? "Article mis à jour !" : "Article créé !");
        closeForm();
        fetchPosts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch { toast.error("Erreur réseau"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet article ?")) return;
    const res = await fetch("/api/admin/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (res.ok) { toast.success("Article supprimé"); fetchPosts(); }
    else toast.error("Erreur");
  }

  async function togglePublish(post: BlogPost) {
    const newStatus = post.status === "published" ? "draft" : "published";
    const res = await fetch("/api/admin/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: post.id, status: newStatus }),
    });
    if (res.ok) { toast.success(newStatus === "published" ? "Article publié !" : "Article dépublié"); fetchPosts(); }
  }

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  // ─── EDITOR VIEW ─────────────────────────────────────────
  if (isCreating) {
    return (
      <div className="space-y-6">
        <button onClick={closeForm} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </button>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">
            {editingPost ? "Modifier l'article" : "Nouvel article"}
          </h2>
          <div className="flex gap-2">
            <button onClick={closeForm} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Annuler</button>
            <button
              onClick={async () => {
                await handleSave();
                if (formData.slug) window.open(`/blog/${formData.slug}?preview=1`, "_blank");
              }}
              disabled={saving || !formData.slug}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              title="Enregistre et ouvre l'aperçu dans un nouvel onglet"
            >
              <ExternalLink className="h-4 w-4" />
              Prévisualiser
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand-gradient px-5 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main editor */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Titre</label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: editingPost ? formData.slug : e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-green)]"
                  placeholder="Titre de l'article"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Slug</label>
                <input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--brand-green)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Extrait</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-green)] resize-none"
                  placeholder="Résumé court de l'article..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Contenu</label>
                <BlogEditor
                  value={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold">Publication</h3>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Statut</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="archived">Archivé</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Catégorie</label>
                <input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]" placeholder="Conseils, Guides..." />
              </div>
              <BlogImageUpload
                value={formData.cover_image}
                onChange={(url) => setFormData({ ...formData, cover_image: url })}
              />
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold">SEO</h3>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Titre SEO</label>
                <input value={formData.seo_title} onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]" placeholder="Titre pour Google" />
                <p className="mt-1 text-xs text-muted-foreground">{(formData.seo_title || formData.title).length}/60 caractères</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Description SEO</label>
                <textarea value={formData.seo_description} onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] resize-none" placeholder="Description pour Google" />
                <p className="mt-1 text-xs text-muted-foreground">{(formData.seo_description || formData.excerpt || "").length}/160 caractères</p>
              </div>
            </div>

            {/* Preview link */}
            {editingPost && editingPost.status === "published" && (
              <a href={`/blog/${editingPost.slug}`} target="_blank" className="flex items-center justify-center gap-2 rounded-xl border bg-white p-3 text-sm font-medium text-[var(--brand-green)] hover:bg-green-50">
                <Eye className="h-4 w-4" /> Voir l&apos;article publié
              </a>
            )}
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
          <h2 className="font-display text-2xl font-bold">Blog</h2>
          <p className="text-sm text-muted-foreground">{posts.length} article{posts.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPosts} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-bold text-white shadow-md shadow-green-500/20 hover:brightness-110">
            <Plus className="h-4 w-4" /> Nouvel article
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Rechercher un article..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{search ? "Aucun résultat" : "Aucun article — créez le premier !"}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Titre</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Catégorie</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Statut</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((post) => (
                <tr key={post.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <span className="font-medium">{post.title}</span>
                    <p className="font-mono text-xs text-muted-foreground">/{post.slug}</p>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{post.category || "—"}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => togglePublish(post)} className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer", post.status === "published" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700")}>
                      {post.status === "published" ? "Publié" : "Brouillon"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDateShort(post.created_at)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {post.status === "published" && (
                        <a href={`/blog/${post.slug}`} target="_blank" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" title="Voir"><Eye className="h-4 w-4" /></a>
                      )}
                      <button onClick={() => openEdit(post)} className="rounded-md p-1.5 text-muted-foreground hover:bg-blue-50 hover:text-blue-600" title="Modifier"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(post.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
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
