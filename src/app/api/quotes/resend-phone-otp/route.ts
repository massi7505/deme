import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendOtpSMS } from "@/lib/smsfactor";
import {
  checkResendAllowed,
  generateOtp,
  loadQuoteForVerification,
  otpExpiryIso,
} from "@/lib/quote-verification";

export async function POST(request: NextRequest) {
  const ipCheck = await checkIpRateLimit(getClientIp(request), "resend-phone-otp", 3600, 10);
  if (!ipCheck.ok) {
    return NextResponse.json(
      { error: "Trop de requêtes", retryAfterSec: ipCheck.retryAfterSec },
      { status: 429 }
    );
  }
  const { quoteId } = await request.json().catch(() => ({}));
  if (!quoteId) return NextResponse.json({ error: "quoteId requis" }, { status: 400 });

  const quote = await loadQuoteForVerification(quoteId);
  if (!quote) return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
  if (quote.phone_verified) return NextResponse.json({ success: true, alreadyVerified: true });
  if (!quote.client_phone)
    return NextResponse.json({ error: "Aucun numéro enregistré" }, { status: 400 });

  const rate = checkResendAllowed({
    lastSentAt: quote.phone_verification_last_sent_at,
    attempts: quote.phone_verification_attempts ?? 0,
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
      phone_verification_code: code,
      phone_verification_expires: otpExpiryIso(),
      phone_verification_last_sent_at: new Date().toISOString(),
      phone_verification_attempts: 0,
    })
    .eq("id", quoteId);

  try {
    await sendOtpSMS(quote.client_phone, code);
  } catch (err) {
    console.error("[resend-phone-otp] send error:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
