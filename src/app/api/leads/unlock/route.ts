import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { createLeadPayment } from "@/lib/mollie";
import { generateInvoice } from "@/lib/invoice";
import { sendInvoiceEmail } from "@/lib/resend";

const MAX_UNLOCKS_PER_LEAD = 6;
const TRIAL_DAYS = 3;

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = await createServerSupabase();
    const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { distributionId } = await request.json();

    if (!distributionId) {
      return NextResponse.json(
        { error: "ID de distribution requis" },
        { status: 400 }
      );
    }

    const supabase = createUntypedAdminClient();

    // Get distribution with company check
    const { data: distribution } = await supabase
      .from("quote_distributions")
      .select(`
        *,
        companies!inner(id, profile_id, account_status, kyc_status, trial_ends_at, created_at)
      `)
      .eq("id", distributionId)
      .single();

    if (!distribution) {
      return NextResponse.json(
        { error: "Distribution non trouvée" },
        { status: 404 }
      );
    }

    const company = distribution.companies as unknown as {
      id: string;
      profile_id: string;
      account_status: string;
      kyc_status: string;
      trial_ends_at: string | null;
      created_at: string;
    };

    if (company.profile_id !== user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Check if already unlocked
    if (distribution.status === "unlocked") {
      return NextResponse.json(
        { error: "Déjà déverrouillé" },
        { status: 400 }
      );
    }

    // Check max 6 unlocks per lead
    const { count: unlockedCount } = await supabase
      .from("quote_distributions")
      .select("id", { count: "exact", head: true })
      .eq("quote_request_id", distribution.quote_request_id)
      .eq("status", "unlocked");

    if ((unlockedCount || 0) >= MAX_UNLOCKS_PER_LEAD) {
      return NextResponse.json(
        { error: "Ce lead a atteint le maximum de 6 déverrouillages" },
        { status: 400 }
      );
    }

    // Check suspended/closed accounts
    if (company.account_status === "suspended" || company.account_status === "closed") {
      return NextResponse.json(
        { error: "Votre compte est suspendu. Contactez le support." },
        { status: 403 }
      );
    }

    // Check trial expired (3 days)
    if (company.account_status === "trial") {
      const trialEnd = company.trial_ends_at
        ? new Date(company.trial_ends_at)
        : new Date(new Date(company.created_at).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

      if (new Date() > trialEnd) {
        return NextResponse.json(
          {
            error: "Votre période d'essai de 3 jours est terminée. Vérifiez votre identité et achetez un lead pour activer votre compte.",
            trialExpired: true,
          },
          { status: 403 }
        );
      }
    }

    // MANDATORY: KYC verification before any purchase
    if (company.kyc_status !== "approved") {
      return NextResponse.json(
        {
          error: "Vérification d'identité requise avant d'acheter des leads. Rendez-vous dans votre espace pour vérifier votre identité.",
          requiresKyc: true,
        },
        { status: 403 }
      );
    }

    // ALL unlocks require payment
    // If Mollie is not configured, use test mode
    if (!process.env.MOLLIE_API_KEY) {
      // TEST MODE — simulate instant unlock
      await supabase
        .from("quote_distributions")
        .update({ status: "unlocked", unlocked_at: new Date().toISOString() })
        .eq("id", distributionId);

      const { data: txn } = await supabase.from("transactions").insert({
        company_id: company.id,
        quote_distribution_id: distributionId,
        amount_cents: distribution.price_cents,
        type: "unlock",
        status: "paid",
      }).select().single();

      // Generate invoice
      if (txn) {
        const { data: companyInfo } = await supabase
          .from("companies")
          .select("name, siret, address, city, postal_code, email_billing, email_contact")
          .eq("id", company.id)
          .single();

        if (companyInfo) {
          // Get prospect_id for invoice
          let prospectId = "";
          const { data: qr } = await supabase
            .from("quote_requests")
            .select("prospect_id")
            .eq("id", distribution.quote_request_id)
            .single();
          if (qr) prospectId = qr.prospect_id;

          const description = prospectId
            ? `Déverrouillage demande de devis — ${prospectId}`
            : "Déverrouillage demande de devis";
          const invoice = await generateInvoice({
            transactionId: txn.id,
            companyId: company.id,
            companyName: companyInfo.name,
            companySiret: companyInfo.siret ?? "",
            companyAddress: companyInfo.address ?? "",
            companyCity: companyInfo.city ?? "",
            companyPostalCode: companyInfo.postal_code ?? "",
            description,
            amountCents: txn.amount_cents,
          }).catch(() => null);

          // Send invoice email
          const emailTo = companyInfo.email_billing || companyInfo.email_contact;
          if (emailTo && invoice) {
            await sendInvoiceEmail(
              emailTo,
              companyInfo.name,
              invoice.invoiceNumber,
              txn.amount_cents,
              description
            ).catch(() => {});
          }
        }
      }

      // First purchase → activate account permanently
      if (company.account_status === "trial") {
        await supabase
          .from("companies")
          .update({ account_status: "active" })
          .eq("id", company.id);
      }

      // Check max 6 → mark lead as completed
      const { count: totalAfter } = await supabase
        .from("quote_distributions")
        .select("id", { count: "exact", head: true })
        .eq("quote_request_id", distribution.quote_request_id)
        .eq("status", "unlocked");

      if ((totalAfter || 0) >= MAX_UNLOCKS_PER_LEAD) {
        await supabase
          .from("quote_requests")
          .update({ status: "completed" })
          .eq("id", distribution.quote_request_id);
      }

      return NextResponse.json({ success: true, testMode: true });
    }

    // PRODUCTION — Create Mollie payment
    const payment = await createLeadPayment({
      amountCents: distribution.price_cents,
      companyId: company.id,
      distributionId,
    });

    // Record pending transaction immediately so all attempts are visible
    // before the webhook fires (or if webhook never fires)
    await supabase.from("transactions").insert({
      company_id: company.id,
      quote_distribution_id: distributionId,
      mollie_payment_id: payment.id,
      amount_cents: distribution.price_cents,
      type: "lead_purchase",
      status: "pending",
    });

    if (!payment.checkoutUrl) {
      console.error("[Unlock] No checkout URL returned by Mollie for payment:", payment.id);
      return NextResponse.json(
        { error: "Erreur Mollie : aucune URL de paiement retournée. Réessayez." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentUrl: payment.checkoutUrl,
    });
  } catch (error) {
    console.error("Lead unlock error:", error);
    return NextResponse.json(
      { error: "Erreur lors du déverrouillage" },
      { status: 500 }
    );
  }
}
