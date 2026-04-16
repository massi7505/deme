import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { generateProspectId } from "@/lib/utils";
import { sendQuoteConfirmation, sendNewLeadNotification } from "@/lib/resend";
import { notifyNewLead } from "@/lib/onesignal";
import { sendLeadSMS, sendOtpSMS } from "@/lib/smsfactor";

/** Calculate lead price in cents from admin settings */
async function calculatePriceCents(
  supabase: ReturnType<typeof createUntypedAdminClient>,
  category: string,
  departmentCode: string,
  volumeM3: number | null
): Promise<number> {
  try {
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).single();
    const s = (data?.data || {}) as Record<string, unknown>;

    // Base price by category
    const basePrices: Record<string, string> = {
      national: (s.priceNational as string) || "12.00",
      entreprise: (s.priceEntreprise as string) || "18.00",
      international: (s.priceInternational as string) || "25.00",
    };
    let price = parseFloat(basePrices[category] || basePrices.national);

    // Smart pricing adjustments
    if (s.pricingMode === "smart") {
      // Department adjustment
      const deptRules = (s.smartPricingDepartments as Array<{ code: string; percent: number }>) || [];
      const deptRule = deptRules.find((r) => r.code === departmentCode);
      if (deptRule) {
        price *= 1 + deptRule.percent / 100;
      }

      // Volume adjustment
      if (volumeM3) {
        const volRules = (s.smartPricingVolume as Array<{ minM3: number; maxM3: number; percent: number }>) || [];
        const volRule = volRules.find((r) => volumeM3 >= r.minM3 && volumeM3 <= r.maxM3);
        if (volRule) {
          price *= 1 + volRule.percent / 100;
        }
      }

      // Season adjustment
      const seasonRules = (s.smartPricingSeasons as Array<{ startDate: string; endDate: string; percent: number }>) || [];
      const today = new Date().toISOString().slice(0, 10);
      const seasonRule = seasonRules.find((r) => r.startDate && r.endDate && today >= r.startDate && today <= r.endDate);
      if (seasonRule) {
        price *= 1 + seasonRule.percent / 100;
      }
    }

    return Math.round(price * 100);
  } catch {
    // Fallback to default prices
    const defaults: Record<string, number> = { national: 1200, entreprise: 1800, international: 2500 };
    return defaults[category] || 1200;
  }
}

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

    // 3. Find matching movers by radius — check geographic distance
    const fromLat = parseFloat(body.fromLat) || 0;
    const fromLng = parseFloat(body.fromLng) || 0;

    const { data: radiusRules } = await supabase
      .from("company_radius")
      .select("company_id, lat, lng, radius_km, move_types");

    // Haversine distance in km
    const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Combine and deduplicate matched company IDs
    const matchedCompanyIds = new Set<string>();
    const category = body.category ?? "national";

    regionMatches?.forEach((m) => {
      if (m.categories?.includes(category)) {
        matchedCompanyIds.add(m.company_id);
      }
    });

    // Only add radius matches if we have coordinates AND the quote is within range
    if (fromLat && fromLng && radiusRules) {
      for (const rule of radiusRules) {
        if (!rule.move_types?.includes(category)) continue;
        const dist = haversineKm(fromLat, fromLng, rule.lat, rule.lng);
        if (dist <= rule.radius_km) {
          matchedCompanyIds.add(rule.company_id);
        }
      }
    }

    // 4. Get active companies only, limit to 6
    const companyIds = Array.from(matchedCompanyIds).slice(0, 6);

    if (companyIds.length > 0) {
      const { data: companies } = await supabase
        .from("companies")
        .select("id, name, email_contact, phone, account_status")
        .in("id", companyIds)
        .in("account_status", ["active", "trial"]);

      if (companies && companies.length > 0) {
        // 5. Calculate price from admin settings
        const priceCents = await calculatePriceCents(
          supabase,
          body.category ?? "national",
          departmentCode,
          body.volumeM3 ? parseFloat(body.volumeM3) : null
        );

        // 6. Create distributions
        const distributions = companies.map((company) => ({
          quote_request_id: quote.id,
          company_id: company.id,
          price_cents: priceCents,
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
