import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { generateProspectId } from "@/lib/utils";
import { sendOtpSMS } from "@/lib/smsfactor";
import { sendQuoteVerificationEmail } from "@/lib/resend";
import { distributeLead } from "@/lib/distribute-lead";
import { generateOtp, otpExpiryIso, OTP_EXPIRY_MS } from "@/lib/quote-verification";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";
import { emailBaseUrl } from "@/lib/base-url";
import { scoreLead, FRAUD_THRESHOLD, HONEYPOT_FIELD_NAME, normalizeEmail, normalizePhone } from "@/lib/fraud-detection";

const FEATURE_ENABLED = process.env.LEAD_VERIFICATION_ENABLED !== "false";

export async function POST(request: NextRequest) {
  try {
    const ipCheck = await checkIpRateLimit(getClientIp(request), "quotes-submit", 600, 5);
    if (!ipCheck.ok) {
      return NextResponse.json(
        { error: "Trop de demandes envoyées. Merci de réessayer plus tard.", retryAfterSec: ipCheck.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSec ?? 60) } }
      );
    }
    const body = await request.json();
    if (!body?.email && !body?.phone) {
      return NextResponse.json(
        { error: "Email ou téléphone requis" },
        { status: 400 }
      );
    }
    if (!body?.firstName || !body?.lastName) {
      return NextResponse.json(
        { error: "Nom et prénom requis" },
        { status: 400 }
      );
    }
    const supabase = createUntypedAdminClient();

    const prospectId = generateProspectId();
    const departmentCode = body.fromPostalCode?.slice(0, 2) ?? "";

    const emailCode = generateOtp();
    const phoneCode = generateOtp();
    const otpExpires = otpExpiryIso();
    const nowIso = new Date().toISOString();

    const { data: quote, error: quoteError } = await supabase
      .from("quote_requests")
      .insert({
        prospect_id: prospectId,
        category: body.category ?? "national",
        move_type: body.moveType ?? "national",
        from_address: body.fromAddress,
        from_city: body.fromCity,
        from_postal_code: body.fromPostalCode,
        from_housing_type: body.fromHousingType,
        from_floor: body.fromFloor ?? 0,
        from_elevator: body.fromElevator ?? false,
        to_address: body.toAddress,
        to_city: body.toCity,
        to_postal_code: body.toPostalCode,
        to_housing_type: body.toHousingType,
        to_floor: body.toFloor ?? 0,
        to_elevator: body.toElevator ?? false,
        room_count: body.roomCount ? parseInt(body.roomCount) : null,
        volume_m3: body.volumeM3 ?? null,
        move_date: body.moveDate ?? null,
        client_salutation: body.salutation,
        client_first_name: body.firstName,
        client_last_name: body.lastName,
        client_name: `${body.firstName ?? ""} ${body.lastName ?? ""}`.trim(),
        client_phone: body.phone,
        client_email: body.email,
        client_email_normalized: body.email ? normalizeEmail(body.email) : null,
        client_phone_normalized: body.phone ? normalizePhone(body.phone) : null,
        source: "website",
        geographic_zone: departmentCode,
        status: "new",
        from_lat: body.fromLat ? parseFloat(body.fromLat) : null,
        from_lng: body.fromLng ? parseFloat(body.fromLng) : null,
        email_verification_code: emailCode,
        email_verification_expires: otpExpires,
        email_verification_last_sent_at: nowIso,
        phone_verification_code: phoneCode,
        phone_verification_expires: otpExpires,
        phone_verification_last_sent_at: nowIso,
        heavy_items: Array.isArray(body.heavyItems) ? body.heavyItems : [],
        services: Array.isArray(body.services) ? body.services : [],
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        move_date_end: body.moveDateEnd || null,
        date_mode: body.dateMode === "flexible" ? "flexible" : body.dateMode === "precise" ? "precise" : null,
      })
      .select()
      .single();

    if (quoteError || !quote) {
      console.error("[quotes] insert error:", quoteError);
      return NextResponse.json({ error: "Erreur lors de la création de la demande" }, { status: 500 });
    }

    // Fraud detection. Silent: response stays identical whether flagged
    // or clean. A flagged lead is parked in status='review_pending' with
    // no distribution; admin approves/rejects from /admin/leads.
    // Throws on DB error — we treat failure as clean-lead, never block
    // a legitimate submission on detection unavailability.
    let isFraudFlagged = false;
    try {
      const { score, reasons } = await scoreLead(
        {
          email: body.email,
          phone: body.phone,
          firstName: body.firstName,
          lastName: body.lastName,
          notes: body.notes,
          fromPostalCode: body.fromPostalCode,
          fromCity: body.fromCity,
          honeypot: body[HONEYPOT_FIELD_NAME],
        },
        { supabase, quoteId: quote.id }
      );

      if (score >= FRAUD_THRESHOLD) {
        const { error: flagErr } = await supabase
          .from("quote_requests")
          .update({
            status: "review_pending",
            fraud_score: score,
            fraud_reasons: reasons,
          })
          .eq("id", quote.id);
        // Only honor the in-memory fraud-flagged state if the DB update
        // actually succeeded. Otherwise the lead is status='new' in DB
        // and we must not create a memory/DB divergence by skipping
        // distribution silently.
        if (!flagErr) {
          isFraudFlagged = true;
          await supabase.from("notifications").insert({
            type: "system",
            title: "Lead en attente de vérification",
            body: `Score ${score} — ${reasons.map((r) => r.label).join(", ")}`,
            data: { quoteRequestId: quote.id, fraudScore: score },
          });
        } else {
          console.error("[quotes] fraud-flag UPDATE failed:", flagErr);
        }
      } else if (score > 0) {
        await supabase
          .from("quote_requests")
          .update({ fraud_score: score, fraud_reasons: reasons })
          .eq("id", quote.id);
      }
      // When score === 0, skip the UPDATE — defaults are already 0 / [].
    } catch (err) {
      console.error("[quotes] fraud-detection error:", err);
    }

    // Verification email only goes out when the feature is enabled;
    // a rollback via LEAD_VERIFICATION_ENABLED=false should not spam
    // the client with a verification email for an already-distributed lead.
    let emailSent = false;
    if (FEATURE_ENABLED && body.email) {
      const verifyUrl = `${emailBaseUrl()}/verifier-demande/${quote.id}`;
      try {
        await sendQuoteVerificationEmail(
          body.email,
          `${body.firstName || ""} ${body.lastName || ""}`.trim() || "client",
          emailCode,
          Math.round(OTP_EXPIRY_MS / 60000),
          verifyUrl
        );
        emailSent = true;
      } catch (err) {
        console.error("[quotes] email OTP send error:", err);
      }
    }

    // Phone OTP mirrors the pre-feature behavior: always sent (legacy
    // /devis success screen expects it). When feature is enabled the
    // /verifier-demande page also accepts it.
    let smsSent = false;
    if (body.phone) {
      try {
        await sendOtpSMS(body.phone, phoneCode);
        smsSent = true;
      } catch (err) {
        console.error("[quotes] SMS OTP send error:", err);
      }
    }

    // Feature-flag bypass: behave like the pre-feature flow.
    if (!FEATURE_ENABLED) {
      if (!isFraudFlagged) {
        await distributeLead(quote.id).catch((err) =>
          console.error("[quotes] distributeLead error:", err)
        );
      }
      return NextResponse.json({
        success: true,
        prospectId,
        quoteId: quote.id,
        verificationRequired: false,
        emailSent,
        smsSent,
      });
    }

    return NextResponse.json({
      success: true,
      prospectId,
      quoteId: quote.id,
      verificationRequired: true,
      emailSent,
      smsSent,
    });
  } catch (error) {
    console.error("[quotes] submission error:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
