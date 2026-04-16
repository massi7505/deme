import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { sendQuoteVerificationEmail } from "@/lib/resend";
import {
  checkResendAllowed,
  generateOtp,
  loadQuoteForVerification,
  otpExpiryIso,
  OTP_EXPIRY_MS,
} from "@/lib/quote-verification";
import { emailBaseUrl } from "@/lib/base-url";

export async function POST(request: NextRequest) {
  const { quoteId } = await request.json().catch(() => ({}));
  if (!quoteId) return NextResponse.json({ error: "quoteId requis" }, { status: 400 });

  const quote = await loadQuoteForVerification(quoteId);
  if (!quote) return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
  if (quote.email_verified) return NextResponse.json({ success: true, alreadyVerified: true });
  if (!quote.client_email)
    return NextResponse.json({ error: "Aucune adresse email enregistrée" }, { status: 400 });

  const rate = checkResendAllowed({
    lastSentAt: quote.email_verification_last_sent_at,
    attempts: quote.email_verification_attempts ?? 0,
    createdAt: quote.created_at,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives", reason: rate.reason, retryAfterSec: rate.retryAfterSec },
      { status: 429 }
    );
  }

  const code = generateOtp();
  const supabase = createUntypedAdminClient();
  await supabase
    .from("quote_requests")
    .update({
      email_verification_code: code,
      email_verification_expires: otpExpiryIso(),
      email_verification_last_sent_at: new Date().toISOString(),
      email_verification_attempts: 0,
    })
    .eq("id", quoteId);

  const verifyUrl = `${emailBaseUrl()}/verifier-demande/${quoteId}`;
  try {
    await sendQuoteVerificationEmail(
      quote.client_email,
      `${quote.client_first_name || ""} ${quote.client_last_name || ""}`.trim() || "client",
      code,
      Math.round(OTP_EXPIRY_MS / 60000),
      verifyUrl
    );
  } catch (err) {
    console.error("[send-email-otp] send error:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
