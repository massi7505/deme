import type { Metadata } from "next";
import Link from "next/link";
import { Clock, User, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — Conseils, guides et actualités sur le déménagement",
  description:
    "Guides pratiques, astuces et actualités pour réussir votre déménagement : préparation, prix, aides financières, démarches administratives.",
  alternates: { canonical: "/blog" },
};

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  cover_image?: string | null;
  read_time: string;
  published_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Conseils: "bg-blue-50 text-blue-700 border-blue-200",
  Guides: "bg-purple-50 text-purple-700 border-purple-200",
  Actualites: "bg-amber-50 text-amber-700 border-amber-200",
  Actualités: "bg-amber-50 text-amber-700 border-amber-200",
};

const PAGE_SIZE = 9;

async function loadArticles(): Promise<Article[]> {
  const supabase = createUntypedAdminClient();
  const { data } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, category, author, cover_image, read_time, published_at"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data || []) as Article[];
}

// Server Component: search params bind the category filter + current page to
// the URL so every state is shareable and indexable by Google.
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const params = await searchParams;
  const articles = await loadArticles();

  const categories = [
    "Tous",
    ...Array.from(new Set(articles.map((a) => a.category).filter(Boolean))),
  ];

  const activeCategory = params.category || "Tous";
  const filteredArticles =
    activeCategory === "Tous"
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const rawPage = parseInt(params.page || "1", 10);
  const currentPage = Math.min(
    Math.max(Number.isFinite(rawPage) ? rawPage : 1, 1),
    totalPages
  );
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageArticles = filteredArticles.slice(start, start + PAGE_SIZE);

  function buildPageHref(page: number): string {
    const qs = new URLSearchParams();
    if (activeCategory !== "Tous") qs.set("category", activeCategory);
    if (page > 1) qs.set("page", String(page));
    const query = qs.toString();
    return query ? `/blog?${query}` : "/blog";
  }

  function buildCategoryHref(cat: string): string {
    if (cat === "Tous") return "/blog";
    return `/blog?category=${encodeURIComponent(cat)}`;
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl">
              Blog — Conseils déménagement
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Guides pratiques, astuces et actualités pour réussir votre
              déménagement.
            </p>
          </div>
        </div>
      </section>

      {/* Category filter */}
      <section className="border-b">
        <div className="container flex flex-wrap gap-2 py-4">
          {categories.map((cat) => (
            <Link
              key={cat}
              href={buildCategoryHref(cat)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                activeCategory === cat
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-green-200 hover:bg-green-50"
              )}
            >
              {cat}
            </Link>
          ))}
        </div>
      </section>

      {/* Article grid */}
      <section className="container py-10">
        {pageArticles.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              Aucun article pour le moment.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pageArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/blog/${article.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  <div className="flex aspect-[16/9] items-center justify-center bg-gray-100 text-gray-300">
                    {article.cover_image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={article.cover_image}
                        alt={article.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="h-10 w-10" />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    {article.category && (
                      <span
                        className={cn(
                          "inline-flex w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          CATEGORY_COLORS[article.category] ||
                            "bg-gray-50 text-gray-700 border-gray-200"
                        )}
                      >
                        {article.category}
                      </span>
                    )}

                    <h2 className="mt-3 font-display text-lg font-bold leading-tight text-gray-950 group-hover:text-green-700 transition-colors">
                      {article.title}
                    </h2>

                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                      {article.excerpt}
                    </p>

                    <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                      {article.author && (
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {article.author}
                        </span>
                      )}
                      <span>
                        {new Date(article.published_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </span>
                      {article.read_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {article.read_time}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                className="mt-10 flex items-center justify-between"
                aria-label="Pagination blog"
              >
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} sur {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={buildPageHref(currentPage - 1)}
                      rel="prev"
                      className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium opacity-40">
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </span>
                  )}
                  {currentPage < totalPages ? (
                    <Link
                      href={buildPageHref(currentPage + 1)}
                      rel="next"
                      className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium opacity-40">
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );
}
