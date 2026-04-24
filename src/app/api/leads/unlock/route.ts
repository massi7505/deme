import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { createLeadPayment } from "@/lib/mollie";
import { generateInvoice } from "@/lib/invoice";
import { sendInvoiceEmail, notifyAdminLeadCompleted } from "@/lib/resend";
import { getWalletBalanceCents, debitWallet } from "@/lib/wallet";

const MAX_UNLOCKS_PER_LEAD = 6;

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

    // Reject unlock if the move date has already passed. The effective cutoff
    // uses move_date_extended_to when the client reconfirmed "still looking"
    // via the J-3 re-engagement email. Defense-in-depth: the dashboard list
    // already hides expired leads, this guard catches bookmarks / stale UI.
    const { data: quoteForDate } = await supabase
      .from("quote_requests")
      .select("move_date, move_date_extended_to")
      .eq("id", distribution.quote_request_id)
      .single();
    const quote = quoteForDate as {
      move_date: string | null;
      move_date_extended_to: string | null;
    } | null;
    const cutoff = quote?.move_date_extended_to || quote?.move_date;
    const todayIso = new Date().toISOString().slice(0, 10);
    if (cutoff && cutoff < todayIso) {
      return NextResponse.json(
        { error: "Ce lead n'est plus disponible (date dépassée)" },
        { status: 410 }
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

    // Wallet-first: consume whatever is available on the wallet. If the
    // balance covers the full price, skip Mollie entirely. If it covers
    // part, reserve that portion on the Mollie metadata — the webhook will
    // atomically debit the wallet + charge the card for the remainder.
    const walletBalance = await getWalletBalanceCents(supabase, company.id);
    if (walletBalance >= distribution.price_cents) {
      await supabase
        .from("quote_distributions")
        .update({ status: "unlocked", unlocked_at: new Date().toISOString() })
        .eq("id", distributionId);

      await debitWallet(supabase, {
        companyId: company.id,
        amountCents: distribution.price_cents,
        reason: "Achat lead (portefeuille)",
        quoteDistributionId: distributionId,
      });

      const { data: txn } = await supabase
        .from("transactions")
        .insert({
          company_id: company.id,
          quote_distribution_id: distributionId,
          amount_cents: distribution.price_cents,
          wallet_debit_cents: distribution.price_cents,
          type: "unlock",
          status: "paid",
          description: "Achat lead (portefeuille)",
        })
        .select()
        .single();

      if (txn) {
        const { data: companyInfo } = await supabase
          .from("companies")
          .select("name, siret, address, city, postal_code, email_billing, email_contact")
          .eq("id", company.id)
          .single();
        if (companyInfo) {
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

      if (company.account_status !== "active") {
        await supabase
          .from("companies")
          .update({ account_status: "active" })
          .eq("id", company.id);
      }

      const { count: totalAfterWallet } = await supabase
        .from("quote_distributions")
        .select("id", { count: "exact", head: true })
        .eq("quote_request_id", distribution.quote_request_id)
        .eq("status", "unlocked");
      if ((totalAfterWallet || 0) >= MAX_UNLOCKS_PER_LEAD) {
        const { data: finishedQuote } = await supabase
          .from("quote_requests")
          .update({ status: "completed" })
          .eq("id", distribution.quote_request_id)
          .neq("status", "completed")
          .select("id, prospect_id, from_city, to_city")
          .maybeSingle();
        if (finishedQuote) {
          await notifyAdminLeadCompleted(
            finishedQuote.id,
            finishedQuote.prospect_id || finishedQuote.id.slice(0, 8),
            finishedQuote.from_city || "",
            finishedQuote.to_city || ""
          ).catch((err) => console.error("[unlock wallet] lead-completed notify:", err));
        }
      }

      return NextResponse.json({ success: true, paidFromWallet: true });
    }

    // Partial wallet coverage: wallet covers `walletBalance`, card covers the
    // remainder. Wallet is debited atomically by the Mollie webhook on 'paid'
    // so a card failure never consumes the credit.
    const walletReservation =
      walletBalance > 0 && walletBalance < distribution.price_cents
        ? walletBalance
        : 0;
    const cardChargeCents = distribution.price_cents - walletReservation;

    // ALL unlocks require payment
    // If Mollie is not configured, use test mode
    if (!process.env.MOLLIE_API_KEY) {
      // TEST MODE — simulate instant unlock (applies wallet portion too)
      await supabase
        .from("quote_distributions")
        .update({ status: "unlocked", unlocked_at: new Date().toISOString() })
        .eq("id", distributionId);

      if (walletReservation > 0) {
        await debitWallet(supabase, {
          companyId: company.id,
          amountCents: walletReservation,
          reason: "Achat lead (portefeuille partiel)",
          quoteDistributionId: distributionId,
        }).catch((err) => console.error("[Unlock test] wallet debit failed:", err));
      }

      const { data: txn } = await supabase.from("transactions").insert({
        company_id: company.id,
        quote_distribution_id: distributionId,
        amount_cents: distribution.price_cents,
        wallet_debit_cents: walletReservation,
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
      if (company.account_status !== "active") {
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
        const { data: finishedQuote } = await supabase
          .from("quote_requests")
          .update({ status: "completed" })
          .eq("id", distribution.quote_request_id)
          .neq("status", "completed")
          .select("id, prospect_id, from_city, to_city")
          .maybeSingle();
        if (finishedQuote) {
          await notifyAdminLeadCompleted(
            finishedQuote.id,
            finishedQuote.prospect_id || finishedQuote.id.slice(0, 8),
            finishedQuote.from_city || "",
            finishedQuote.to_city || ""
          ).catch((err) => console.error("[unlock test] lead-completed notify:", err));
        }
      }

      return NextResponse.json({ success: true, testMode: true });
    }

    // PRODUCTION — Create Mollie payment for the card portion only. Wallet
    // reservation is debited by the webhook on success.
    const payment = await createLeadPayment({
      amountCents: cardChargeCents,
      companyId: company.id,
      distributionId,
      walletReservationCents: walletReservation,
      fullPriceCents: distribution.price_cents,
      description:
        walletReservation > 0
          ? `Complément achat lead (${(walletReservation / 100).toFixed(2)} € portefeuille + ${(cardChargeCents / 100).toFixed(2)} € carte)`
          : undefined,
    });

    // Record pending transaction with the FULL price + wallet portion reserved.
    await supabase.from("transactions").insert({
      company_id: company.id,
      quote_distribution_id: distributionId,
      mollie_payment_id: payment.id,
      amount_cents: distribution.price_cents,
      wallet_debit_cents: walletReservation,
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
