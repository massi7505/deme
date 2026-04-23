import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/admin-auth";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(request);
  const rl = await checkIpRateLimit(ip, "public/blog/slug", 60, 120);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
    );
  }

  const { slug } = await params;
  const supabase = createUntypedAdminClient();

  const url = new URL(request.url);
  const previewRequested = url.searchParams.get("preview") === "1";
  const adminCookie = request.cookies.get("admin_token")?.value;
  const isAdminPreview =
    previewRequested && !!adminCookie && verifyAdminToken(adminCookie);

  let query = supabase.from("blog_posts").select("*").eq("slug", slug);
  if (!isAdminPreview) {
    query = query.eq("status", "published");
  }
  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Article introuvable" },
      { status: 404 }
    );
  }

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
