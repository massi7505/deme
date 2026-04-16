import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { generateProspectId } from "@/lib/utils";
import { sendQuoteConfirmation, sendNewLeadNotification } from "@/lib/resend";
import { notifyNewLead } from "@/lib/onesignal";
import { sendLeadSMS, sendOtpSMS } from "@/lib/smsfactor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createUntypedAdminClient();

    const prospectId = generateProspectId();

    // Determine geographic zone from postal code
    const departmentCode = body.fromPostalCode?.slice(0, 2) ?? "";

    // 1. Create quote request
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
        client_name: `${body.firstName} ${body.lastName}`,
        client_phone: body.phone,
        client_email: body.email,
        source: "website",
        geographic_zone: departmentCode,
        status: "new",
      })
      .select()
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: "Erreur lors de la création de la demande" },
        { status: 500 }
      );
    }

    // 2. Find matching movers by department
    const { data: regionMatches } = await supabase
      .from("company_regions")
      .select("company_id, categories")
      .eq("department_code", departmentCode);

    // 3. Find matching movers by radius (simplified — in production, use PostGIS)
    const { data: radiusMatches } = await supabase
      .from("company_radius")
      .select("company_id, move_types");

    // Combine and deduplicate matched company IDs
    const matchedCompanyIds = new Set<string>();

    regionMatches?.forEach((m) => {
      if (m.categories?.includes(body.category ?? "national")) {
        matchedCompanyIds.add(m.company_id);
      }
    });

    radiusMatches?.forEach((m) => {
      if (m.move_types?.includes(body.category ?? "national")) {
        matchedCompanyIds.add(m.company_id);
      }
    });

    // 4. Get active companies only, limit to 6
    const companyIds = Array.from(matchedCompanyIds).slice(0, 6);

    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, email_contact, phone, account_status")
        .in("id", companyIds)
        .in("account_status", ["active", "trial"]);

      if (companies && companies.length > 0) {
        // 5. Create distributions
        const distributions = companies.map((company) => ({
          quote_request_id: quote.id,
          company_id: company.id,
          price_cents: 1200,
          is_trial: company.account_status === "trial",
          status: "pending",
          competitor_count: companies.length - 1,
        }));

        await supabase.from("quote_distributions").insert(distributions);

        // 6. Notify each matched mover
        for (const company of companies) {
          // Push notification
          await notifyNewLead(company.id, {
            id: quote.id,
            fromCity: body.fromCity,
            toCity: body.toCity,
            moveDate: body.moveDate,
          }).catch(() => {}); // Don't fail on notification errors

          // Email notification
          if (company.email_contact) {
            await sendNewLeadNotification(
              company.email_contact,
              company.name,
              body.fromCity,
              body.toCity,
              quote.id
            ).catch(() => {});
          }

          // SMS notification
          if (company.phone) {
            await sendLeadSMS(company.phone, {
              fromCity: body.fromCity,
              toCity: body.toCity,
              moveDate: body.moveDate,
            }).catch(() => {});
          }

          // In-app notification
          await supabase.from("notifications").insert({
            company_id: company.id,
            type: "new_lead",
            title: "Nouvelle demande de devis",
            body: `${body.fromCity} → ${body.toCity}`,
            data: { quoteId: quote.id },
          });
        }
      }
    }

    // 7. Send confirmation email to client
    if (body.email) {
      await sendQuoteConfirmation(
        body.email,
        `${body.firstName} ${body.lastName}`,
        body.fromCity,
        body.toCity,
        prospectId
      ).catch(() => {});
    }

    // 8. Send phone verification SMS to client
    let smsSent = false;
    if (body.phone) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

      await supabase
        .from("quote_requests")
        .update({
          phone_verification_code: code,
          phone_verification_expires: expiresAt,
        })
        .eq("id", quote.id);

      try {
        await sendOtpSMS(body.phone, code);
        smsSent = true;
      } catch (err) {
        console.error("SMS OTP send error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      prospectId,
      quoteId: quote.id,
      matchedMovers: companyIds.length,
      smsSent,
    });
  } catch (error) {
    console.error("Quote submission error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
