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

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/apercu",
          "/compte",
          "/configurations",
          "/demandes-de-devis",
          "/facturation",
          "/profil-entreprise",
          "/recommandations",
          "/verifier-demande/",
          "/connexion",
          "/creer-compte",
          "/inscription/",
          "/mot-de-passe-oublie",
          "/verification-identite",
        ],
      },
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "CCBot",
        disallow: "/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
