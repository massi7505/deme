import createMollieClient from "@mollie/api-client";

function getMollie() {
  return createMollieClient({
    apiKey: process.env.MOLLIE_API_KEY!,
  });
}

/** Return a publicly reachable base URL for Mollie webhooks / redirects. */
function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_URL;
  if (explicit && !explicit.includes("localhost")) return explicit;
  // Fallback: Vercel auto-provides VERCEL_URL (no protocol)
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return explicit || "http://localhost:3000";
}

export async function createLeadPayment({
  amountCents,
  companyId,
  distributionId,
  description,
}: {
  amountCents: number;
  companyId: string;
  distributionId: string;
  description?: string;
}) {
  const mollie = getMollie();
  const baseUrl = getBaseUrl();

  console.log("[Mollie] Creating payment with baseUrl:", baseUrl);

  const payment = await mollie.payments.create({
    amount: {
      currency: "EUR",
      value: (amountCents / 100).toFixed(2),
    },
    description:
      description ?? `Déverrouillage demande #${distributionId}`,
    redirectUrl: `${baseUrl}/demandes-de-devis/${distributionId}?payment=success`,
    webhookUrl: `${baseUrl}/api/webhooks/mollie`,
    metadata: {
      companyId,
      distributionId,
      type: "lead_unlock",
    },
  });

  // Extract checkout URL with multiple fallbacks (Mollie v4 compatibility)
  let checkoutUrl: string | null = null;
  try {
    checkoutUrl = payment.getCheckoutUrl();
  } catch {
    // getCheckoutUrl() may throw in some Mollie versions
  }
  if (!checkoutUrl) {
    // Fallback: access _links directly
    const links = (payment as unknown as Record<string, unknown>)._links as
      Record<string, { href?: string }> | undefined;
    checkoutUrl = links?.checkout?.href || null;
  }

  console.log("[Mollie] Payment created:", payment.id, "checkoutUrl:", checkoutUrl, "webhookUrl:", `${baseUrl}/api/webhooks/mollie`);

  return { ...payment, checkoutUrl };
}

export async function getPayment(paymentId: string) {
  return getMollie().payments.get(paymentId);
}

export async function refundPayment(
  paymentId: string,
  amountCents: number,
  description?: string
) {
  return getMollie().paymentRefunds.create({
    paymentId,
    amount: {
      currency: "EUR",
      value: (amountCents / 100).toFixed(2),
    },
    description: description ?? "Remboursement lead invalide",
  });
}

export async function createCustomer(
  name: string,
  email: string,
  companyId: string
) {
  return getMollie().customers.create({
    name,
    email,
    metadata: { companyId },
  });
}

export async function createSubscription({
  customerId,
  plan,
  amountCents,
  description,
  interval,
}: {
  customerId: string;
  plan: string;
  amountCents: number;
  description: string;
  interval: string;
}) {
  return getMollie().customerSubscriptions.create({
    customerId,
    amount: {
      currency: "EUR",
      value: (amountCents / 100).toFixed(2),
    },
    interval,
    description,
    metadata: { plan },
    webhookUrl: `${getBaseUrl()}/api/webhooks/mollie`,
  });
}

export async function cancelSubscription(
  customerId: string,
  subscriptionId: string
) {
  return getMollie().customerSubscriptions.cancel(subscriptionId, {
    customerId,
  });
}
