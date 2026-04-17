import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { creditWallet, debitWallet, getWalletBalanceCents } from "@/lib/wallet";
import { sendWalletRefundEmail } from "@/lib/resend";

interface SiteSettings {
  refundsEnabled?: boolean;
  refundMode?: "wallet" | "percentage";
  walletValidityDays?: string;
  refundDefaultPercent?: string;
}

async function readSettings(
  admin: ReturnType<typeof createUntypedAdminClient>
): Promise<SiteSettings> {
  const { data } = await admin
    .from("site_settings")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  return (data?.data as SiteSettings) || {};
}

export async function GET(request: NextRequest) {
  const admin = createUntypedAdminClient();
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId requis" }, { status: 400 });
  }

  const [txnRes, balance] = await Promise.all([
    admin
      .from("wallet_transactions")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    getWalletBalanceCents(admin, companyId),
  ]);

  return NextResponse.json({
    balance,
    transactions: txnRes.data || [],
  });
}

export async function POST(request: NextRequest) {
  const admin = createUntypedAdminClient();
  const body = await request.json();
  const settings = await readSettings(admin);

  if (!settings.refundsEnabled) {
    return NextResponse.json(
      { error: "Remboursements désactivés dans les paramètres" },
      { status: 400 }
    );
  }

  const action = body.action as string;
  const companyId = body.companyId as string;

  if (!companyId) {
    return NextResponse.json({ error: "companyId requis" }, { status: 400 });
  }

  const { data: company } = await admin
    .from("companies")
    .select("id, name, email_contact")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) {
    return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
  }

  if (action === "credit") {
    const amountCents = Math.round(Number(body.amountCents) || 0);
    if (amountCents <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    const reason = (body.reason as string) || "Crédit admin";
    const validityDays = Math.max(
      1,
      parseInt(body.validityDays || settings.walletValidityDays || "365", 10)
    );
    const type = body.type === "adjustment" ? "adjustment" : "refund";

    const { balance } = await creditWallet(admin, {
      companyId,
      amountCents,
      reason,
      validityDays,
      adminNote: body.adminNote || null,
      sourceTransactionId: body.sourceTransactionId || null,
      quoteDistributionId: body.quoteDistributionId || null,
      type,
    });

    const expiresAt = new Date(
      Date.now() + validityDays * 24 * 60 * 60 * 1000
    ).toISOString();

    if (company.email_contact) {
      await sendWalletRefundEmail(
        company.email_contact,
        company.name,
        amountCents,
        expiresAt,
        balance
      ).catch((err) => console.error("[wallet] email failed:", err));
    }

    return NextResponse.json({ success: true, balance });
  }

  if (action === "debit") {
    const amountCents = Math.round(Number(body.amountCents) || 0);
    if (amountCents <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    const current = await getWalletBalanceCents(admin, companyId);
    if (current < amountCents) {
      return NextResponse.json(
        { error: "Solde insuffisant" },
        { status: 400 }
      );
    }
    const { balance } = await debitWallet(admin, {
      companyId,
      amountCents,
      reason: (body.reason as string) || "Débit admin",
    });
    return NextResponse.json({ success: true, balance });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
