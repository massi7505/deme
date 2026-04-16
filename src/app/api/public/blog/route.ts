import { NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, category, cover_image, status, published_at, created_at, seo_title, seo_description"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
