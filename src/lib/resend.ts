import { Resend } from "resend";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_EMAIL_TEMPLATES } from "@/components/admin/settings/types";
import { BRAND } from "@/lib/brand";
import { emailShell } from "@/lib/email-layout";

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

/** Send an email using a stored/default template with variable substitution.
 *  Templates that are "inner only" (no <html> / <!DOCTYPE>) get wrapped in
 *  the shared shell. Legacy templates that already contain a full document
 *  are passed through unchanged for backward compat. */
async function sendTemplated(
  key: string,
  to: string,
  vars: Record<string, string>
) {
  const [tpl, siteName] = await Promise.all([getTemplate(key), getSiteName()]);
  const baseUrl = emailBaseUrl();
  const allVars = { ...vars, baseUrl, siteName };
  const subject = replaceVars(tpl.subject, allVars);
  const bodyRaw = replaceVars(tpl.body, allVars);
  const isFullDoc = /<!DOCTYPE|<html/i.test(bodyRaw);
  const html = isFullDoc ? bodyRaw : emailShell(bodyRaw, { siteName, baseUrl });
  return getResend().emails.send({ from: FROM, to, subject, html });
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

export async function sendReviewReminderEmail(
  to: string,
  clientFirstName: string,
  companyName: string,
  token: string
) {
  const baseUrl = emailBaseUrl();
  const link = `${baseUrl}/avis/${token}`;
  const siteName = await getSiteName();
  const greeting = clientFirstName ? `Bonjour ${clientFirstName},` : "Bonjour,";
  const subject = `Un petit rappel — votre avis sur ${companyName} ?`;
  const body = `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
  <h1 style="font-size: 20px; margin: 0 0 16px;">${greeting}</h1>
  <p style="line-height: 1.6; margin: 0 0 16px;">
    Il y a deux semaines, <strong>${companyName}</strong> s'est occupé de votre déménagement. Nous vous avions envoyé un lien pour laisser un avis.
  </p>
  <p style="line-height: 1.6; margin: 0 0 24px;">
    Si vous avez <strong>30 secondes</strong>, votre retour aidera les prochains clients à choisir — et aidera ${companyName} à s'améliorer si quelque chose s'est mal passé.
  </p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${link}" style="display: inline-block; background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
      Laisser mon avis
    </a>
  </p>
  <p style="line-height: 1.6; margin: 0 0 8px; color: #666; font-size: 13px;">
    Ou copiez-collez ce lien dans votre navigateur :<br>
    <span style="color: #22c55e; word-break: break-all;">${link}</span>
  </p>
  <p style="line-height: 1.6; margin: 24px 0 0; color: #999; font-size: 12px;">
    Ce lien expire dans 15 jours. C'est notre dernier rappel — vous ne serez plus sollicité après.
  </p>
  <p style="margin: 24px 0 0; color: #999; font-size: 12px;">— L'équipe ${siteName}</p>
</body></html>`;
  return getResend().emails.send({ from: FROM, to, subject, html: body });
}

export async function sendReviewRequestEmail(
  to: string,
  clientFirstName: string,
  companyName: string,
  token: string
) {
  const baseUrl = emailBaseUrl();
  const link = `${baseUrl}/avis/${token}`;
  const siteName = await getSiteName();
  const greeting = clientFirstName ? `Bonjour ${clientFirstName},` : "Bonjour,";
  const subject = `Votre avis sur ${companyName} compte pour d'autres clients`;
  const body = `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
  <h1 style="font-size: 20px; margin: 0 0 16px;">${greeting}</h1>
  <p style="line-height: 1.6; margin: 0 0 16px;">
    Il y a environ une semaine, <strong>${companyName}</strong> s'est occupé de votre déménagement via ${siteName}.
  </p>
  <p style="line-height: 1.6; margin: 0 0 24px;">
    Votre retour aide les prochains clients à faire le bon choix. Cela ne prend que <strong>30 secondes</strong>.
  </p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="${link}" style="display: inline-block; background: #22c55e; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
      Laisser mon avis
    </a>
  </p>
  <p style="line-height: 1.6; margin: 0 0 8px; color: #666; font-size: 13px;">
    Ou copiez-collez ce lien dans votre navigateur :<br>
    <span style="color: #22c55e; word-break: break-all;">${link}</span>
  </p>
  <p style="line-height: 1.6; margin: 24px 0 0; color: #999; font-size: 12px;">
    Ce lien est personnel et expire dans 30 jours. Vous pouvez l'ignorer si vous ne souhaitez pas laisser d'avis.
  </p>
  <p style="margin: 24px 0 0; color: #999; font-size: 12px;">— L'équipe ${siteName}</p>
</body></html>`;
  return getResend().emails.send({ from: FROM, to, subject, html: body });
}

export async function sendWalletRefundEmail(
  to: string,
  companyName: string,
  amountCents: number,
  expiresAt: string,
  balanceCents: number
) {
  const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  const amount = fmt.format(amountCents / 100);
  const balance = fmt.format(balanceCents / 100);
  const expiryDate = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(expiresAt));
  return sendTemplated("walletRefund", to, { companyName, amount, expiryDate, balance });
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

export async function notifyAdminPhotoPending(
  companyName: string,
  companyId: string,
  photoUrl: string
) {
  const html = `<div style="font-family:system-ui,sans-serif;padding:24px;max-width:560px">
    <h2 style="margin:0 0 12px">Nouvelle photo à modérer</h2>
    <p style="margin:0 0 8px;color:#555"><strong>${companyName}</strong> vient d'uploader une photo qui attend votre validation.</p>
    <div style="margin:16px 0">
      <img src="${photoUrl}" alt="" style="max-width:100%;max-height:260px;border-radius:8px;border:1px solid #e5e7eb" />
    </div>
    <a href="${emailBaseUrl()}/admin/companies"
       style="display:inline-block;padding:10px 18px;background:#16a34a;color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">
      Ouvrir la modération
    </a>
    <p style="margin:16px 0 0;font-size:11px;color:#999">ID déménageur : ${companyId}</p>
  </div>`;
  return getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `[Photo à modérer] ${companyName}`,
    html,
  });
}

export async function notifyAdminLeadCompleted(
  quoteId: string,
  prospectId: string,
  fromCity: string,
  toCity: string
) {
  // Inline template: this is a notice to admin only, no need for DB override.
  const route = `${fromCity || "?"} → ${toCity || "?"}`;
  const html = `<div style="font-family:system-ui,sans-serif;padding:24px;max-width:560px">
    <h2 style="margin:0 0 12px">Lead terminé — 6 acheteurs atteints</h2>
    <p style="margin:0 0 8px;color:#555">Le lead <strong>${prospectId}</strong> a été vendu 6 fois. Il est désormais masqué du marketplace des déménageurs.</p>
    <ul style="margin:8px 0 16px;padding-left:20px;color:#333">
      <li><strong>Trajet :</strong> ${route}</li>
      <li><strong>Référence interne :</strong> ${quoteId}</li>
    </ul>
    <p style="margin:0;font-size:12px;color:#888">Ce message est automatique.</p>
  </div>`;
  return getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `[Lead terminé] ${prospectId} — ${route}`,
    html,
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
