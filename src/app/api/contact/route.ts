import { NextRequest, NextResponse } from "next/server";
import { getResend } from "@/lib/resend";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

async function getContactEmail(): Promise<string> {
  try {
    const supabase = createUntypedAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("data")
      .eq("id", 1)
      .single();
    return data?.data?.contactEmail || "contact@demenagement24.com";
  } catch {
    return "contact@demenagement24.com";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Tous les champs sont obligatoires" },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.length < 2) {
      return NextResponse.json(
        { error: "Le nom doit contenir au moins 2 caractères" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.length < 10) {
      return NextResponse.json(
        { error: "Le message doit contenir au moins 10 caractères" },
        { status: 400 }
      );
    }

    const contactEmail = await getContactEmail();
    const fromEmail = process.env.EMAIL_FROM ?? "Demenagement24 <noreply@demenagement24.com>";

    const resend = getResend();
    await resend.emails.send({
      from: fromEmail,
      to: contactEmail,
      replyTo: email,
      subject: `[Contact] ${subject} - ${name}`,
      html: `
        <div style="font-family: system-ui, sans-serif;">
          <h2>Nouveau message de contact</h2>
          <p><strong>Nom :</strong> ${name}</p>
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Sujet :</strong> ${subject}</p>
          <hr />
          <p>${message.replace(/\n/g, "<br />")}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de l'envoi du message de contact:", error);

    // If Resend is not configured, still return success to not block the user
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY non configurée — message non envoyé mais accepté");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }
}
