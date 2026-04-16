import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";
import { distributeLead } from "@/lib/distribute-lead";
import { loadQuoteForVerification, verifyCode, MAX_ATTEMPTS } from "@/lib/quote-verification";
import { notifyAdminDistributionFailed } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const ipCheck = await checkIpRateLimit(getClientIp(request), "verify-email", 3600, 30);
    if (!ipCheck.ok) {
      return NextResponse.json(
        { error: "Trop de requêtes", retryAfterSec: ipCheck.retryAfterSec },
        { status: 429 }
      );
    }
    const { quoteId, code } = await request.json().catch(() => ({}));
    if (!quoteId || !code) {
      return NextResponse.json({ error: "quoteId et code requis" }, { status: 400 });
    }

    const quote = await loadQuoteForVerification(quoteId);
    if (!quote) return NextResponse.json({ error: "Demande non trouvée" }, { status: 404 });
    if (quote.email_verified) return NextResponse.json({ success: true, alreadyVerified: true });

    const attempts = quote.email_verification_attempts ?? 0;
    if (attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Trop d'essais. Demandez un nouveau code." },
        { status: 429 }
      );
    }

    const result = verifyCode(
      String(code),
      quote.email_verification_code,
      quote.email_verification_expires
    );

    const supabase = createUntypedAdminClient();

    if (!result.ok) {
      await supabase
        .from("quote_requests")
        .update({ email_verification_attempts: attempts + 1 })
        .eq("id", quoteId);
      const message =
        result.reason === "expired"
          ? "Le code a expiré. Demandez-en un nouveau."
          : "Code incorrect";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await supabase
      .from("quote_requests")
      .update({
        email_verified: true,
        email_verification_code: null,
        email_verification_expires: null,
        email_verification_attempts: 0,
      })
      .eq("id", quoteId);

    try {
      await distributeLead(quoteId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[verify-email] distributeLead error for ${quoteId}:`, message);
      const clientName = `${quote.client_first_name || ""} ${quote.client_last_name || ""}`.trim() || quote.client_name || "Client";
      await notifyAdminDistributionFailed(
        quoteId,
        clientName,
        "",
        "",
        message
      ).catch((e) => console.error("[verify-email] admin notify error:", e));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[verify-email] error:", error);
    return NextResponse.json({ error: "Erreur de vérification" }, { status: 500 });
  }
}
