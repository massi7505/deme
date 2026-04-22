import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const supabase = createUntypedAdminClient();

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (reviews || []) as Array<Record<string, unknown>>;
  const companyIds = Array.from(
    new Set(rows.map((r) => r.company_id).filter(Boolean))
  ) as string[];

  const companyMap: Record<string, string> = {};
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds);
    for (const c of (companies || []) as Array<{ id: string; name: string }>) {
      companyMap[c.id] = c.name;
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    company_name: companyMap[r.company_id as string] || "Inconnu",
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const supabase = createUntypedAdminClient();
  const body = await request.json().catch(() => ({}));

  if (body.action === "delete") {
    const id = (body.id || "").toString();
    if (!id) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    // Fetch company_id before delete to recompute aggregates afterward
    const { data: review } = await supabase
      .from("reviews")
      .select("company_id")
      .eq("id", id)
      .maybeSingle();
    const companyId = (review as { company_id: string } | null)?.company_id;

    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Recompute the company's rating + review_count
    if (companyId) {
      const { data: remaining } = await supabase
        .from("reviews")
        .select("rating")
        .eq("company_id", companyId);
      const all = (remaining || []) as Array<{ rating: number }>;
      const count = all.length;
      const avg = count > 0 ? all.reduce((s, r) => s + r.rating, 0) / count : 0;
      await supabase
        .from("companies")
        .update({
          rating: Number(avg.toFixed(1)),
          review_count: count,
        })
        .eq("id", companyId);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
