import { NextRequest, NextResponse } from "next/server";
import { verifySiret } from "@/lib/sirene";

export async function GET(request: NextRequest) {
  const siret = request.nextUrl.searchParams.get("siret");

  if (!siret) {
    return NextResponse.json(
      { error: "Le numéro SIRET est requis" },
      { status: 400 }
    );
  }

  const cleaned = siret.replace(/\s/g, "");
  if (!/^\d{14}$/.test(cleaned)) {
    return NextResponse.json(
      { error: "Format SIRET invalide (14 chiffres attendus)" },
      { status: 400 }
    );
  }

  try {
    const result = await verifySiret(cleaned);

    if (!result) {
      return NextResponse.json(
        { error: "SIRET non trouvé" },
        { status: 404 }
      );
    }

    if (!result.isActive) {
      return NextResponse.json(
        { error: "Établissement fermé ou inactif", data: result },
        { status: 422 }
      );
    }

    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de la vérification du SIRET" },
      { status: 502 }
    );
  }
}
