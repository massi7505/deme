import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Article introuvable" },
      { status: 404 }
    );
  }

  // Get related articles (same category, excluding current)
  const { data: related } = await supabase
    .from("blog_posts")
    .select("id, slug, title, category, cover_image, excerpt")
    .eq("status", "published")
    .eq("category", data.category)
    .neq("id", data.id)
    .order("published_at", { ascending: false })
    .limit(3);

  return NextResponse.json({
    article: data,
    related: related || [],
  });
}
