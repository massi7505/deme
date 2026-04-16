import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createUntypedAdminClient();

  const { data: company, error } = await supabase
    .from("companies")
    .select(`
      id, name, slug, city, postal_code, logo_url, description,
      rating, review_count, is_verified, account_status,
      employee_count, legal_status, siret, website,
      created_at,
      company_regions(department_code, department_name, categories),
      company_photos(id, url, caption, order_index),
      reviews(id, rating, comment, reviewer_name, is_anonymous, is_verified, created_at)
    `)
    .eq("slug", params.slug)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
  }

  // Fetch Q&A separately — ordered and only with non-empty answers
  const { data: company_qna } = await supabase
    .from("company_qna")
    .select("id, question, answer, order_index")
    .eq("company_id", company.id)
    .neq("answer", "")
    .order("order_index", { ascending: true });

  return NextResponse.json({ ...company, company_qna: company_qna || [] });
}
