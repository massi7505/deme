import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { sendClaimReceivedEmail, notifyAdminNewClaim } from "@/lib/resend";
import { checkAndFlagDefectiveLead, isHardReason } from "@/lib/defect-detection";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const ip = getClientIp(request);
    const rl = await checkIpRateLimit(ip, "dashboard/claims", 3600, 20);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Trop de réclamations, réessayez plus tard" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 3600) } }
      );
    }

    const admin = createUntypedAdminClient();

    // Get the user's company
    const { data: company } = await admin
      .from("companies")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!company) {
      return NextResponse.json(
        { error: "Aucune entreprise trouvée" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { distributionId, reason, description } = body;

    if (!distributionId || !reason) {
      return NextResponse.json(
        { error: "Le motif et l'identifiant de la demande sont obligatoires" },
        { status: 400 }
      );
    }

    const validReasons = [
      "Numéro invalide",
      "Client déjà contacté",
      "Fausse demande",
      "Client déjà déménagé",
      "Doublon",
    ];

    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: "Motif de réclamation invalide" },
        { status: 400 }
      );
    }

    // Verify the distribution belongs to this company and is unlocked
    const { data: distribution } = await admin
      .from("quote_distributions")
      .select("id, status, price_cents")
      .eq("id", distributionId)
      .eq("company_id", company.id)
      .single();

    if (!distribution) {
      return NextResponse.json(
        { error: "Demande non trouvée" },
        { status: 404 }
      );
    }

    if (distribution.status !== "unlocked") {
      return NextResponse.json(
        { error: "Seules les demandes déverrouillées peuvent faire l'objet d'une réclamation" },
        { status: 400 }
      );
    }

    // Create claim
    const { data: claim, error } = await admin.from("claims").insert({
      company_id: company.id,
      quote_distribution_id: distributionId,
      reason,
      description: description || null,
      status: "pending",
    }).select().single();

    if (error) {
      console.error("Erreur lors de la création de la réclamation:", error);
      return NextResponse.json(
        { error: "Erreur lors de la création de la réclamation" },
        { status: 500 }
      );
    }

    // Send confirmation email to mover + notify admin
    const { data: companyInfo } = await admin
      .from("companies")
      .select("name, email_contact")
      .eq("id", company.id)
      .single();

    if (companyInfo?.email_contact && claim) {
      await sendClaimReceivedEmail(companyInfo.email_contact, companyInfo.name, reason, claim.id)
        .catch((err) => console.error("Claim received email error:", err));
    }
    if (claim) {
      await notifyAdminNewClaim(companyInfo?.name || "Inconnu", reason, claim.id)
        .catch((err) => console.error("Admin claim notification error:", err));
    }

    // Collective defect detection — only for hard-reason claims.
    // Runs best-effort: failure should not break claim creation.
    if (claim && isHardReason(reason)) {
      try {
        const { data: dist } = await admin
          .from("quote_distributions")
          .select("quote_request_id")
          .eq("id", distributionId)
          .single();
        if (dist?.quote_request_id) {
          await checkAndFlagDefectiveLead(admin, dist.quote_request_id as string);
        }
      } catch (err) {
        console.error("[Claim] defect detection failed:", err);
      }
    }

    return NextResponse.json({ success: true, claim });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
