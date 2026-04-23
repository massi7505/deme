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

/** Escape user-controlled text before injecting into inline HTML templates. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  return sendTemplated("quoteConfirmation", to, {
    clientName: escapeHtml(clientName),
    fromCity: escapeHtml(fromCity),
    toCity: escapeHtml(toCity),
    prospectId,
  });
}

export async function sendNewLeadNotification(to: string, companyName: string, fromCity: string, toCity: string, leadId: string) {
  return sendTemplated("newLead", to, {
    companyName: escapeHtml(companyName),
    fromCity: escapeHtml(fromCity),
    toCity: escapeHtml(toCity),
    leadId,
  });
}

export async function sendWelcomeEmail(to: string, companyName: string) {
  return sendTemplated("welcome", to, { companyName: escapeHtml(companyName) });
}

export async function sendContactForm(name: string, email: string, subject: string, message: string) {
  // Contact form stays hardcoded — not a template the admin needs to edit.
  // Every field is user-controlled, so escape before interpolating.
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
  return getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `[Contact] ${subject} - ${name}`,
    html: `<div style="font-family:system-ui,sans-serif"><h2>Nouveau message de contact</h2><p><strong>Nom :</strong> ${safeName}</p><p><strong>Email :</strong> ${safeEmail}</p><p><strong>Sujet :</strong> ${safeSubject}</p><hr/><p>${safeMessage}</p></div>`,
  });
}

export async function sendInvoiceEmail(to: string, companyName: string, invoiceNumber: string, amountCents: number, description: string) {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  return sendTemplated("invoice", to, {
    companyName: escapeHtml(companyName),
    amount,
    invoiceNumber,
    description: escapeHtml(description),
  });
}

export async function sendPaymentFailedEmail(to: string, companyName: string, amountCents: number, dateTime: string) {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  return sendTemplated("paymentFailed", to, {
    companyName: escapeHtml(companyName),
    amount,
    dateTime,
  });
}

export async function sendKycApprovedEmail(to: string, companyName: string) {
  return sendTemplated("kycApproved", to, { companyName: escapeHtml(companyName) });
}

export async function sendKycRejectedEmail(to: string, companyName: string, reason: string) {
  return sendTemplated("kycRejected", to, {
    companyName: escapeHtml(companyName),
    reason: escapeHtml(reason),
  });
}

export async function sendClaimReceivedEmail(to: string, companyName: string, reason: string, claimId: string) {
  return sendTemplated("claimReceived", to, {
    companyName: escapeHtml(companyName),
    reason: escapeHtml(reason),
    claimRef: claimId.slice(0, 8).toUpperCase(),
  });
}

export async function notifyAdminNewClaim(companyName: string, reason: string, claimId: string) {
  return sendTemplated("adminNewClaim", ADMIN_EMAIL, {
    companyName: escapeHtml(companyName),
    reason: escapeHtml(reason),
    claimRef: claimId.slice(0, 8).toUpperCase(),
  });
}

export async function sendClaimResolvedEmail(to: string, companyName: string, status: "approved" | "rejected" | "refunded", reason: string) {
  const labels: Record<string, { label: string; color: string; bg: string }> = {
    approved: { label: "Approuvée", color: "#16a34a", bg: "#f0fdf4" },
    rejected: { label: "Rejetée", color: "#dc2626", bg: "#fef2f2" },
    refunded: { label: "Remboursée", color: "#2563eb", bg: "#eff6ff" },
  };
  const s = labels[status] || labels.approved;
  return sendTemplated("claimResolved", to, {
    companyName: escapeHtml(companyName),
    reason: escapeHtml(reason),
    statusLabel: s.label,
    statusColor: s.color,
    statusBg: s.bg,
  });
}

export async function sendRefundEmail(to: string, companyName: string, amountCents: number) {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  return sendTemplated("refund", to, { companyName: escapeHtml(companyName), amount });
}

export async function sendReviewReminderEmail(
  to: string,
  clientFirstName: string,
  companyName: string,
  token: string
) {
  const baseUrl = emailBaseUrl();
  const link = `${baseUrl}/avis/${token}`;
  const siteName = escapeHtml(await getSiteName());
  const safeFirstName = escapeHtml(clientFirstName);
  const safeCompanyName = escapeHtml(companyName);
  const greeting = clientFirstName ? `Bonjour ${safeFirstName},` : "Bonjour,";
  const subject = `Un petit rappel — votre avis sur ${companyName} ?`;
  const body = `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
  <h1 style="font-size: 20px; margin: 0 0 16px;">${greeting}</h1>
  <p style="line-height: 1.6; margin: 0 0 16px;">
    Il y a deux semaines, <strong>${safeCompanyName}</strong> s'est occupé de votre déménagement. Nous vous avions envoyé un lien pour laisser un avis.
  </p>
  <p style="line-height: 1.6; margin: 0 0 24px;">
    Si vous avez <strong>30 secondes</strong>, votre retour aidera les prochains clients à choisir — et aidera ${safeCompanyName} à s'améliorer si quelque chose s'est mal passé.
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
  const siteName = escapeHtml(await getSiteName());
  const safeFirstName = escapeHtml(clientFirstName);
  const safeCompanyName = escapeHtml(companyName);
  const greeting = clientFirstName ? `Bonjour ${safeFirstName},` : "Bonjour,";
  const subject = `Votre avis sur ${companyName} compte pour d'autres clients`;
  const body = `<!DOCTYPE html><html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
  <h1 style="font-size: 20px; margin: 0 0 16px;">${greeting}</h1>
  <p style="line-height: 1.6; margin: 0 0 16px;">
    Il y a environ une semaine, <strong>${safeCompanyName}</strong> s'est occupé de votre déménagement via ${siteName}.
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
  return sendTemplated("walletRefund", to, {
    companyName: escapeHtml(companyName),
    amount,
    expiryDate,
    balance,
  });
}

/**
 * Warn a mover that wallet credits are about to expire. The cron groups all
 * credit rows crossing the same threshold (30d or 7d) into one email per
 * mover so the inbox stays clean.
 */
