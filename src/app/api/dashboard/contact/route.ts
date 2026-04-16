import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { notifyAdminNewClaim, sendClaimReceivedEmail } from "@/lib/resend";

const VALID_SUBJECTS = [
  "Question commerciale",
  "Question technique",
  "Question facturation",
  "Autre",
] as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id, name, email_contact")
    .eq("profile_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json(
      { error: "Aucune entreprise trouvée" },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const subject = typeof body.subject === "string" ? body.subject : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!VALID_SUBJECTS.includes(subject as (typeof VALID_SUBJECTS)[number])) {
    return NextResponse.json({ error: "Sujet invalide" }, { status: 400 });
  }

  if (message.length < 10 || message.length > 5000) {
    return NextResponse.json(
      { error: "Le message doit faire entre 10 et 5000 caractères" },
      { status: 400 }
    );
  }

  const initialConversation = JSON.stringify([
    { from: "company", message, date: new Date().toISOString() },
  ]);

  const { data: claim, error } = await admin
    .from("claims")
    .insert({
      company_id: company.id,
      quote_distribution_id: null,
      reason: subject,
      description: message,
      status: "pending",
      admin_note: initialConversation,
    })
    .select()
    .single();

  if (error) {
    console.error("[contact] insert claim error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }

  if (company.email_contact && claim) {
    await sendClaimReceivedEmail(
      company.email_contact,
      company.name,
      subject,
      claim.id
    ).catch((err) => console.error("[contact] mover email error:", err));
  }
  if (claim) {
    await notifyAdminNewClaim(company.name, subject, claim.id).catch((err) =>
      console.error("[contact] admin email error:", err)
    );
  }

  return NextResponse.json({ success: true, claimId: claim?.id });
}
