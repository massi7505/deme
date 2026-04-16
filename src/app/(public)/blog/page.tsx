"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, User, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Category = "Tous" | string;

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  cover_image_url?: string;
  read_time: string;
  published_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Conseils: "bg-blue-50 text-blue-700 border-blue-200",
  Guides: "bg-purple-50 text-purple-700 border-purple-200",
  Actualites: "bg-amber-50 text-amber-700 border-amber-200",
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

export default function BlogPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>("Tous");

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch("/api/public/blog");
      if (!res.ok) {
        throw new Error("Erreur lors du chargement");
      }
      const data = await res.json();
      setArticles(data || []);
    } catch {
      toast.error("Impossible de charger les articles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Build categories from real data
  const categories: Category[] = [
    "Tous",
    ...Array.from(new Set(articles.map((a) => a.category).filter(Boolean))),
  ];

  const filteredArticles =
    activeCategory === "Tous"
      ? articles
      : articles.filter((a) => a.category === activeCategory);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white">
        <div className="container py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto max-w-2xl text-center"
          >
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl"
            >
              Blog &mdash; Conseils déménagement
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="mt-4 text-lg text-muted-foreground"
            >
              Guides pratiques, astuces et actualités pour réussir votre
              déménagement.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Category filter */}
      <section className="border-b">
        <div className="container flex flex-wrap gap-2 py-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                activeCategory === cat
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-green-200 hover:bg-green-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Article grid */}
      <section className="container py-10">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              Aucun article pour le moment.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.map((article, i) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.08,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1] as [
                    number,
                    number,
                    number,
                    number,
                  ],
                }}
              >
                <Link
                  href={`/blog/${article.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                >
                  {/* Cover image */}
                  <div className="flex aspect-[16/9] items-center justify-center bg-gray-100 text-gray-300">
                    {article.cover_image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={article.cover_image_url}
                        alt={article.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-10 w-10" />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    {/* Category badge */}
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

                    {/* Meta */}
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
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
