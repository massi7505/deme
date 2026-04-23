export interface DepartmentRule {
  code: string;
  name: string;
  percent: number;
}

export interface VolumeRule {
  minM3: number;
  maxM3: number;
  percent: number;
}

export interface SeasonRule {
  startDate: string;
  endDate: string;
  percent: number;
}

export interface DiscountTier {
  minLeads: number;
  maxLeads: number;
  discountPercent: number;
}

export interface PromoCode {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  companyId: string;
  active: boolean;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface Settings {
  // Email templates
  emailTemplates: Record<string, EmailTemplate>;
  // General
  siteName: string;
  siteUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  logoUrl: string;
  faviconUrl: string;
  // Mollie
  mollieTestKey: string;
  mollieLiveKey: string;
  mollieMode: "test" | "live";
  mollieProfileId: string;
  // Pricing
  pricingMode: "fixed" | "smart";
  priceNational: string;
  priceEntreprise: string;
  priceInternational: string;
  maxDistributions: string;
  smartPricingDepartments: DepartmentRule[];
  smartPricingVolume: VolumeRule[];
  smartPricingSeasons: SeasonRule[];
  volumeDiscountTiers: DiscountTier[];
  promoCodes: PromoCode[];
  // Notifications
  emailFrom: string;
  emailReclamations: string;
  // SMTP
  smtpProvider: "resend" | "smtp";
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  smtpEncryption: "tls" | "ssl" | "none";
  smtpFromName: string;
  smtpFromEmail: string;
  resendApiKey: string;
  // Invoice
  invoiceCompanyName: string;
  invoiceAddress: string;
  invoiceCity: string;
  invoicePostalCode: string;
  invoiceEmail: string;
  invoiceSiret: string;
  invoiceVatNumber: string;
  invoiceVatRate: string;
  invoicePriceMode: "ttc" | "ht";
  invoicePrefix: string;
  invoiceFooter: string;
  invoiceConditions: string;
  // Security
  adminEmail: string;
  // Refunds / wallet
  refundsEnabled: boolean;
  walletValidityDays: string;              // integer, default 365
  refundMaxPercent: string;                // max % of a transaction per refund
  refundMaxPerMoverMonthly: string;        // euros cap / mover / calendar month
  refundMaxPerMoverYearly: string;         // euros cap / mover / rolling 365d
  refundOncePerTransaction: boolean;       // one wallet refund per source transaction
  refundCooldownDays: string;              // days between two refunds for same mover
}

export const EMAIL_TEMPLATE_DEFS: {
  key: string;
  label: string;
  category: string;
  variables: string[];
}[] = [
  { key: "welcome", label: "Bienvenue", category: "Déménageur", variables: ["siteName", "companyName", "baseUrl"] },
  { key: "newLead", label: "Nouveau lead", category: "Déménageur", variables: ["siteName", "companyName", "fromCity", "toCity", "leadId", "baseUrl"] },
  { key: "quoteConfirmation", label: "Confirmation devis", category: "Client", variables: ["siteName", "clientName", "fromCity", "toCity", "prospectId"] },
  { key: "invoice", label: "Facture", category: "Déménageur", variables: ["siteName", "companyName", "amount", "invoiceNumber", "description", "baseUrl"] },
  { key: "paymentFailed", label: "Paiement échoué", category: "Déménageur", variables: ["siteName", "companyName", "amount", "dateTime", "baseUrl"] },
  { key: "kycApproved", label: "KYC approuvé", category: "Déménageur", variables: ["siteName", "companyName", "baseUrl"] },
  { key: "kycRejected", label: "KYC rejeté", category: "Déménageur", variables: ["siteName", "companyName", "reason", "baseUrl"] },
  { key: "claimReceived", label: "Réclamation reçue", category: "Déménageur", variables: ["siteName", "companyName", "reason", "claimRef"] },
  { key: "claimResolved", label: "Réclamation résolue", category: "Déménageur", variables: ["siteName", "companyName", "reason", "statusLabel", "statusColor", "statusBg", "baseUrl"] },
  { key: "refund", label: "Remboursement", category: "Déménageur", variables: ["siteName", "companyName", "amount", "baseUrl"] },
  { key: "walletRefund", label: "Remboursement portefeuille", category: "Déménageur", variables: ["siteName", "companyName", "amount", "expiryDate", "balance", "baseUrl"] },
  { key: "walletExpiryWarning", label: "Expiration crédits portefeuille", category: "Déménageur", variables: ["siteName", "companyName", "thresholdLabel", "totalAmount", "creditLines", "baseUrl"] },
  { key: "adminPaymentSuccess", label: "Paiement reçu", category: "Admin", variables: ["siteName", "companyName", "amount", "invoiceNumber", "baseUrl"] },
  { key: "adminPaymentFailed", label: "Paiement échoué", category: "Admin", variables: ["siteName", "companyName", "amount", "dateTime", "baseUrl"] },
  { key: "adminNewClaim", label: "Nouvelle réclamation", category: "Admin", variables: ["siteName", "companyName", "reason", "claimRef", "baseUrl"] },
  { key: "passwordReset", label: "Réinitialisation mot de passe", category: "Client", variables: ["siteName", "otpCode", "expiryMinutes", "baseUrl"] },
  { key: "quoteVerification", label: "Vérification demande client", category: "Client", variables: ["siteName", "clientName", "otpCode", "expiryMinutes", "verifyUrl", "baseUrl"] },
  { key: "adminDistributionFailed", label: "Échec distribution lead", category: "Admin", variables: ["siteName", "quoteId", "clientName", "fromCity", "toCity", "errorMessage", "baseUrl"] },
];

// Shared inline snippets (the full doc shell is applied at send time via lib/email-layout.ts)
const BTN_PRIMARY = `display:inline-block;background:#22c55e;color:#ffffff;padding:13px 26px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;`;
const CALLOUT_GREEN = `background:#f0fdf4;border-left:4px solid #22c55e;border-radius:6px;padding:14px 16px;margin:20px 0;`;
const CALLOUT_AMBER = `background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;padding:14px 16px;margin:20px 0;`;
const CALLOUT_RED = `background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;padding:14px 16px;margin:20px 0;`;
const CALLOUT_GRAY = `background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin:20px 0;`;

export const DEFAULT_EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    subject: "Bienvenue sur {{siteName}} !",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bienvenue, {{companyName}} 👋</h2>
<p style="margin:0 0 16px;color:#374151;">Votre inscription est confirmée. Voici les 3 étapes pour être visible et recevoir vos premiers leads :</p>
<ol style="padding-left:20px;margin:0 0 20px;color:#374151;">
  <li style="margin-bottom:8px;"><strong>Vérifiez votre identité</strong> pour activer votre compte</li>
  <li style="margin-bottom:8px;"><strong>Complétez votre profil</strong> (logo, photos, description)</li>
  <li><strong>Configurez vos zones d&apos;intervention</strong></li>
</ol>
<a href="{{baseUrl}}/verification-identite" style="${BTN_PRIMARY}">Commencer la vérification</a>
<p style="margin:24px 0 0;font-size:13px;color:#6b7280;">Une question ? Répondez simplement à cet email.</p>`,
  },
  newLead: {
    subject: "📬 Nouveau lead : {{fromCity}} → {{toCity}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{companyName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Une nouvelle demande correspond à votre zone d&apos;intervention.</p>
<div style="${CALLOUT_GREEN}">
  <p style="margin:0;font-size:17px;color:#111827;"><strong>{{fromCity}}</strong> → <strong>{{toCity}}</strong></p>
</div>
<a href="{{baseUrl}}/demandes-de-devis/{{leadId}}" style="${BTN_PRIMARY}">Voir la demande</a>
<p style="margin:24px 0 0;font-size:13px;color:#6b7280;">💡 Les déménageurs qui contactent un client dans les 2 premières heures obtiennent 3× plus de contrats.</p>`,
  },
  quoteConfirmation: {
    subject: "Votre demande de devis est confirmée ✅",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{clientName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Votre demande pour un déménagement <strong>{{fromCity}}</strong> → <strong>{{toCity}}</strong> est bien enregistrée.</p>
<div style="${CALLOUT_GRAY}">
  <p style="margin:0;font-size:13px;color:#6b7280;">Numéro de suivi</p>
  <p style="margin:4px 0 0;font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#111827;">{{prospectId}}</p>
</div>
<div style="${CALLOUT_GREEN}">
  <p style="margin:0 0 8px;font-weight:600;color:#16a34a;">Et maintenant ?</p>
  <ol style="margin:0;padding-left:20px;color:#374151;">
    <li style="margin-bottom:6px;">Jusqu&apos;à 6 déménageurs professionnels reçoivent votre demande</li>
    <li style="margin-bottom:6px;">Ils vous contactent avec leur devis sous 48h</li>
    <li>Vous comparez et choisissez librement</li>
  </ol>
</div>
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">Service <strong>100% gratuit et sans engagement</strong>.</p>`,
  },
  invoice: {
    subject: "Facture {{invoiceNumber}} — {{amount}} payée ✅",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{companyName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Votre paiement de <strong>{{amount}}</strong> est confirmé.</p>
<div style="${CALLOUT_GREEN}">
  <p style="margin:0 0 6px;font-size:13px;color:#166534;font-weight:600;">Facture</p>
  <p style="margin:0 0 10px;font-size:16px;color:#111827;"><strong>{{invoiceNumber}}</strong></p>
  <p style="margin:0;font-size:13px;color:#166534;font-weight:600;">Description</p>
  <p style="margin:0;color:#111827;">{{description}}</p>
</div>
<a href="{{baseUrl}}/facturation" style="${BTN_PRIMARY}">Voir mes factures</a>`,
  },
  paymentFailed: {
    subject: "⚠ Paiement échoué — {{amount}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{companyName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Votre paiement de <strong>{{amount}}</strong> a échoué le <strong>{{dateTime}}</strong>.</p>
<div style="${CALLOUT_RED}">
  <p style="margin:0;color:#991b1b;">Causes fréquentes : plafond carte atteint, code 3D Secure non validé, fonds insuffisants.</p>
</div>
<p style="margin:0 0 16px;color:#374151;">Vous pouvez réessayer immédiatement avec une autre carte depuis votre espace.</p>
<a href="{{baseUrl}}/demandes-de-devis" style="${BTN_PRIMARY}">Réessayer le paiement</a>`,
  },
  kycApproved: {
    subject: "✅ Votre compte est activé, {{companyName}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Félicitations 🎉</h2>
<p style="margin:0 0 16px;color:#374151;">Votre vérification d&apos;identité est <strong style="color:#16a34a;">approuvée</strong>. Votre compte {{companyName}} est maintenant actif.</p>
<div style="${CALLOUT_GREEN}">
  <p style="margin:0 0 8px;font-weight:600;color:#16a34a;">Vous pouvez désormais :</p>
  <ul style="margin:0;padding-left:20px;color:#374151;">
    <li style="margin-bottom:4px;">Acheter et débloquer des leads</li>
    <li style="margin-bottom:4px;">Contacter directement les clients</li>
    <li>Utiliser tous les outils de votre espace mover</li>
  </ul>
</div>
<a href="{{baseUrl}}/demandes-de-devis" style="${BTN_PRIMARY}">Voir les demandes disponibles</a>`,
  },
  kycRejected: {
    subject: "Vérification d&apos;identité à compléter",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{companyName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Votre vérification d&apos;identité nécessite des corrections avant de pouvoir être validée.</p>
<div style="${CALLOUT_RED}">
  <p style="margin:0 0 6px;font-weight:600;color:#991b1b;">Motif</p>
  <p style="margin:0;color:#7f1d1d;">{{reason}}</p>
</div>
<p style="margin:0 0 16px;color:#374151;">Corrigez les points ci-dessus puis relancez la vérification.</p>
<a href="{{baseUrl}}/verification-identite" style="${BTN_PRIMARY}">Reprendre la vérification</a>`,
  },
  claimReceived: {
    subject: "Réclamation enregistrée — {{reason}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{companyName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Votre réclamation a bien été enregistrée. Nous l&apos;examinerons dans les 48 heures ouvrées.</p>
<div style="${CALLOUT_GRAY}">
  <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Référence</p>
  <p style="margin:0 0 10px;font-family:'Courier New',monospace;font-size:15px;font-weight:700;color:#111827;">{{claimRef}}</p>
  <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Motif</p>
  <p style="margin:0;color:#111827;">{{reason}}</p>
</div>
<p style="margin:0;font-size:13px;color:#6b7280;">Vous serez notifié par email dès que la réclamation sera traitée.</p>`,
  },
  claimResolved: {
    subject: "Réclamation {{statusLabel}} — {{reason}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{companyName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Votre réclamation pour <strong>{{reason}}</strong> a été traitée.</p>
<div style="background:{{statusBg}};border-radius:8px;padding:18px 20px;margin:20px 0;text-align:center;">
  <p style="margin:0;font-size:18px;font-weight:700;color:{{statusColor}};">{{statusLabel}}</p>
</div>
<a href="{{baseUrl}}/facturation" style="${BTN_PRIMARY}">Voir ma facturation</a>`,
  },
  refund: {
    subject: "💸 Remboursement de {{amount}} en route",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{companyName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Un remboursement de <strong>{{amount}}</strong> a été initié sur votre moyen de paiement.</p>
<div style="${CALLOUT_GREEN}">
  <p style="margin:0 0 8px;font-weight:600;color:#166534;">Montant</p>
  <p style="margin:0 0 14px;font-size:24px;font-weight:700;color:#166534;">{{amount}}</p>
  <p style="margin:0;font-size:13px;color:#166534;">Le crédit apparaîtra sur votre moyen de paiement sous <strong>5 à 10 jours ouvrés</strong>.</p>
</div>
<a href="{{baseUrl}}/facturation" style="${BTN_PRIMARY}">Voir ma facturation</a>`,
  },
  walletRefund: {
    subject: "🎁 Vous avez reçu {{amount}} sur votre portefeuille",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{companyName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Un crédit vient d&apos;être ajouté à votre portefeuille {{siteName}}.</p>
<div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
  <p style="margin:0 0 4px;color:#166534;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Montant crédité</p>
  <p style="margin:0;font-size:38px;font-weight:700;color:#166534;">{{amount}}</p>
  <p style="margin:14px 0 0;color:#166534;font-size:13px;">Utilisable jusqu&apos;au <strong>{{expiryDate}}</strong></p>
</div>
<div style="${CALLOUT_GRAY}">
  <p style="margin:0;color:#374151;"><strong>Solde actuel du portefeuille :</strong> {{balance}}</p>
  <p style="margin:6px 0 0;color:#6b7280;font-size:13px;">Ce crédit est automatiquement utilisé en priorité sur votre prochain achat de lead — 0 action requise.</p>
</div>
<a href="{{baseUrl}}/facturation" style="${BTN_PRIMARY}">Voir mon portefeuille</a>`,
  },
  walletExpiryWarning: {
    subject: "⏳ {{totalAmount}} de crédit portefeuille expirent sous {{thresholdLabel}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{companyName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Vous avez <strong>{{totalAmount}}</strong> de crédit portefeuille qui vont expirer dans les <strong>{{thresholdLabel}}</strong> à venir.</p>
<div style="${CALLOUT_AMBER}">
  <p style="margin:0 0 10px;font-weight:600;color:#92400e;">Détail des crédits concernés</p>
  <ul style="margin:0;padding-left:20px;color:#374151;">
    {{creditLines}}
  </ul>
</div>
<p style="margin:0 0 16px;color:#374151;">Ces crédits sont utilisés automatiquement sur vos prochains achats de leads — il suffit d&apos;acheter avant la date d&apos;expiration pour ne rien perdre.</p>
<a href="{{baseUrl}}/demandes-de-devis" style="${BTN_PRIMARY}">Voir les leads disponibles</a>
<p style="margin:24px 0 0;font-size:13px;color:#6b7280;">Passé la date d&apos;expiration, les crédits sont définitivement retirés de votre solde.</p>`,
  },
  adminPaymentSuccess: {
    subject: "💰 Paiement confirmé — {{amount}} de {{companyName}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Nouveau paiement confirmé</h2>
<div style="${CALLOUT_GREEN}">
  <p style="margin:0 0 6px;"><strong style="color:#166534;">Entreprise :</strong> <span style="color:#111827;">{{companyName}}</span></p>
  <p style="margin:0 0 6px;"><strong style="color:#166534;">Montant :</strong> <span style="color:#111827;">{{amount}}</span></p>
  <p style="margin:0;"><strong style="color:#166534;">Facture :</strong> <span style="color:#111827;">{{invoiceNumber}}</span></p>
</div>
<a href="{{baseUrl}}/admin/transactions" style="${BTN_PRIMARY}">Voir les transactions</a>`,
  },
  adminPaymentFailed: {
    subject: "⚠ Paiement échoué — {{amount}} de {{companyName}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Paiement échoué</h2>
<div style="${CALLOUT_RED}">
  <p style="margin:0 0 6px;"><strong style="color:#991b1b;">Entreprise :</strong> <span style="color:#111827;">{{companyName}}</span></p>
  <p style="margin:0 0 6px;"><strong style="color:#991b1b;">Montant :</strong> <span style="color:#111827;">{{amount}}</span></p>
  <p style="margin:0;"><strong style="color:#991b1b;">Date :</strong> <span style="color:#111827;">{{dateTime}}</span></p>
</div>
<a href="{{baseUrl}}/admin/transactions" style="${BTN_PRIMARY}">Voir les transactions</a>`,
  },
  adminNewClaim: {
    subject: "🔔 Nouvelle réclamation — {{companyName}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Nouvelle réclamation</h2>
<div style="${CALLOUT_AMBER}">
  <p style="margin:0 0 6px;"><strong style="color:#92400e;">Entreprise :</strong> <span style="color:#111827;">{{companyName}}</span></p>
  <p style="margin:0 0 6px;"><strong style="color:#92400e;">Motif :</strong> <span style="color:#111827;">{{reason}}</span></p>
  <p style="margin:0;"><strong style="color:#92400e;">Référence :</strong> <span style="color:#111827;">{{claimRef}}</span></p>
</div>
<a href="{{baseUrl}}/admin/claims" style="${BTN_PRIMARY}">Traiter la réclamation</a>`,
  },
  passwordReset: {
    subject: "🔐 Code de réinitialisation — {{siteName}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Réinitialisation de mot de passe</h2>
<p style="margin:0 0 16px;color:#374151;">Vous avez demandé à réinitialiser votre mot de passe. Saisissez ce code sur la page de réinitialisation :</p>
<div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
  <p style="margin:0 0 8px;color:#166534;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Code de vérification</p>
  <p style="margin:0;font-family:'Courier New',monospace;font-size:38px;font-weight:700;letter-spacing:10px;color:#166534;">{{otpCode}}</p>
</div>
<div style="${CALLOUT_AMBER}">
  <p style="margin:0;color:#92400e;font-size:14px;"><strong>⏱ Expire dans {{expiryMinutes}} minutes.</strong> Code à usage unique.</p>
</div>
<p style="margin:0;font-size:13px;color:#6b7280;">Vous n&apos;avez pas fait cette demande ? Ignorez cet email — votre mot de passe reste inchangé. Ne partagez jamais ce code.</p>`,
  },
  quoteVerification: {
    subject: "📧 Confirmez votre demande de devis — {{siteName}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Bonjour {{clientName}},</h2>
<p style="margin:0 0 16px;color:#374151;">Plus qu&apos;une étape ! Saisissez ce code pour valider votre demande de devis et permettre aux déménageurs de vous contacter.</p>
<div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
  <p style="margin:0 0 8px;color:#166534;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Code de vérification</p>
  <p style="margin:0;font-family:'Courier New',monospace;font-size:38px;font-weight:700;letter-spacing:10px;color:#166534;">{{otpCode}}</p>
</div>
<a href="{{verifyUrl}}" style="${BTN_PRIMARY}">Valider ma demande</a>
<div style="${CALLOUT_AMBER}">
  <p style="margin:0;color:#92400e;font-size:14px;"><strong>⏱ Expire dans {{expiryMinutes}} minutes.</strong></p>
</div>
<p style="margin:0;font-size:13px;color:#6b7280;">Si vous n&apos;êtes pas à l&apos;origine de cette demande, ignorez cet email.</p>`,
  },
  adminDistributionFailed: {
    subject: "[URGENT] Distribution lead échouée — {{clientName}}",
    body: `<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#991b1b;">🚨 Distribution lead échouée</h2>
<p style="margin:0 0 16px;color:#374151;">Le client a vérifié son contact mais le lead n&apos;a pas pu être distribué aux déménageurs. <strong>Intervention manuelle requise.</strong></p>
<div style="${CALLOUT_RED}">
  <p style="margin:0 0 6px;"><strong style="color:#991b1b;">Client :</strong> <span style="color:#111827;">{{clientName}}</span></p>
  <p style="margin:0 0 6px;"><strong style="color:#991b1b;">Trajet :</strong> <span style="color:#111827;">{{fromCity}} → {{toCity}}</span></p>
  <p style="margin:0 0 6px;"><strong style="color:#991b1b;">Quote ID :</strong> <code style="font-family:'Courier New',monospace;font-size:12px;background:#ffffff;padding:2px 6px;border-radius:3px;">{{quoteId}}</code></p>
  <p style="margin:0;"><strong style="color:#991b1b;">Erreur :</strong> <span style="color:#111827;">{{errorMessage}}</span></p>
</div>
<a href="{{baseUrl}}/admin/leads" style="display:inline-block;background:#dc2626;color:#ffffff;padding:13px 26px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Voir les leads admin</a>`,
  },
};

export const DEFAULT_SETTINGS: Settings = {
  emailTemplates: {},
  siteName: "",
  siteUrl: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  logoUrl: "",
  faviconUrl: "",
  mollieTestKey: "",
  mollieLiveKey: "",
  mollieMode: "test",
  mollieProfileId: "",
  pricingMode: "fixed",
  priceNational: "12.00",
  priceEntreprise: "18.00",
  priceInternational: "25.00",
  maxDistributions: "6",
  smartPricingDepartments: [],
  smartPricingVolume: [],
  smartPricingSeasons: [],
  volumeDiscountTiers: [],
  promoCodes: [],
  emailFrom: "",
  emailReclamations: "",
  smtpProvider: "resend",
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPassword: "",
  smtpEncryption: "tls",
  smtpFromName: "",
  smtpFromEmail: "",
  resendApiKey: "",
  invoiceCompanyName: "",
  invoiceAddress: "",
  invoiceCity: "",
  invoicePostalCode: "",
  invoiceEmail: "",
  invoiceSiret: "",
  invoiceVatNumber: "",
  invoiceVatRate: "20",
  invoicePriceMode: "ttc",
  invoicePrefix: "FA",
  invoiceFooter: "Paiement effectue par carte bancaire via Mollie.",
  invoiceConditions: "",
  adminEmail: "",
  refundsEnabled: false,
  walletValidityDays: "365",
  refundMaxPercent: "10",
  refundMaxPerMoverMonthly: "0",
  refundMaxPerMoverYearly: "0",
  refundOncePerTransaction: true,
  refundCooldownDays: "0",
};
