import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { creditWallet, debitWallet, getWalletBalanceCents } from "@/lib/wallet";
import { sendWalletRefundEmail } from "@/lib/resend";

interface SiteSettings {
  refundsEnabled?: boolean;
  refundMode?: "wallet" | "percentage";
  walletValidityDays?: string;
  refundDefaultPercent?: string;
  refundMaxPercent?: string;
  refundMaxPerMoverMonthly?: string;
  refundMaxPerMoverYearly?: string;
  refundOncePerTransaction?: boolean;
  refundCooldownDays?: string;
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

function euros(value: string | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

interface GuardrailInput {
  companyId: string;
  amountCents: number;
  sourceTransactionId?: string | null;
  sourceAmountCents?: number | null;
}

/** Throws-on-violation preflight. Returns a summary object otherwise. */
async function assertRefundAllowed(
  admin: ReturnType<typeof createUntypedAdminClient>,
  settings: SiteSettings,
  input: GuardrailInput
): Promise<{ monthlyRemaining: number; yearlyRemaining: number }> {
  const { companyId, amountCents, sourceTransactionId, sourceAmountCents } = input;

  // Max % of source transaction
  const maxPercent = parseInt(settings.refundMaxPercent || "100", 10);
  if (sourceAmountCents && sourceAmountCents > 0 && maxPercent > 0 && maxPercent < 100) {
    const cap = Math.floor((sourceAmountCents * maxPercent) / 100);
    if (amountCents > cap) {
      throw new Error(
        `Remboursement max autorisé : ${maxPercent} % de la transaction (${(cap / 100).toFixed(2)} €).`
      );
    }
  }

  // One-per-transaction
  if (settings.refundOncePerTransaction && sourceTransactionId) {
    const { count } = await admin
      .from("wallet_transactions")
      .select("id", { count: "exact", head: true })
      .eq("source_transaction_id", sourceTransactionId)
      .eq("type", "refund");
    if ((count || 0) > 0) {
      throw new Error("Cette transaction a déjà été remboursée une fois.");
    }
  }

  // Cooldown
  const cooldownDays = parseInt(settings.refundCooldownDays || "0", 10);
  if (cooldownDays > 0) {
    const since = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await admin
      .from("wallet_transactions")
      .select("created_at")
      .eq("company_id", companyId)
      .eq("type", "refund")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    if (recent && recent.length > 0) {
      throw new Error(
        `Cooldown actif : le dernier remboursement pour ce déménageur date de moins de ${cooldownDays} jour(s).`
      );
    }
  }

  // Monthly + yearly caps
  const monthlyCapCents = Math.round(euros(settings.refundMaxPerMoverMonthly) * 100);
  const yearlyCapCents = Math.round(euros(settings.refundMaxPerMoverYearly) * 100);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const { data: refundsRows } = await admin
    .from("wallet_transactions")
    .select("amount_cents, created_at")
    .eq("company_id", companyId)
    .eq("type", "refund")
    .gte("created_at", yearAgo.toISOString());

  let monthSum = 0;
  let yearSum = 0;
  for (const r of (refundsRows || []) as Array<{ amount_cents: number; created_at: string }>) {
    if (r.amount_cents <= 0) continue;
    yearSum += r.amount_cents;
    if (new Date(r.created_at) >= monthStart) monthSum += r.amount_cents;
  }

  if (monthlyCapCents > 0 && monthSum + amountCents > monthlyCapCents) {
    const remaining = Math.max(0, monthlyCapCents - monthSum);
    throw new Error(
      `Plafond mensuel atteint : ${(monthSum / 100).toFixed(2)} € déjà remboursé ce mois. Reste ${(remaining / 100).toFixed(2)} €.`
    );
  }
  if (yearlyCapCents > 0 && yearSum + amountCents > yearlyCapCents) {
    const remaining = Math.max(0, yearlyCapCents - yearSum);
    throw new Error(
      `Plafond annuel atteint : ${(yearSum / 100).toFixed(2)} € déjà remboursé sur 365 j. Reste ${(remaining / 100).toFixed(2)} €.`
    );
  }

  return {
    monthlyRemaining: monthlyCapCents > 0 ? monthlyCapCents - monthSum : -1,
    yearlyRemaining: yearlyCapCents > 0 ? yearlyCapCents - yearSum : -1,
  };
}

export async function GET(request: NextRequest) {
  const admin = createUntypedAdminClient();
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId requis" }, { status: 400 });
  }

  const [txnRes, balance, settings] = await Promise.all([
    admin
      .from("wallet_transactions")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    getWalletBalanceCents(admin, companyId),
    readSettings(admin),
  ]);

  // Summaries for the admin UI (month + year refunded so far)
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let monthRefunded = 0;
  let yearRefunded = 0;
  for (const t of (txnRes.data || []) as Array<{ amount_cents: number; type: string; created_at: string }>) {
    if (t.type !== "refund" || t.amount_cents <= 0) continue;
    const ts = new Date(t.created_at);
    if (ts >= yearAgo) yearRefunded += t.amount_cents;
    if (ts >= monthStart) monthRefunded += t.amount_cents;
  }

  const monthlyCapCents = Math.round(euros(settings.refundMaxPerMoverMonthly) * 100);
  const yearlyCapCents = Math.round(euros(settings.refundMaxPerMoverYearly) * 100);

  return NextResponse.json({
    balance,
    transactions: txnRes.data || [],
    caps: {
      monthlyCapCents,
      yearlyCapCents,
      monthRefundedCents: monthRefunded,
      yearRefundedCents: yearRefunded,
      monthRemainingCents: monthlyCapCents > 0 ? monthlyCapCents - monthRefunded : -1,
      yearRemainingCents: yearlyCapCents > 0 ? yearlyCapCents - yearRefunded : -1,
      maxPercent: parseInt(settings.refundMaxPercent || "100", 10),
      oncePerTransaction: !!settings.refundOncePerTransaction,
      cooldownDays: parseInt(settings.refundCooldownDays || "0", 10),
    },
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

    // Guardrails only apply to refunds. Manual adjustments bypass (used for
    // corrections). Only refunds tied to a transaction hit the caps.
    if (type === "refund") {
      let sourceAmountCents: number | null = null;
      if (body.sourceTransactionId) {
        const { data: srcTxn } = await admin
          .from("transactions")
          .select("amount_cents")
          .eq("id", body.sourceTransactionId)
          .maybeSingle();
        sourceAmountCents = srcTxn?.amount_cents
          ? Math.abs(srcTxn.amount_cents)
          : null;
      }
      try {
        await assertRefundAllowed(admin, settings, {
          companyId,
          amountCents,
          sourceTransactionId: body.sourceTransactionId || null,
          sourceAmountCents,
        });
      } catch (err) {
        return NextResponse.json(
          { error: (err as Error).message },
          { status: 400 }
        );
      }
    }

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
