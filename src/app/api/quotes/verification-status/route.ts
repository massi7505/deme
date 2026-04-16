import { NextRequest, NextResponse } from "next/server";
import {
  loadQuoteForVerification,
  maskEmailForDisplay,
  maskPhoneForDisplay,
  RESEND_COOLDOWN_MS,
} from "@/lib/quote-verification";

export async function POST(request: NextRequest) {
  const { quoteId } = await request.json().catch(() => ({}));
  if (!quoteId) return NextResponse.json({ error: "quoteId requis" }, { status: 400 });

  const quote = await loadQuoteForVerification(quoteId);
  if (!quote) return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });

  function cooldownSec(lastSent: string | null): number {
    if (!lastSent) return 0;
    const elapsed = Date.now() - new Date(lastSent).getTime();
    if (elapsed >= RESEND_COOLDOWN_MS) return 0;
    return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
  }

  return NextResponse.json({
    emailVerified: !!quote.email_verified,
    phoneVerified: !!quote.phone_verified,
    emailMasked: maskEmailForDisplay(quote.client_email || ""),
    phoneMasked: maskPhoneForDisplay(quote.client_phone || ""),
    emailCooldownSec: cooldownSec(quote.email_verification_last_sent_at),
    phoneCooldownSec: cooldownSec(quote.phone_verification_last_sent_at),
    distributed: !!quote.distributed_at,
  });
}
