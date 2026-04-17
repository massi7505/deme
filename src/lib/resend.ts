import { Resend } from "resend";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_EMAIL_TEMPLATES } from "@/components/admin/settings/types";
import { BRAND } from "@/lib/brand";

export function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
}

const FROM = BRAND.emailFrom;

const ADMIN_EMAIL = BRAND.adminEmail || BRAND.contactEmail;

/** Read site name from DB settings */
async function getSiteName(): Promise<string> {
  try {
    const supabase = createUntypedAdminClient();
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).single();
    return (data?.data as Record<string, string>)?.siteName || BRAND.siteName;
  } catch {
    return BRAND.siteName;
  }
}

/** Publicly reachable URL for links in emails */
function emailBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_URL;
  if (url && !url.includes("localhost")) return url;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return url || "http://localhost:3000";
}

/** Replace {{variable}} placeholders with values */
function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

/** Fetch a custom template from site_settings, fall back to built-in default */
async function getTemplate(key: string): Promise<{ subject: string; body: string }> {
  try {
    const supabase = createUntypedAdminClient();
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).single();
    const custom = (data?.data as Record<string, unknown>)?.emailTemplates as Record<string, { subject: string; body: string }> | undefined;
    if (custom?.[key]) return custom[key];
  } catch {
    // DB error — fall through to default
  }
  return DEFAULT_EMAIL_TEMPLATES[key] || { subject: "", body: "" };
}

/** Send an email using a stored/default template with variable substitution */
async function sendTemplated(
  key: string,
  to: string,
  vars: Record<string, string>
) {
  const [tpl, siteName] = await Promise.all([getTemplate(key), getSiteName()]);
  const allVars = { ...vars, baseUrl: emailBaseUrl(), siteName };
  const subject = replaceVars(tpl.subject, allVars);
  const body = replaceVars(tpl.body, allVars);
  return getResend().emails.send({ from: FROM, to, subject, html: body });
}

export async function sendQuoteConfirmation(to: string, clientName: string, fromCity: string, toCity: string, prospectId: string) {
  return sendTemplated("quoteConfirmation", to, { clientName, fromCity, toCity, prospectId });
}

export async function sendNewLeadNotification(to: string, companyName: string, fromCity: string, toCity: string, leadId: string) {
  return sendTemplated("newLead", to, { companyName, fromCity, toCity, leadId });
}

export async function sendWelcomeEmail(to: string, companyName: string) {
  return sendTemplated("welcome", to, { companyName });
}

export async function sendContactForm(name: string, email: string, subject: string, message: string) {
  // Contact form stays hardcoded — not a template the admin needs to edit
  return getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `[Contact] ${subject} - ${name}`,
    html: `<div style="font-family:system-ui,sans-serif"><h2>Nouveau message de contact</h2><p><strong>Nom :</strong> ${name}</p><p><strong>Email :</strong> ${email}</p><p><strong>Sujet :</strong> ${subject}</p><hr/><p>${message.replace(/\n/g, "<br />")}</p></div>`,
  });
}

export async function sendInvoiceEmail(to: string, companyName: string, invoiceNumber: string, amountCents: number, description: string) {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  return sendTemplated("invoice", to, { companyName, amount, invoiceNumber, description });
}

export async function sendPaymentFailedEmail(to: string, companyName: string, amountCents: number, dateTime: string) {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  return sendTemplated("paymentFailed", to, { companyName, amount, dateTime });
}

export async function sendKycApprovedEmail(to: string, companyName: string) {
  return sendTemplated("kycApproved", to, { companyName });
}

export async function sendKycRejectedEmail(to: string, companyName: string, reason: string) {
  return sendTemplated("kycRejected", to, { companyName, reason });
}

export async function sendClaimReceivedEmail(to: string, companyName: string, reason: string, claimId: string) {
  return sendTemplated("claimReceived", to, { companyName, reason, claimRef: claimId.slice(0, 8).toUpperCase() });
}

export async function notifyAdminNewClaim(companyName: string, reason: string, claimId: string) {
  return sendTemplated("adminNewClaim", ADMIN_EMAIL, { companyName, reason, claimRef: claimId.slice(0, 8).toUpperCase() });
}

export async function sendClaimResolvedEmail(to: string, companyName: string, status: "approved" | "rejected" | "refunded", reason: string) {
  const labels: Record<string, { label: string; color: string; bg: string }> = {
    approved: { label: "Approuvée", color: "#16a34a", bg: "#f0fdf4" },
    rejected: { label: "Rejetée", color: "#dc2626", bg: "#fef2f2" },
    refunded: { label: "Remboursée", color: "#2563eb", bg: "#eff6ff" },
  };
  const s = labels[status] || labels.approved;
  return sendTemplated("claimResolved", to, { companyName, reason, statusLabel: s.label, statusColor: s.color, statusBg: s.bg });
}

export async function sendRefundEmail(to: string, companyName: string, amountCents: number) {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  return sendTemplated("refund", to, { companyName, amount });
}

export async function notifyAdminPaymentSuccess(companyName: string, amountCents: number, invoiceNumber: string) {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  return sendTemplated("adminPaymentSuccess", ADMIN_EMAIL, { companyName, amount, invoiceNumber });
}

export async function notifyAdminPaymentFailed(companyName: string, amountCents: number, dateTime: string) {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  return sendTemplated("adminPaymentFailed", ADMIN_EMAIL, { companyName, amount, dateTime });
}

export async function sendPasswordResetEmail(to: string, otpCode: string, expiryMinutes: number) {
  return sendTemplated("passwordReset", to, {
    otpCode,
    expiryMinutes: String(expiryMinutes),
  });
}

export async function sendQuoteVerificationEmail(
  to: string,
  clientName: string,
  otpCode: string,
  expiryMinutes: number,
  verifyUrl: string
) {
  return sendTemplated("quoteVerification", to, {
    clientName,
    otpCode,
    expiryMinutes: String(expiryMinutes),
    verifyUrl,
  });
}

export async function notifyAdminDistributionFailed(
  quoteId: string,
  clientName: string,
  fromCity: string,
  toCity: string,
  errorMessage: string
) {
  return sendTemplated("adminDistributionFailed", ADMIN_EMAIL, {
    quoteId,
    clientName,
    fromCity,
    toCity,
    errorMessage,
  });
}
