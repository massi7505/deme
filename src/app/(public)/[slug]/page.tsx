import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

interface PageRow {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string;
}

async function getPage(slug: string): Promise<PageRow | null> {
  try {
    const supabase = createUntypedAdminClient();
    const { data } = await supabase
      .from("pages")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return (data as PageRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: page.meta_title || page.title,
    description: page.meta_description || undefined,
  };
}

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  const updated = new Date(page.updated_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="container max-w-3xl py-12 lg:py-16">
      <header className="mb-10 border-b pb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {page.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dernière mise à jour : {updated}
        </p>
      </header>
      <div
        className="prose prose-gray max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight prose-h2:mt-10 prose-h2:text-2xl prose-h3:mt-8 prose-h3:text-xl prose-a:text-[var(--brand-green)] prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-p:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: page.content || "" }}
      />
    </article>
  );
}
