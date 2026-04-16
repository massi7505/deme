import { NextRequest, NextResponse } from "next/server";
import { getPayment } from "@/lib/mollie";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { generateInvoice } from "@/lib/invoice";
import { notifyPaymentSuccess } from "@/lib/onesignal";
import { sendInvoiceEmail, sendPaymentFailedEmail, notifyAdminPaymentSuccess, notifyAdminPaymentFailed } from "@/lib/resend";
import { formatPrice } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    // Mollie sends form-encoded body with "id" field
    let paymentId: string | null = null;
    try {
      const body = await request.formData();
      paymentId = body.get("id") as string;
    } catch {
      // Dashboard test or JSON payload — acknowledge it
      return NextResponse.json({ received: true });
    }

    if (!paymentId) {
      // No payment ID — likely a Dashboard webhook test
      return NextResponse.json({ received: true });
    }

    let payment;
    try {
      payment = await getPayment(paymentId);
    } catch (err) {
      // Invalid or test payment ID — acknowledge without error
      console.warn("Mollie webhook: cannot fetch payment", paymentId, err);
      return NextResponse.json({ received: true });
    }

    const metadata = payment.metadata as {
      companyId: string;
      distributionId: string;
      type: string;
    };

    if (!metadata?.companyId || !metadata?.distributionId) {
      // Payment without our metadata — acknowledge
      return NextResponse.json({ received: true });
    }

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

      // 2. Update pending transaction (created at payment initiation) or insert if missing
      const amountCentsPaid = Math.round(parseFloat(payment.amount.value) * 100);
      const { data: updatedTxn } = await supabase
        .from("transactions")
        .update({
          status: "paid",
          amount_cents: amountCentsPaid,
          currency: payment.amount.currency,
        })
        .eq("mollie_payment_id", paymentId)
        .select()
        .single();

      let transaction = updatedTxn;
      if (!transaction) {
        const { data: newTxn } = await supabase
          .from("transactions")
          .insert({
            company_id: metadata.companyId,
            quote_distribution_id: metadata.distributionId,
            mollie_payment_id: paymentId,
            amount_cents: amountCentsPaid,
            currency: payment.amount.currency,
            type: "lead_purchase",
            status: "paid",
          })
          .select()
          .single();
        transaction = newTxn;
      }

      // 3. Get company info for invoice
      const { data: company } = await supabase
        .from("companies")
        .select("name, siret, address, city, postal_code, email_billing, email_contact")
        .eq("id", metadata.companyId)
        .single();

      // 4. Generate invoice + send email (wrapped so a PDF error won't break the webhook)
      if (transaction && company) {
        const description = "Déverrouillage demande de devis";
        try {
          const invoice = await generateInvoice({
            transactionId: transaction.id,
            companyId: metadata.companyId,
            companyName: company.name,
            companySiret: company.siret ?? "",
            companyAddress: company.address ?? "",
            companyCity: company.city ?? "",
            companyPostalCode: company.postal_code ?? "",
            description,
            amountCents: transaction.amount_cents,
          });

          // 5. Notify mover (push)
          await notifyPaymentSuccess(
            metadata.companyId,
            formatPrice(transaction.amount_cents),
            invoice.invoiceNumber
          ).catch(() => {});

          // 6. Send invoice email
          const emailTo = company.email_billing || company.email_contact;
          if (emailTo) {
            await sendInvoiceEmail(
              emailTo,
              company.name,
              invoice.invoiceNumber,
              transaction.amount_cents,
              description
            ).catch((err) => console.error("Invoice email error:", err));
          }
        } catch (invoiceErr) {
          console.error("Invoice generation failed:", invoiceErr);
        }
      }

      // 6b. Notify admin
      if (company) {
        await notifyAdminPaymentSuccess(
          company.name,
          transaction?.amount_cents || amountCentsPaid,
          transaction?.invoice_number || "—"
        ).catch((err) => console.error("Admin notification error:", err));
      }

      // 7. Check if lead reached max 6 unlocks → mark as completed
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

      // 8. First purchase → activate account permanently
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

      // 9. Create notification
      await supabase.from("notifications").insert({
        company_id: metadata.companyId,
        type: "payment_success",
        title: "Paiement confirmé",
        body: "Le déverrouillage de la demande a été confirmé.",
        data: { distributionId: metadata.distributionId, paymentId },
      });
    }

    if (payment.status === "failed") {
      const now = new Date();
      const dateTime = new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(now);

      const amountCents = Math.round(parseFloat(payment.amount.value) * 100);

      // Update pending transaction or insert if missing
      const { data: updatedFailed } = await supabase
        .from("transactions")
        .update({ status: "failed", amount_cents: amountCents })
        .eq("mollie_payment_id", paymentId)
        .select()
        .single();

      if (!updatedFailed) {
        await supabase.from("transactions").insert({
          company_id: metadata.companyId,
          quote_distribution_id: metadata.distributionId,
          mollie_payment_id: paymentId,
          amount_cents: amountCents,
          type: "lead_purchase",
          status: "failed",
        });
      }

      // Send failure email
      const { data: company } = await supabase
        .from("companies")
        .select("name, email_billing, email_contact")
        .eq("id", metadata.companyId)
        .single();

      if (company) {
        const emailTo = company.email_billing || company.email_contact;
        if (emailTo) {
          await sendPaymentFailedEmail(
            emailTo,
            company.name,
            amountCents,
            dateTime
          ).catch((err) => console.error("Failed payment email error:", err));
        }

        // Notify admin
        await notifyAdminPaymentFailed(
          company.name,
          amountCents,
          dateTime
        ).catch((err) => console.error("Admin failed notification error:", err));
      }

      // Create notification
      await supabase.from("notifications").insert({
        company_id: metadata.companyId,
        type: "payment_failed",
        title: "Échec de paiement",
        body: `Le paiement de ${formatPrice(amountCents)} a échoué le ${dateTime}.`,
        data: { distributionId: metadata.distributionId, paymentId },
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
