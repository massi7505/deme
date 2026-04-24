import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Clock,
  User,
  Calendar,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { BRAND } from "@/lib/brand";

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
  seo_title?: string | null;
  seo_description?: string | null;
  status?: string;
}

interface RelatedArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  cover_image?: string;
  read_time?: string;
  excerpt?: string;
}

async function loadArticle(slug: string): Promise<{
  article: Article;
  related: RelatedArticle[];
} | null> {
  const supabase = createUntypedAdminClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  const article = data as Article;

  const { data: relatedData } = await supabase
    .from("blog_posts")
    .select("id, slug, title, category, cover_image, excerpt")
    .eq("status", "published")
    .eq("category", article.category)
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(3);

  return { article, related: (relatedData || []) as RelatedArticle[] };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadArticle(slug);
  if (!result) {
    return {
      title: "Article introuvable",
      robots: { index: false },
    };
  }
  const a = result.article;
  const title = a.seo_title || a.title;
  const description = a.seo_description || a.excerpt;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: a.published_at,
      authors: a.author ? [a.author] : undefined,
      images: a.cover_image ? [{ url: a.cover_image }] : undefined,
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await loadArticle(slug);
  if (!result) notFound();

  const { article, related } = result;
  // blog_posts.content is written by authenticated admins through the admin
  // rich-text editor — no anonymous HTML input. Skip the DOMPurify pass that
  // would pull JSDOM into a Server Component bundle.
  const articleHtml = article.content || "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    author: article.author
      ? { "@type": "Person", name: article.author }
      : undefined,
    datePublished: article.published_at,
    dateModified: article.published_at,
    publisher: {
      "@type": "Organization",
      name: BRAND.siteName,
      url: BRAND.siteUrl,
    },
    description: article.excerpt,
    image: article.cover_image,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BRAND.siteUrl}/blog/${article.slug}`,
    },
  };

  return (
    <>
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
          <article className="min-w-0">
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

            <div className="mt-8 flex aspect-[2/1] items-center justify-center rounded-2xl bg-gray-100 text-gray-300 overflow-hidden">
              {article.cover_image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="h-full w-full object-cover"
                  decoding="async"
                />
              ) : (
                <ImageIcon className="h-16 w-16" />
              )}
            </div>

            {articleHtml ? (
              <div
                className="prose prose-lg max-w-none mt-10 text-gray-800"
                dangerouslySetInnerHTML={{ __html: articleHtml }}
              />
            ) : article.excerpt ? (
              <p className="mt-10 leading-relaxed text-muted-foreground">
                {article.excerpt}
              </p>
            ) : null}
          </article>
        </div>
      </div>

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
                        loading="lazy"
                        decoding="async"
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
