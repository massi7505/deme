import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/resend";

// OTP expires in 60 minutes (Supabase default for recovery tokens).
const OTP_EXPIRY_MINUTES = 60;

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({ email: "" }));

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();

  // Generate recovery OTP without triggering Supabase's default email.
  // Any error (user not found, rate limit) is silently absorbed so we
  // never leak whether an account exists for the given email.
  try {
    const admin = createUntypedAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: normalized,
    });

    if (!error && data?.properties?.email_otp) {
      await sendPasswordResetEmail(
        normalized,
        data.properties.email_otp,
        OTP_EXPIRY_MINUTES
      );
    } else if (error) {
      console.log("[forgot-password] generateLink error (suppressed):", error.message);
    }
  } catch (e) {
    console.error("[forgot-password] unexpected error:", e);
  }

  return NextResponse.json({ success: true });
}
