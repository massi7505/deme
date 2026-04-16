import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { quoteId, code } = await request.json();

    if (!quoteId || !code) {
      return NextResponse.json(
        { error: "ID et code requis" },
        { status: 400 }
      );
    }

    const supabase = createUntypedAdminClient();

    const { data: quote } = await supabase
      .from("quote_requests")
      .select("id, phone_verification_code, phone_verification_expires, phone_verified")
      .eq("id", quoteId)
      .single();

    if (!quote) {
      return NextResponse.json(
        { error: "Demande non trouvée" },
        { status: 404 }
      );
    }

    if (quote.phone_verified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    if (!quote.phone_verification_code) {
      return NextResponse.json(
        { error: "Aucun code de vérification envoyé" },
        { status: 400 }
      );
    }

    // Check expiry
    if (quote.phone_verification_expires && new Date(quote.phone_verification_expires) < new Date()) {
      return NextResponse.json(
        { error: "Le code a expiré. Veuillez demander un nouveau code." },
        { status: 400 }
      );
    }

    // Check code
    if (quote.phone_verification_code !== code.trim()) {
      return NextResponse.json(
        { error: "Code incorrect" },
        { status: 400 }
      );
    }

    // Mark as verified
    await supabase
      .from("quote_requests")
      .update({
        phone_verified: true,
        phone_verification_code: null,
        phone_verification_expires: null,
      })
      .eq("id", quoteId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Phone verification error:", error);
    return NextResponse.json(
      { error: "Erreur de vérification" },
      { status: 500 }
    );
  }
}
