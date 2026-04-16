"use client";

import { useState, useEffect } from "react";
import { Star, RefreshCw } from "lucide-react";
import { cn, formatDateShort } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  is_verified: boolean;
  created_at: string;
  company_id: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchReviews() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reviews");
      if (res.ok) setReviews(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchReviews(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Avis</h2>
          <p className="text-sm text-muted-foreground">{reviews.length} avis</p>
        </div>
        <button onClick={fetchReviews} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Actualiser
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Aucun avis pour le moment</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Auteur</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Note</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Commentaire</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-5 py-3 font-medium">{r.reviewer_name || "Anonyme"}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      {r.rating}/10
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-5 py-3 text-muted-foreground">{r.comment || "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDateShort(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
