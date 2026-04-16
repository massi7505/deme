import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/mollie";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { generateInvoice } from "@/lib/invoice";
import { notifyPaymentSuccess } from "@/lib/onesignal";
import { formatPrice } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const paymentId = body.get("id") as string;

    if (!paymentId) {
      return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
    }

    const payment = await getPayment(paymentId);
    const metadata = payment.metadata as {
      companyId: string;
      distributionId: string;
      type: string;
    };

    const supabase = createUntypedAdminClient();

    if (payment.status === "paid" && metadata.type === "lead_unlock") {
      // 1. Update distribution status
      await supabase
        .from("quote_distributions")
        .update({
          status: "unlocked",
          unlocked_at: new Date().toISOString(),
        })
        .eq("id", metadata.distributionId);

      // 2. Create transaction record
      const { data: transaction } = await supabase
        .from("transactions")
        .insert({
          company_id: metadata.companyId,
          quote_distribution_id: metadata.distributionId,
          mollie_payment_id: paymentId,
          amount_cents: Math.round(parseFloat(payment.amount.value) * 100),
          currency: payment.amount.currency,
          type: "lead_purchase",
          status: "paid",
        })
        .select()
        .single();

      // 3. Get company info for invoice
      const { data: company } = await supabase
        .from("companies")
        .select("name, siret, address, city, postal_code")
        .eq("id", metadata.companyId)
        .single();

      // 4. Generate invoice
      if (transaction && company) {
        const invoice = await generateInvoice({
          transactionId: transaction.id,
          companyId: metadata.companyId,
          companyName: company.name,
          companySiret: company.siret ?? "",
          companyAddress: company.address ?? "",
          companyCity: company.city ?? "",
          companyPostalCode: company.postal_code ?? "",
          description: `Déverrouillage demande de devis`,
          amountCents: transaction.amount_cents,
        });

        // 5. Notify mover
        await notifyPaymentSuccess(
          metadata.companyId,
          formatPrice(transaction.amount_cents),
          invoice.invoiceNumber
        );
      }

      // 6. Check if lead reached max 6 unlocks → mark as completed
      const { data: dist } = await supabase
        .from("quote_distributions")
        .select("quote_request_id")
        .eq("id", metadata.distributionId)
        .single();

      if (dist) {
        const { count } = await supabase
          .from("quote_distributions")
          .select("id", { count: "exact", head: true })
          .eq("quote_request_id", dist.quote_request_id)
          .eq("status", "unlocked");

        if ((count || 0) >= 6) {
          await supabase
            .from("quote_requests")
            .update({ status: "completed" })
            .eq("id", dist.quote_request_id);
        }
      }

      // 7. First purchase → activate account permanently
      const { data: companyCheck } = await supabase
        .from("companies")
        .select("account_status")
        .eq("id", metadata.companyId)
        .single();

      if (companyCheck?.account_status === "trial") {
        await supabase
          .from("companies")
          .update({ account_status: "active" })
          .eq("id", metadata.companyId);
      }

      // 8. Create notification
      await supabase.from("notifications").insert({
        company_id: metadata.companyId,
        type: "payment_success",
        title: "Paiement confirmé",
        body: "Le déverrouillage de la demande a été confirmé.",
        data: { distributionId: metadata.distributionId, paymentId },
      });
    }

    if (payment.status === "failed") {
      await supabase
        .from("transactions")
        .insert({
          company_id: metadata.companyId,
          quote_distribution_id: metadata.distributionId,
          mollie_payment_id: paymentId,
          amount_cents: Math.round(parseFloat(payment.amount.value) * 100),
          type: "lead_purchase",
          status: "failed",
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Mollie webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
