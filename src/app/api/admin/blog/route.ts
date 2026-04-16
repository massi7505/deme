import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createUntypedAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const supabase = createUntypedAdminClient();
  const body = await request.json();

  if (body.action === "create") {
    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt || null,
        content: body.content || null,
        cover_image: body.cover_image || null,
        category: body.category || null,
        status: body.status || "draft",
        seo_title: body.seo_title || null,
        seo_description: body.seo_description || null,
        published_at: body.status === "published" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (body.action === "update") {
    const updates: Record<string, unknown> = {};
    for (const key of ["title", "slug", "excerpt", "content", "cover_image", "category", "status", "seo_title", "seo_description"]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (body.status === "published") updates.published_at = new Date().toISOString();

    const { error } = await supabase
      .from("blog_posts")
      .update(updates)
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "delete") {
    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