export async function sendWalletExpiryWarningEmail(
  to: string,
  companyName: string,
  threshold: 7 | 30,
  credits: Array<{ amountCents: number; expiresAt: string }>
) {
  const totalCents = credits.reduce((s, c) => s + c.amountCents, 0);
  const totalAmount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(totalCents / 100);
  const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // SECURITY: creditLines is injected raw into the template (HTML pass-through).
  // Only deterministic formatters may feed it. If you add a field sourced from
  // user or DB text (e.g. a refund reason), escape it with escapeHtml first.
  const creditLines = credits
    .map((c) => {
      const amount = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
      }).format(c.amountCents / 100);
      const date = dateFormatter.format(new Date(c.expiresAt));
      return `<li style="margin-bottom:4px;"><strong>${amount}</strong> — expire le ${date}</li>`;
    })
    .join("");
  const thresholdLabel = threshold === 7 ? "7 jours" : "30 jours";
  return sendTemplated("walletExpiryWarning", to, {
    companyName: escapeHtml(companyName),
    thresholdLabel,
    totalAmount,
    creditLines,
  });
}

export async function notifyAdminPaymentSuccess(companyName: string, amountCents: number, invoiceNumber: string) {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  return sendTemplated("adminPaymentSuccess", ADMIN_EMAIL, {
    companyName: escapeHtml(companyName),
    amount,
    invoiceNumber,
  });
}

export async function notifyAdminPaymentFailed(companyName: string, amountCents: number, dateTime: string) {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  return sendTemplated("adminPaymentFailed", ADMIN_EMAIL, {
    companyName: escapeHtml(companyName),
    amount,
    dateTime,
  });
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
    clientName: escapeHtml(clientName),
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
  const safeName = escapeHtml(companyName);
  const html = `<div style="font-family:system-ui,sans-serif;padding:24px;max-width:560px">
    <h2 style="margin:0 0 12px">Nouvelle photo à modérer</h2>
    <p style="margin:0 0 8px;color:#555"><strong>${safeName}</strong> vient d'uploader une photo qui attend votre validation.</p>
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
  // fromCity / toCity are user-controlled (quote form). Escape before HTML.
  const safeFrom = escapeHtml(fromCity || "?");
  const safeTo = escapeHtml(toCity || "?");
  const safeRoute = `${safeFrom} → ${safeTo}`;
  const html = `<div style="font-family:system-ui,sans-serif;padding:24px;max-width:560px">
    <h2 style="margin:0 0 12px">Lead terminé — 6 acheteurs atteints</h2>
    <p style="margin:0 0 8px;color:#555">Le lead <strong>${prospectId}</strong> a été vendu 6 fois. Il est désormais masqué du marketplace des déménageurs.</p>
    <ul style="margin:8px 0 16px;padding-left:20px;color:#333">
      <li><strong>Trajet :</strong> ${safeRoute}</li>
      <li><strong>Référence interne :</strong> ${quoteId}</li>
    </ul>
    <p style="margin:0;font-size:12px;color:#888">Ce message est automatique.</p>
  </div>`;
  return getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `[Lead terminé] ${prospectId} — ${fromCity || "?"} → ${toCity || "?"}`,
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
    clientName: escapeHtml(clientName),
    fromCity: escapeHtml(fromCity),
    toCity: escapeHtml(toCity),
    errorMessage: escapeHtml(errorMessage),
  });
}
