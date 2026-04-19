import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { findPredefinedAnswer } from "@/lib/predefined-qna";

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createUntypedAdminClient();

  const { data: company, error } = await supabase
    .from("companies")
    .select(`
      id, name, slug, address, city, postal_code, logo_url, description,
      rating, review_count, is_verified, account_status,
      employee_count, legal_status, siret, vat_number, website,
      created_at,
      company_regions(department_code, department_name, categories),
      company_photos(id, url, caption, order_index),
      reviews(id, rating, comment, reviewer_name, is_anonymous, is_verified, created_at, mover_reply, mover_reply_at)
    `)
    .eq("slug", params.slug)
    .single();

  if (error || !company) {
    return NextResponse.json({ error: "Entreprise non trouvée" }, { status: 404 });
  }

  // Fetch all Q&A for this company. Backfill empty answers on-the-fly from
  // the predefined library, persist the backfilled answers so the mover sees
  // them next time too, and only return rows that actually have content.
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

  const needBackfill = rows.filter(
    (r) => (!r.answer || r.answer.trim() === "") && findPredefinedAnswer(r.question) !== null
  );
  if (needBackfill.length > 0) {
    await Promise.all(
      needBackfill.map((r) => {
        const answer = findPredefinedAnswer(r.question)!;
        r.answer = answer;
        return supabase.from("company_qna").update({ answer }).eq("id", r.id);
      })
    );
  }

  const company_qna = rows
    .filter((r) => r.answer && r.answer.trim() !== "")
    .map(({ id, question, answer, order_index }) => ({ id, question, answer, order_index }));

  return NextResponse.json({ ...company, company_qna });
}
