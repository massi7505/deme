"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  User,
  Calendar,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import DOMPurify from "isomorphic-dompurify";
import { useSiteSettings } from "@/hooks/use-site-settings";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  cover_image?: string;
  read_time: string;
  published_at: string;
  content: string;
}

interface RelatedArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  cover_image?: string;
  read_time: string;
}

export default function BlogArticlePage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { siteName, siteUrl } = useSiteSettings();

  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchArticle = useCallback(async () => {
    if (!slug) return;
    try {
      const previewQs = typeof window !== "undefined"
        && new URL(window.location.href).searchParams.get("preview") === "1"
        ? "?preview=1"
        : "";
      const res = await fetch(`/api/public/blog/${slug}${previewQs}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        throw new Error("Erreur lors du chargement");
      }
      const data = await res.json();
      setArticle(data.article);
      setRelated(data.related || []);
    } catch {
      toast.error("Impossible de charger l\u2019article");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Article introuvable</h1>
        <p className="text-muted-foreground">
          Cet article n&apos;existe pas ou a été supprimé.
        </p>
        <Link
          href="/blog"
          className="rounded-lg bg-[var(--brand-green)] px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Retour au blog
        </Link>
      </div>
    );
  }

  // Content stored as HTML string by the admin editor. Sanitize before
  // render so a future editorial delegation can't inject <script> / onclick.
  const sanitizedHtml = DOMPurify.sanitize(article.content || "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    author: {
      "@type": "Person",
      name: article.author,
    },
    datePublished: article.published_at,
    dateModified: article.published_at,
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
    description: article.excerpt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/blog/${article.slug}`,
    },
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <div className="border-b bg-gray-50/50">
        <div className="container flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Accueil
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="line-clamp-1 font-medium text-foreground">
            {article.title}
          </span>
        </div>
      </div>

      <div className="container py-10">
        <div className="mx-auto max-w-3xl">
          {/* Article content */}
          <article className="min-w-0">
            {/* Header */}
            <header>
              {article.category && (
                <Badge variant="secondary" className="mb-4">
                  {article.category}
                </Badge>
              )}
              <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-gray-950 sm:text-4xl">
                {article.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {article.author && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    {article.author}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(article.published_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                {article.read_time && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {article.read_time} de lecture
                  </span>
                )}
              </div>
            </header>

            {/* Cover image */}
            <div className="mt-8 flex aspect-[2/1] items-center justify-center rounded-2xl bg-gray-100 text-gray-300 overflow-hidden">
              {article.cover_image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="h-16 w-16" />
              )}
            </div>

            {/* Body */}
            {sanitizedHtml ? (
              <div
                className="prose prose-lg max-w-none mt-10 text-gray-800"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            ) : article.excerpt ? (
              <p className="mt-10 leading-relaxed text-muted-foreground">
                {article.excerpt}
              </p>
            ) : null}
          </article>

        </div>
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="border-t bg-gray-50/50">
          <div className="container py-14">
            <h2 className="font-display text-2xl font-bold text-gray-950">
              Articles liés
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((relArticle) => (
                <Link
                  key={relArticle.id}
                  href={`/blog/${relArticle.slug}`}
                  className="group rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex aspect-[16/9] items-center justify-center rounded-xl bg-gray-100 text-gray-300 overflow-hidden">
                    {relArticle.cover_image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={relArticle.cover_image}
                        alt={relArticle.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8" />
                    )}
                  </div>
                  {relArticle.category && (
                    <Badge variant="secondary" className="mt-3">
                      {relArticle.category}
                    </Badge>
                  )}
                  <h3 className="mt-2 font-display text-base font-bold leading-tight text-gray-950 group-hover:text-green-700 transition-colors">
                    {relArticle.title}
                  </h3>
                  {relArticle.read_time && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {relArticle.read_time} de lecture
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
