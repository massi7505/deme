import { NextRequest, NextResponse } from "next/server";
import createMollieClient from "@mollie/api-client";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ valid: false, error: "Clé API manquante" });
    }

    const mollie = createMollieClient({ apiKey });

    // Try to list payment methods — if the key is valid, this will succeed
    const methods = await mollie.methods.list();

    return NextResponse.json({
      valid: true,
      methods: methods.length,
      message: `Connexion réussie — ${methods.length} méthodes de paiement disponibles`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Clé API invalide";
    return NextResponse.json({
      valid: false,
      error: message,
    });
  }
}
