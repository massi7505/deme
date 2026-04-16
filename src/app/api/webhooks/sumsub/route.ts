import { NextRequest, NextResponse } from "next/server";
import {
  verifySumsubWebhook,
  type SumsubWebhookPayload,
} from "@/lib/sumsub";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { notifyKycApproved } from "@/lib/onesignal";
import { sendKycApprovedEmail, sendKycRejectedEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-payload-digest") ?? "";

    // Verify webhook signature
    if (!verifySumsubWebhook(body, signature)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const payload: SumsubWebhookPayload = JSON.parse(body);
    const supabase = createUntypedAdminClient();

    // The externalUserId is the company ID
    const companyId = payload.externalUserId;

    switch (payload.type) {
      case "applicantReviewed": {
        const reviewAnswer = payload.reviewResult?.reviewAnswer;

        if (reviewAnswer === "GREEN") {
          // KYC approved
          await supabase
            .from("companies")
            .update({
              kyc_status: "approved",
              is_verified: true,
              account_status: "active",
            })
            .eq("id", companyId);

          await supabase.from("notifications").insert({
            company_id: companyId,
            type: "kyc_approved",
            title: "Vérification approuvée",
            body: "Votre identité a été vérifiée avec succès. Votre compte est maintenant actif.",
          });

          await notifyKycApproved(companyId);

          // Send KYC approved email
          const { data: approvedCompany } = await supabase
            .from("companies")
            .select("name, email_contact")
            .eq("id", companyId)
            .single();
          if (approvedCompany?.email_contact) {
            await sendKycApprovedEmail(approvedCompany.email_contact, approvedCompany.name)
              .catch((err) => console.error("KYC approved email error:", err));
          }
        } else if (reviewAnswer === "RED") {
          // KYC rejected
          const rejectReason =
            payload.reviewResult?.rejectLabels?.join(", ") ?? "Non spécifié";

          await supabase
            .from("companies")
            .update({ kyc_status: "rejected" })
            .eq("id", companyId);

          await supabase.from("notifications").insert({
            company_id: companyId,
            type: "kyc_rejected",
            title: "Vérification refusée",
            body: `Votre vérification a été refusée : ${rejectReason}. Veuillez réessayer.`,
          });

          // Send KYC rejected email
          const { data: rejectedCompany } = await supabase
            .from("companies")
            .select("name, email_contact")
            .eq("id", companyId)
            .single();
          if (rejectedCompany?.email_contact) {
            await sendKycRejectedEmail(rejectedCompany.email_contact, rejectedCompany.name, rejectReason)
              .catch((err) => console.error("KYC rejected email error:", err));
          }
        }
        break;
      }

      case "applicantPending": {
        await supabase
          .from("companies")
          .update({ kyc_status: "in_review" })
          .eq("id", companyId);
        break;
      }

      case "applicantCreated": {
        await supabase
          .from("companies")
          .update({ sumsub_applicant_id: payload.applicantId })
          .eq("id", companyId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Sumsub webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
