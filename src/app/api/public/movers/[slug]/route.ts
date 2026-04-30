import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { findPredefinedAnswer } from "@/lib/predefined-qna";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(request);
  // 30/min/IP — was 120/min, dropped because the detail response embeds
  // SIRET / VAT / legal_status (intentional trust-signal block on the page),
  // so scraping is amplified compared to a generic listing.
  const rl = await checkIpRateLimit(ip, "public/movers/slug", 60, 30);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
    );
  }

  const { slug } = await params;
  const supabase = createUntypedAdminClient();

  const { data: company, error } = await supabase
    .from("companies")
    .select(`
      id, name, slug, address, city, postal_code, logo_url, description,
      rating, review_count, is_verified, account_status,
      employee_count, legal_status, siret, vat_number, website,
      created_at,
      company_regions(department_code, department_name, categories),
      reviews(id, rating, comment, reviewer_name, is_anonymous, is_verified, created_at, mover_reply, mover_reply_at)
    `)
    .eq("slug", slug)
    .in("account_status", ["active", "trial"])
    .single();

  if (error || !company) {
    return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
  }

  // Fetch all Q&A for this company. Empty answers get filled in the response
  // from the predefined library (read-only) so anonymous GETs never write to
  // the DB. Persistence happens in the authenticated dashboard profile GET.
  const { data: qnaRaw } = await supabase
    .from("company_qna")
    .select("id, question, answer, order_index")
    .eq("company_id", company.id)
    .order("order_index", { ascending: true });

  const rows = (qnaRaw || []) as Array<{
    id: string;
    question: string;
    answer: string | null;
    order_index: number;
  }>;

  const company_qna = rows
    .map(({ id, question, answer, order_index }) => ({
      id,
      question,
      answer: answer && answer.trim() !== "" ? answer : findPredefinedAnswer(question),
      order_index,
    }))
    .filter((r) => r.answer && r.answer.trim() !== "");

  // Public gallery: only approved photos, capped at 4, oldest first so the
  // mover's first choices stay stable as they add new ones.
  const { data: company_photos } = await supabase
    .from("company_photos")
    .select("id, url, caption, order_index")
    .eq("company_id", company.id)
    .eq("status", "approved")
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(4);

  // CDN-cache for 1h, allow stale-while-revalidate for another hour. Mover
  // profiles change rarely; serving from CDN cuts the scraping amplification
  // factor on this endpoint dramatically (cached responses don't hit our
  // origin or count against rate-limit budget for cache hits).
  return NextResponse.json(
    { ...company, company_qna, company_photos: company_photos || [] },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=3600",
      },
    }
  );
}
