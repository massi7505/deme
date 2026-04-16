import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

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

    return NextResponse.json({ success: true, claim });
  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
