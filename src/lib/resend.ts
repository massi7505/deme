import { Resend } from "resend";

export function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
}

const FROM = process.env.EMAIL_FROM ?? "Demenagement24 <noreply@demenagement24.com>";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "contact@demenagement24.fr";

/** Publicly reachable URL for links in emails */
function emailBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_URL;
  if (url && !url.includes("localhost")) return url;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return url || "http://localhost:3000";
}

export async function sendQuoteConfirmation(
  to: string,
  clientName: string,
  fromCity: string,
  toCity: string,
  prospectId: string
) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: "Votre demande de devis a bien été envoyée",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Bonjour ${clientName},</h2>
          <p>Votre demande de devis pour un déménagement de <strong>${fromCity}</strong> vers <strong>${toCity}</strong> a bien été enregistrée.</p>
          <p>Numéro de suivi : <strong>${prospectId}</strong></p>
          <p>Jusqu'à 6 déménageurs professionnels vous contacteront dans les prochaines 48 heures.</p>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <strong style="color: #16a34a;">Que se passe-t-il ensuite ?</strong>
            <ol style="margin: 8px 0 0; padding-left: 20px; color: #374151;">
              <li>Les déménageurs de votre région reçoivent votre demande</li>
              <li>Ils vous contactent avec leur devis personnalisé</li>
              <li>Vous comparez et choisissez librement</li>
            </ol>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Ce service est entièrement gratuit et sans engagement.</p>
        </div>
      </div>
    `,
  });
}

export async function sendNewLeadNotification(
  to: string,
  companyName: string,
  fromCity: string,
  toCity: string,
  leadId: string
) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Nouvelle demande de devis : ${fromCity} \→ ${toCity}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Bonjour ${companyName},</h2>
          <p>Une nouvelle demande de devis correspond à votre zone d'intervention :</p>
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0;"><strong>${fromCity}</strong> \→ <strong>${toCity}</strong></p>
          </div>
          <a href="${emailBaseUrl()}/demandes-de-devis/${leadId}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Voir la demande
          </a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            Conseil : Contactez le client dans les 8 heures pour maximiser vos chances.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(to: string, companyName: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: "Bienvenue sur Demenagement24 !",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Bienvenue, ${companyName} !</h2>
          <p>Votre inscription a bien été reçue. Voici les prochaines étapes :</p>
          <ol style="padding-left: 20px;">
            <li><strong>Vérifiez votre identité</strong> pour activer votre compte</li>
            <li><strong>Complétez votre profil</strong> pour attirer plus de clients</li>
            <li><strong>Configurez vos zones</strong> d'intervention</li>
          </ol>
          <a href="${emailBaseUrl()}/verification-identite" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Commencer la vérification
          </a>
        </div>
      </div>
    `,
  });
}

export async function sendContactForm(
  name: string,
  email: string,
  subject: string,
  message: string
) {
  return getResend().emails.send({
    from: FROM,
    to: "contact@demenagement24.com",
    replyTo: email,
    subject: `[Contact] ${subject} - ${name}`,
    html: `
      <div style="font-family: system-ui, sans-serif;">
        <h2>Nouveau message de contact</h2>
        <p><strong>Nom :</strong> ${name}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Sujet :</strong> ${subject}</p>
        <hr />
        <p>${message.replace(/\n/g, "<br />")}</p>
      </div>
    `,
  });
}

export async function sendInvoiceEmail(
  to: string,
  companyName: string,
  invoiceNumber: string,
  amountCents: number,
  description: string
) {
  const amount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Facture ${invoiceNumber} — ${amount}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Bonjour ${companyName},</h2>
          <p>Votre paiement de <strong>${amount}</strong> a été confirmé.</p>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0;"><strong>Facture :</strong> ${invoiceNumber}</p>
            <p style="margin: 8px 0 0;"><strong>Description :</strong> ${description}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Votre facture est disponible dans votre espace <a href="${emailBaseUrl()}/facturation" style="color: #22c55e; text-decoration: underline;">Facturation</a>.</p>
        </div>
      </div>
    `,
  });
}

export async function sendPaymentFailedEmail(
  to: string,
  companyName: string,
  amountCents: number,
  dateTime: string
) {
  const amount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Échec de paiement — ${amount}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Bonjour ${companyName},</h2>
          <p>Votre paiement de <strong>${amount}</strong> a échoué le <strong>${dateTime}</strong>.</p>
          <p>Veuillez réessayer depuis votre espace ou contacter votre banque.</p>
          <a href="${emailBaseUrl()}/demandes-de-devis" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Réessayer
          </a>
        </div>
      </div>
    `,
  });
}

/** KYC approved — tell mover they can now buy leads */
export async function sendKycApprovedEmail(to: string, companyName: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: "Votre identité a été vérifiée avec succès",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Félicitations, ${companyName} !</h2>
          <p>Votre vérification d'identité a été <strong style="color: #16a34a;">approuvée</strong>. Votre compte est maintenant actif.</p>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <strong style="color: #16a34a;">Vous pouvez maintenant :</strong>
            <ul style="margin: 8px 0 0; padding-left: 20px; color: #374151;">
              <li>Consulter et déverrouiller des demandes de devis</li>
              <li>Contacter directement les clients</li>
              <li>Développer votre activité</li>
            </ul>
          </div>
          <a href="${emailBaseUrl()}/demandes-de-devis" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Voir les demandes disponibles
          </a>
        </div>
      </div>
    `,
  });
}

/** KYC rejected — tell mover to retry */
export async function sendKycRejectedEmail(to: string, companyName: string, reason: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: "Vérification d'identité refusée",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Bonjour ${companyName},</h2>
          <p>Votre vérification d'identité a été <strong style="color: #dc2626;">refusée</strong>.</p>
          <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0;"><strong>Motif :</strong> ${reason}</p>
          </div>
          <p>Veuillez vérifier vos documents et réessayer. Assurez-vous que les images sont lisibles et que les informations correspondent.</p>
          <a href="${emailBaseUrl()}/verification-identite" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Réessayer la vérification
          </a>
        </div>
      </div>
    `,
  });
}

