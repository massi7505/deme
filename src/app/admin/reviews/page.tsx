"use client";

import { useState, useEffect } from "react";
import { Star, RefreshCw, Trash2, Search, ShieldCheck, EyeOff, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { cn, formatDateShort } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  is_verified: boolean;
  is_anonymous: boolean;
  created_at: string;
  company_id: string;
  company_name: string;
  mover_reply: string | null;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRating, setFilterRating] = useState<"all" | "low" | "high">("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchReviews() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reviews");
      if (res.ok) setReviews(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchReviews(); }, []);

  async function handleDelete(review: Review) {
    const label = review.reviewer_name || "anonyme";
    if (!confirm(`Supprimer l'avis de ${label} (${review.rating}/10) sur ${review.company_name} ? Cette action est définitive.`)) return;
    setDeleting(review.id);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: review.id }),
      });
      if (res.ok) {
        toast.success("Avis supprimé");
        fetchReviews();
      } else {
        const d = await res.json();
        toast.error(d.error || "Erreur");
      }
    } finally {
      setDeleting(null);
    }
  }

  const filtered = reviews.filter((r) => {
    if (filterRating === "low" && r.rating > 4) return false;
    if (filterRating === "high" && r.rating < 7) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (r.reviewer_name || "").toLowerCase().includes(q) ||
        (r.comment || "").toLowerCase().includes(q) ||
        r.company_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const lowCount = reviews.filter((r) => r.rating <= 4).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Avis</h2>
          <p className="text-sm text-muted-foreground">
            {reviews.length} avis
            {lowCount > 0 && (
              <span className="ml-2 text-red-600">
                · {lowCount} note{lowCount > 1 ? "s" : ""} faible{lowCount > 1 ? "s" : ""} (≤ 4)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchReviews}
          className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par auteur, déménageur ou commentaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]"
          />
        </div>
        <select
          value={filterRating}
          onChange={(e) => setFilterRating(e.target.value as typeof filterRating)}
          className="rounded-lg border bg-white px-3 py-2 text-sm"
        >
          <option value="all">Toutes les notes</option>
          <option value="low">Faibles (≤ 4)</option>
          <option value="high">Élevées (≥ 7)</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-white py-12 text-center text-sm text-muted-foreground shadow-sm">
          {search || filterRating !== "all" ? "Aucun résultat" : "Aucun avis pour le moment"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isLow = r.rating <= 4;
            const displayName = r.is_anonymous ? "Client anonyme" : (r.reviewer_name || "Client");
            return (
              <div
                key={r.id}
                className={cn(
                  "rounded-xl border bg-white p-4 shadow-sm",
                  isLow && "border-red-200 bg-red-50/30"
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                          isLow
                            ? "bg-red-100 text-red-700"
                            : r.rating >= 7
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                        )}
                      >
                        <Star className={cn("h-3 w-3", r.rating >= 7 ? "fill-green-600" : isLow ? "fill-red-600" : "fill-yellow-600")} />
                        {r.rating}/10
                      </span>
                      <span className="text-sm font-semibold">{displayName}</span>
                      {r.is_verified && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                          <ShieldCheck className="h-3 w-3" /> Vérifié
                        </span>
                      )}
                      {r.is_anonymous && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                          <EyeOff className="h-3 w-3" /> Anonyme
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        sur <strong>{r.company_name}</strong>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {formatDateShort(r.created_at)}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>
                    )}
                    {r.mover_reply && (
                      <div className="mt-2 rounded border-l-2 border-[var(--brand-green)] bg-green-50/50 px-3 py-2">
                        <p className="flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-green-dark)]">
                          <MessageSquare className="h-3 w-3" /> Réponse du déménageur
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{r.mover_reply}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(r)}
                    disabled={deleting === r.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleting === r.id ? "Suppression..." : "Supprimer"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
