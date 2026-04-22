import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const supabase = createUntypedAdminClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const supabase = createUntypedAdminClient();
  const body = await request.json();

  if (body.action === "create") {
    const { data, error } = await supabase
      .from("pages")
      .insert({
        title: body.title,
        slug: body.slug,
        content: body.content || null,
        meta_title: body.meta_title || null,
        meta_description: body.meta_description || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (body.action === "update") {
    const updates: Record<string, unknown> = {};
    for (const key of ["title", "slug", "content", "meta_title", "meta_description"]) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { error } = await supabase
      .from("pages")
      .update(updates)
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (body.action === "delete") {
    const { error } = await supabase
      .from("pages")
      .delete()
      .eq("id", body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
