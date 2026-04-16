import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: NextRequest) {
  const { email, otp, password } = await request.json().catch(() => ({}));

  if (!email || !otp || !password) {
    return NextResponse.json(
      { error: "Email, code et mot de passe requis" },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères` },
      { status: 400 }
    );
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedOtp = String(otp).trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    return NextResponse.json(
      { error: "Le code doit contenir 6 chiffres" },
      { status: 400 }
    );
  }

  const admin = createUntypedAdminClient();

  const { data: verified, error: verifyError } = await admin.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedOtp,
    type: "recovery",
  });

  if (verifyError || !verified?.user) {
    return NextResponse.json(
      { error: "Code invalide ou expiré" },
      { status: 400 }
    );
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    verified.user.id,
    { password }
  );

  if (updateError) {
    console.error("[reset-password] updateUserById error:", updateError.message);
    return NextResponse.json(
      { error: "Impossible de mettre à jour le mot de passe" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
