const ONESIGNAL_API_URL = "https://onesignal.com/api/v1";

async function onesignalFetch(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${ONESIGNAL_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: process.env.ONESIGNAL_APP_ID,
      ...body,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OneSignal API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function notifyNewLead(
  companyId: string,
  leadData: {
    id: string;
    fromCity: string;
    toCity: string;
    moveDate?: string;
  }
) {
  return onesignalFetch("/notifications", {
    filters: [
      { field: "tag", key: "company_id", value: companyId },
    ],
    headings: { fr: "Nouvelle demande de devis !" },
    contents: {
      fr: `${leadData.fromCity} \→ ${leadData.toCity}${
        leadData.moveDate ? ` le ${leadData.moveDate}` : ""
      }`,
    },
    data: { type: "new_lead", leadId: leadData.id },
    url: `${process.env.NEXT_PUBLIC_URL}/demandes-de-devis/${leadData.id}`,
  });
}

export async function notifyPaymentSuccess(
  companyId: string,
  amount: string,
  invoiceNumber: string
) {
  return onesignalFetch("/notifications", {
    filters: [
      { field: "tag", key: "company_id", value: companyId },
    ],
    headings: { fr: "Paiement confirmé" },
    contents: {
      fr: `Votre paiement de ${amount} a été confirmé. Facture ${invoiceNumber}.`,
    },
    data: { type: "payment_success", invoiceNumber },
    url: `${process.env.NEXT_PUBLIC_URL}/facturation`,
  });
}

export async function notifyKycApproved(companyId: string) {
  return onesignalFetch("/notifications", {
    filters: [
      { field: "tag", key: "company_id", value: companyId },
    ],
    headings: { fr: "Vérification approuvée !" },
    contents: {
      fr: "Votre identité a été vérifiée. Votre compte est maintenant actif.",
    },
    data: { type: "kyc_approved" },
    url: `${process.env.NEXT_PUBLIC_URL}/apercu`,
  });
}

export async function notifyClaimResolved(
  companyId: string,
  claimId: string,
  status: "approved" | "rejected"
) {
  const statusText =
    status === "approved" ? "approuvée (remboursement en cours)" : "rejetée";

  return onesignalFetch("/notifications", {
    filters: [
      { field: "tag", key: "company_id", value: companyId },
    ],
    headings: { fr: "Réclamation traitée" },
    contents: {
      fr: `Votre réclamation a été ${statusText}.`,
    },
    data: { type: "claim_resolved", claimId, status },
  });
}
