"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Star, Loader2, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

interface TokenInfo {
  company: { name: string; slug: string; logo_url: string | null } | null;
  lead: {
    from_city: string | null;
    to_city: string | null;
    move_date: string | null;
    client_first_name: string | null;
  } | null;
  expiresAt: string;
}

export default function LeaveReviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"form" | "used" | "expired" | "invalid" | "success">("form");

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadToken = useCallback(async () => {
    const res = await fetch(`/api/public/reviews?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (res.ok) {
      setInfo(data);
      if (data.lead?.client_first_name) setReviewerName(data.lead.client_first_name);
    } else if (data.state === "used") {
      setState("used");
    } else if (data.state === "expired") {
      setState("expired");
    } else {
      setState("invalid");
      setError(data.error || "Lien invalide");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  async function submit() {
    if (rating < 1) {
      setError("Choisissez une note");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          rating,
          comment: comment.trim() || null,
          isAnonymous,
          reviewerName: reviewerName.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setState("success");
      } else {
        setError(data.error || "Erreur");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-green)]" />
      </div>
    );
  }

  if (state === "used" || state === "expired" || state === "invalid") {
    return (
      <div className="container py-16">
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <AlertCircle className="h-7 w-7 text-amber-600" />
            </div>
            <h1 className="font-display text-xl font-bold">
              {state === "used"
                ? "Avis déjà déposé"
                : state === "expired"
                  ? "Lien expiré"
                  : "Lien invalide"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {state === "used"
                ? "Vous avez déjà laissé votre avis. Merci !"
                : state === "expired"
                  ? "Ce lien a expiré (30 jours après l'envoi)."
                  : "Ce lien n'existe pas ou a été désactivé."}
            </p>
            <Link href="/" className="text-sm font-medium text-[var(--brand-green)] hover:underline">
              Retour à l&apos;accueil
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="container py-16">
        <Card className="mx-auto max-w-md border-green-200 bg-green-50/40">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h1 className="font-display text-xl font-bold">Merci pour votre avis !</h1>
            <p className="text-sm text-muted-foreground">
              Votre retour aide d&apos;autres clients à bien choisir leur déménageur.
            </p>
            {info?.company?.slug && (
              <Link
                href={`/entreprises-demenagement/${info.company.slug}`}
                className="text-sm font-medium text-[var(--brand-green)] hover:underline"
              >
                Voir la fiche de {info.company.name}
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const companyName = info?.company?.name || "votre déménageur";
  const firstName = info?.lead?.client_first_name || "";

  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            {info?.company?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={info.company.logo_url}
                alt={companyName}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <Building2 className="h-6 w-6" />
              </div>
            )}
            <div>
              <h1 className="font-display text-xl font-bold sm:text-2xl">
                {firstName ? `Bonjour ${firstName}, ` : ""}votre avis sur{" "}
                <span className="text-[var(--brand-green)]">{companyName}</span>
              </h1>
              {info?.lead?.from_city && info?.lead?.to_city && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Déménagement {info.lead.from_city} → {info.lead.to_city}
                  {info.lead.move_date && ` · ${formatDate(info.lead.move_date)}`}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold">
                Votre note <span className="text-red-500">*</span>
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Cliquez sur une étoile (1 = très mauvais, 10 = excellent)
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {Array.from({ length: 10 }).map((_, i) => {
                  const v = i + 1;
                  const active = (hoverRating || rating) >= v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRating(v)}
                      onMouseEnter={() => setHoverRating(v)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="rounded p-1 transition-transform hover:scale-110"
                      aria-label={`${v} sur 10`}
                    >
                      <Star
                        className={cn(
                          "h-7 w-7 sm:h-8 sm:w-8",
                          active ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
              {rating > 0 && (
                <p className="mt-2 text-sm font-semibold text-[var(--brand-green-dark)]">
                  {rating}/10
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold">
                Votre commentaire <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Qu'est-ce qui s'est bien passé ? Ce qui pourrait être amélioré ?"
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
              />
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                {comment.length}/2000
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold">Votre prénom (affiché publiquement)</label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                disabled={isAnonymous}
                maxLength={100}
                placeholder="Marie"
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)] disabled:bg-gray-100 disabled:text-muted-foreground"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-gray-50/50 p-3">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--brand-green)]"
              />
              <span className="flex-1 text-sm">
                <span className="font-medium">Publier anonymement</span>
                <span className="block text-xs text-muted-foreground">
                  Votre prénom ne sera pas affiché sur la fiche publique.
                </span>
              </span>
            </label>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button
              onClick={submit}
              disabled={submitting || rating < 1}
              className="w-full bg-brand-gradient text-white shadow-md hover:brightness-110"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                "Publier mon avis"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
