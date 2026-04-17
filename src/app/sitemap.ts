import type { MetadataRoute } from "next";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

async function getSiteUrl(): Promise<string> {
  try {
    const supabase = createUntypedAdminClient();
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).single();
    const url = (data?.data as Record<string, string>)?.siteUrl;
    if (url) return url.replace(/\/$/, "");
  } catch {
    // fall through
  }
  if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://deme-iota.vercel.app";
}

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/devis", changeFrequency: "monthly", priority: 0.95 },
  { path: "/entreprises-demenagement", changeFrequency: "weekly", priority: 0.85 },
  { path: "/demenagement-international", changeFrequency: "monthly", priority: 0.8 },
  { path: "/prix-demenagement", changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog", changeFrequency: "daily", priority: 0.75 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
  { path: "/reclamation", changeFrequency: "yearly", priority: 0.3 },
  { path: "/mentions-legales", changeFrequency: "yearly", priority: 0.2 },
  { path: "/politique-confidentialite", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cgu", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cgv", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${siteUrl}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  try {
    const supabase = createUntypedAdminClient();

    // Blog posts
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(500);

    if (posts) {
      for (const p of posts as Array<{ slug: string; updated_at: string | null; published_at: string | null }>) {
        entries.push({
          url: `${siteUrl}/blog/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : p.published_at ? new Date(p.published_at) : now,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }

    // Company profiles (active only)
    const { data: companies } = await supabase
      .from("companies")
      .select("slug, updated_at")
      .eq("account_status", "active")
      .not("slug", "is", null)
      .limit(1000);

    if (companies) {
      for (const c of companies as Array<{ slug: string | null; updated_at: string | null }>) {
        if (!c.slug) continue;
        entries.push({
          url: `${siteUrl}/entreprises-demenagement/${c.slug}`,
          lastModified: c.updated_at ? new Date(c.updated_at) : now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }

    // CMS pages (not already in STATIC_ROUTES to avoid dupes)
    const staticSlugs = new Set(STATIC_ROUTES.map((r) => r.path.slice(1)));
    const { data: cmsPages } = await supabase
      .from("pages")
      .select("slug, updated_at")
      .limit(500);

    if (cmsPages) {
      for (const p of cmsPages as Array<{ slug: string; updated_at: string | null }>) {
        if (staticSlugs.has(p.slug)) continue;
        entries.push({
          url: `${siteUrl}/${p.slug}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : now,
          changeFrequency: "yearly",
          priority: 0.3,
        });
      }
    }
  } catch (err) {
    console.error("[sitemap] DB error, falling back to static routes only:", err);
  }

  return entries;
}
