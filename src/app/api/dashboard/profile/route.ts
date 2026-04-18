import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { ensureCompanyForUser } from "@/lib/ensure-company";
import { verifySiret } from "@/lib/sirene";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();

  const company = await ensureCompanyForUser(admin, user.id, user.email || "");
  if (!company) {
    return NextResponse.json(
      { error: "Impossible d'initialiser le compte" },
      { status: 500 }
    );
  }

  // Get reviews for this company
  const { data: reviews } = await admin
    .from("reviews")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  // Get Q&A for this company
  const { data: qna } = await admin
    .from("company_qna")
    .select("*")
    .eq("company_id", company.id)
    .order("order_index", { ascending: true });

  // Get photos for this company
  const { data: photos } = await admin
    .from("company_photos")
    .select("*")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    company,
    reviews: reviews || [],
    qna: qna || [],
    photos: photos || [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();
  const body = await request.json();

  const company = await ensureCompanyForUser(admin, user.id, user.email || "");
  if (!company) {
    return NextResponse.json(
      { error: "Impossible d'initialiser le compte" },
      { status: 500 }
    );
  }

  // Add Q&A question
  if (body.action === "add_qna") {
    const { data: qnaData, error: qnaError } = await admin
      .from("company_qna")
      .insert({
        company_id: company.id,
        question: body.question,
        answer: body.answer || "",
        order_index: 0,
      })
      .select()
      .single();

    if (qnaError) return NextResponse.json({ error: qnaError.message }, { status: 500 });
    return NextResponse.json(qnaData);
  }

  // Update Q&A answer
  if (body.action === "update_qna") {
    const { error: qnaError } = await admin
      .from("company_qna")
      .update({ answer: body.answer })
      .eq("id", body.qnaId)
      .eq("company_id", company.id);

    if (qnaError) return NextResponse.json({ error: qnaError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Delete Q&A
  if (body.action === "delete_qna") {
    const { error: qnaError } = await admin
      .from("company_qna")
      .delete()
      .eq("id", body.qnaId)
      .eq("company_id", company.id);

    if (qnaError) return NextResponse.json({ error: qnaError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Delete photo
  if (body.action === "delete_photo") {
    const { error: photoError } = await admin
      .from("company_photos")
      .delete()
      .eq("id", body.photoId)
      .eq("company_id", company.id);

    if (photoError) return NextResponse.json({ error: photoError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Request a company name change (admin must approve)
  if (body.action === "request_name_change") {
    const requested = (body.requested_name || "").toString().trim();
    if (!requested) {
      return NextResponse.json(
        { error: "Le nouveau nom est requis" },
        { status: 400 }
      );
    }
    if (requested === ((company.name as string) || "").trim()) {
      return NextResponse.json(
        { error: "Le nouveau nom est identique au nom actuel" },
        { status: 400 }
      );
    }
    if (company.pending_name) {
      return NextResponse.json(
        { error: "Une demande de changement de nom est déjà en cours" },
        { status: 409 }
      );
    }
    const { data, error } = await admin
      .from("companies")
      .update({
        pending_name: requested,
        pending_name_requested_at: new Date().toISOString(),
      })
      .eq("id", company.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Sync legal_status + vat_number from INSEE
  if (body.action === "sync_from_insee") {
    const siretValue = (company.siret as string) || "";
    if (!siretValue) {
      return NextResponse.json(
        { error: "SIRET manquant" },
        { status: 400 }
      );
    }
    const result = await verifySiret(siretValue);
    if (!result) {
      return NextResponse.json(
        { error: "SIRET introuvable à l'INSEE" },
        { status: 404 }
      );
    }
    const { data, error } = await admin
      .from("companies")
      .update({
        legal_status: result.legalStatusLabel,
        vat_number: result.vatNumber,
      })
      .eq("id", company.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Update company fields
  const allowedFields = [
    "description",
    "phone",
    "email_contact",
    "website",
    "employee_count",
  ];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Aucun champ à mettre à jour" },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("companies")
    .update(updates)
    .eq("id", company.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
