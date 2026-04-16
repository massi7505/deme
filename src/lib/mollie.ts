import createMollieClient from "@mollie/api-client";

function getMollie() {
  return createMollieClient({
    apiKey: process.env.MOLLIE_API_KEY!,
  });
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
  const payment = await mollie.payments.create({
    amount: {
      currency: "EUR",
      value: (amountCents / 100).toFixed(2),
    },
    description:
      description ?? `Déverrouillage demande #${distributionId}`,
    redirectUrl: `${process.env.NEXT_PUBLIC_URL}/demandes-de-devis/${distributionId}?payment=success`,
    webhookUrl: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/mollie`,
    metadata: {
      companyId,
      distributionId,
      type: "lead_unlock",
    },
  });

  return payment;
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
    webhookUrl: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/mollie`,
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
