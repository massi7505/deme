import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhook,
  mapDiditStatus,
  type DiditWebhookPayload,
} from "@/lib/didit";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { notifyKycApproved } from "@/lib/onesignal";
import { sendKycApprovedEmail, sendKycRejectedEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Accept either header name — didit has shipped both across versions.
  const signatureHeader =
    request.headers.get("x-signature-v2") ??
    request.headers.get("x-signature") ??
    request.headers.get("X-Signature");
  const timestampHeader =
    request.headers.get("x-timestamp") ?? request.headers.get("X-Timestamp");

  let payload: DiditWebhookPayload;
  try {
    payload = verifyWebhook({
      rawBody,
      signatureHeader,
      timestampHeader,
    });
  } catch (err) {
    console.warn(
      "[didit webhook] verification failed:",
      (err as Error).message,
      "headers:",
      JSON.stringify(Object.fromEntries(request.headers.entries()))
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const companyId = payload.vendor_data;
  if (!companyId) {
    return NextResponse.json({ error: "Missing vendor_data" }, { status: 400 });
  }

  const newStatus = mapDiditStatus(payload.status);
  const supabase = createUntypedAdminClient();

  if (newStatus === "approved") {
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

    await notifyKycApproved(companyId).catch((e) =>
      console.error("[didit webhook] OneSignal error:", e)
    );

    const { data: approved } = await supabase
      .from("companies")
      .select("name, email_contact")
      .eq("id", companyId)
      .single();
    if (approved?.email_contact) {
      await sendKycApprovedEmail(approved.email_contact, approved.name).catch(
        (e) => console.error("[didit webhook] KYC approved email error:", e)
      );
    }
  } else if (newStatus === "rejected") {
    const rejectReason =
      (payload.decision?.reject_reason as string | undefined) ?? "Non spécifié";

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

    const { data: rejected } = await supabase
      .from("companies")
      .select("name, email_contact")
      .eq("id", companyId)
      .single();
    if (rejected?.email_contact) {
      await sendKycRejectedEmail(
        rejected.email_contact,
        rejected.name,
        rejectReason
      ).catch((e) =>
        console.error("[didit webhook] KYC rejected email error:", e)
      );
    }
  } else if (newStatus === "in_review") {
    await supabase
      .from("companies")
      .update({ kyc_status: "in_review" })
      .eq("id", companyId);
  }

  return NextResponse.json({ received: true });
}