/** Claim received — acknowledge to mover */
export async function sendClaimReceivedEmail(to: string, companyName: string, reason: string, claimId: string) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Réclamation reçue — ${reason}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Bonjour ${companyName},</h2>
          <p>Votre réclamation a bien été enregistrée.</p>
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid #e5e7eb;">
            <p style="margin: 0;"><strong>Référence :</strong> ${claimId.slice(0, 8).toUpperCase()}</p>
            <p style="margin: 8px 0 0;"><strong>Motif :</strong> ${reason}</p>
          </div>
          <p>Notre équipe examinera votre réclamation sous 48 heures ouvrées. Vous recevrez un email dès qu'une décision sera prise.</p>
        </div>
      </div>
    `,
  });
}

/** Notify admin of new claim */
export async function notifyAdminNewClaim(companyName: string, reason: string, claimId: string) {
  return getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Nouvelle réclamation de ${companyName} — ${reason}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24 — Admin</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Nouvelle réclamation</h2>
          <div style="background: #fffbeb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Entreprise :</strong> ${companyName}</p>
            <p style="margin: 8px 0 0;"><strong>Motif :</strong> ${reason}</p>
            <p style="margin: 8px 0 0;"><strong>Réf :</strong> ${claimId.slice(0, 8).toUpperCase()}</p>
          </div>
          <a href="${emailBaseUrl()}/admin/claims" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Traiter la réclamation
          </a>
        </div>
      </div>
    `,
  });
}

/** Claim resolved — tell mover the decision */
export async function sendClaimResolvedEmail(
  to: string, companyName: string, status: "approved" | "rejected" | "refunded", reason: string
) {
  const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
    approved: { label: "Approuvée", color: "#16a34a", bg: "#f0fdf4" },
    rejected: { label: "Rejetée", color: "#dc2626", bg: "#fef2f2" },
    refunded: { label: "Remboursée", color: "#2563eb", bg: "#eff6ff" },
  };
  const s = statusLabels[status] || statusLabels.approved;

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Réclamation ${s.label.toLowerCase()} — ${reason}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Bonjour ${companyName},</h2>
          <p>Votre réclamation pour <strong>${reason}</strong> a été traitée.</p>
          <div style="background: ${s.bg}; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${s.color};">${s.label}</p>
            ${status === "refunded" ? '<p style="margin: 8px 0 0;">Le remboursement sera crédité sous 5 à 10 jours ouvrés.</p>' : ""}
          </div>
          <a href="${emailBaseUrl()}/facturation" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Voir ma facturation
          </a>
        </div>
      </div>
    `,
  });
}

/** Refund processed — tell mover */
export async function sendRefundEmail(to: string, companyName: string, amountCents: number) {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amountCents / 100);

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Remboursement de ${amount} effectué`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Bonjour ${companyName},</h2>
          <p>Un remboursement de <strong>${amount}</strong> a été effectué sur votre compte.</p>
          <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0;"><strong>Montant :</strong> ${amount}</p>
            <p style="margin: 8px 0 0;">Le crédit apparaîtra sur votre moyen de paiement sous 5 à 10 jours ouvrés.</p>
          </div>
          <a href="${emailBaseUrl()}/facturation" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Voir ma facturation
          </a>
        </div>
      </div>
    `,
  });
}

/** Notify admin of a successful payment */
export async function notifyAdminPaymentSuccess(
  companyName: string,
  amountCents: number,
  invoiceNumber: string
) {
  const amount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);

  return getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Paiement reçu — ${amount} de ${companyName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24 — Admin</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Nouveau paiement confirmé</h2>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Entreprise :</strong> ${companyName}</p>
            <p style="margin: 8px 0 0;"><strong>Montant :</strong> ${amount}</p>
            <p style="margin: 8px 0 0;"><strong>Facture :</strong> ${invoiceNumber}</p>
          </div>
          <a href="${emailBaseUrl()}/admin/transactions" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Voir les transactions
          </a>
        </div>
      </div>
    `,
  });
}

/** Notify admin of a failed payment */
export async function notifyAdminPaymentFailed(
  companyName: string,
  amountCents: number,
  dateTime: string
) {
  const amount = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amountCents / 100);

  return getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Échec de paiement — ${amount} de ${companyName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demenagement24 — Admin</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="margin-top: 0;">Paiement échoué</h2>
          <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Entreprise :</strong> ${companyName}</p>
            <p style="margin: 8px 0 0;"><strong>Montant :</strong> ${amount}</p>
            <p style="margin: 8px 0 0;"><strong>Date :</strong> ${dateTime}</p>
          </div>
          <a href="${emailBaseUrl()}/admin/transactions" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Voir les transactions
          </a>
        </div>
      </div>
    `,
  });
}
