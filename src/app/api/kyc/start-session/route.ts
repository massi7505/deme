import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { createSession } from "@/lib/didit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();
  const { data: company, error } = await admin
    .from("companies")
    .select("id, name, email_contact, kyc_status")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error || !company) {
    return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
  }
  if (company.kyc_status === "approved") {
    return NextResponse.json({ error: "Déjà vérifié" }, { status: 409 });
  }

  const origin = request.nextUrl.origin;
  const callbackUrl = `${origin}/verification-identite?return=1`;

  let session;
  try {
    session = await createSession({
      companyId: company.id,
      email: company.email_contact,
      callbackUrl,
    });
  } catch (err) {
    console.error("[kyc/start-session] didit error:", err);
    return NextResponse.json(
      {
        error: "Impossible de démarrer la vérification",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }

  await admin
    .from("companies")
    .update({
      didit_session_id: session.session_id,
      kyc_status: "in_review",
    })
    .eq("id", company.id);

  return NextResponse.json({ verificationUrl: session.url });
}
