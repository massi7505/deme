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
  trialDays: string;
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
  { key: "adminPaymentSuccess", label: "Paiement reçu", category: "Admin", variables: ["siteName", "companyName", "amount", "invoiceNumber", "baseUrl"] },
  { key: "adminPaymentFailed", label: "Paiement échoué", category: "Admin", variables: ["siteName", "companyName", "amount", "dateTime", "baseUrl"] },
  { key: "adminNewClaim", label: "Nouvelle réclamation", category: "Admin", variables: ["siteName", "companyName", "reason", "claimRef", "baseUrl"] },
  { key: "passwordReset", label: "Réinitialisation mot de passe", category: "Client", variables: ["siteName", "otpCode", "expiryMinutes", "baseUrl"] },
];

export const DEFAULT_EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    subject: "Bienvenue sur {{siteName}} !",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}}</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Bienvenue, {{companyName}} !</h2><p>Votre inscription a bien été reçue. Voici les prochaines étapes :</p><ol style="padding-left:20px"><li><strong>Vérifiez votre identité</strong> pour activer votre compte</li><li><strong>Complétez votre profil</strong> pour attirer plus de clients</li><li><strong>Configurez vos zones</strong> d'intervention</li></ol><a href="{{baseUrl}}/verification-identite" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Commencer la vérification</a></div></div>`,
  },
  newLead: {
    subject: "Nouvelle demande de devis : {{fromCity}} → {{toCity}}",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}}</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Bonjour {{companyName}},</h2><p>Une nouvelle demande de devis correspond à votre zone d'intervention :</p><div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e5e7eb"><p style="margin:0"><strong>{{fromCity}}</strong> → <strong>{{toCity}}</strong></p></div><a href="{{baseUrl}}/demandes-de-devis/{{leadId}}" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Voir la demande</a><p style="color:#6b7280;font-size:14px;margin-top:24px">Conseil : Contactez le client dans les 8 heures pour maximiser vos chances.</p></div></div>`,
  },
  quoteConfirmation: {
    subject: "Votre demande de devis a bien été envoyée",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}}</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Bonjour {{clientName}},</h2><p>Votre demande de devis pour un déménagement de <strong>{{fromCity}}</strong> vers <strong>{{toCity}}</strong> a bien été enregistrée.</p><p>Numéro de suivi : <strong>{{prospectId}}</strong></p><p>Jusqu'à 6 déménageurs professionnels vous contacteront dans les prochaines 48 heures.</p><div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:24px 0"><strong style="color:#16a34a">Que se passe-t-il ensuite ?</strong><ol style="margin:8px 0 0;padding-left:20px;color:#374151"><li>Les déménageurs de votre région reçoivent votre demande</li><li>Ils vous contactent avec leur devis personnalisé</li><li>Vous comparez et choisissez librement</li></ol></div><p style="color:#6b7280;font-size:14px">Ce service est entièrement gratuit et sans engagement.</p></div></div>`,
  },
  invoice: {
    subject: "Facture {{invoiceNumber}} — {{amount}}",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}}</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Bonjour {{companyName}},</h2><p>Votre paiement de <strong>{{amount}}</strong> a été confirmé.</p><div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:24px 0"><p style="margin:0"><strong>Facture :</strong> {{invoiceNumber}}</p><p style="margin:8px 0 0"><strong>Description :</strong> {{description}}</p></div><p style="color:#6b7280;font-size:14px">Votre facture est disponible dans votre espace <a href="{{baseUrl}}/facturation" style="color:#22c55e;text-decoration:underline">Facturation</a>.</p></div></div>`,
  },
  paymentFailed: {
    subject: "Échec de paiement — {{amount}}",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}}</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Bonjour {{companyName}},</h2><p>Votre paiement de <strong>{{amount}}</strong> a échoué le <strong>{{dateTime}}</strong>.</p><p>Veuillez réessayer depuis votre espace ou contacter votre banque.</p><a href="{{baseUrl}}/demandes-de-devis" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">Réessayer</a></div></div>`,
  },
  kycApproved: {
    subject: "Votre identité a été vérifiée avec succès",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}}</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Félicitations, {{companyName}} !</h2><p>Votre vérification d'identité a été <strong style="color:#16a34a">approuvée</strong>. Votre compte est maintenant actif.</p><div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:24px 0"><strong style="color:#16a34a">Vous pouvez maintenant :</strong><ul style="margin:8px 0 0;padding-left:20px;color:#374151"><li>Consulter et déverrouiller des demandes de devis</li><li>Contacter directement les clients</li><li>Développer votre activité</li></ul></div><a href="{{baseUrl}}/demandes-de-devis" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Voir les demandes disponibles</a></div></div>`,
  },
  kycRejected: {
    subject: "Vérification d'identité refusée",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}}</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Bonjour {{companyName}},</h2><p>Votre vérification d'identité a été <strong style="color:#dc2626">refusée</strong>.</p><div style="background:#fef2f2;border-radius:8px;padding:16px;margin:24px 0"><p style="margin:0"><strong>Motif :</strong> {{reason}}</p></div><p>Veuillez vérifier vos documents et réessayer.</p><a href="{{baseUrl}}/verification-identite" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Réessayer la vérification</a></div></div>`,
  },
  claimReceived: {
    subject: "Réclamation reçue — {{reason}}",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}}</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Bonjour {{companyName}},</h2><p>Votre réclamation a bien été enregistrée.</p><div style="background:#f9fafb;border-radius:8px;padding:16px;margin:24px 0;border:1px solid #e5e7eb"><p style="margin:0"><strong>Référence :</strong> {{claimRef}}</p><p style="margin:8px 0 0"><strong>Motif :</strong> {{reason}}</p></div><p>Notre équipe examinera votre réclamation sous 48 heures ouvrées.</p></div></div>`,
  },
  claimResolved: {
    subject: "Réclamation {{statusLabel}} — {{reason}}",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}}</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Bonjour {{companyName}},</h2><p>Votre réclamation pour <strong>{{reason}}</strong> a été traitée.</p><div style="background:{{statusBg}};border-radius:8px;padding:16px;margin:24px 0"><p style="margin:0;font-size:18px;font-weight:bold;color:{{statusColor}}">{{statusLabel}}</p></div><a href="{{baseUrl}}/facturation" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Voir ma facturation</a></div></div>`,
  },
  refund: {
    subject: "Remboursement de {{amount}} effectué",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}}</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Bonjour {{companyName}},</h2><p>Un remboursement de <strong>{{amount}}</strong> a été effectué sur votre compte.</p><div style="background:#eff6ff;border-radius:8px;padding:16px;margin:24px 0"><p style="margin:0"><strong>Montant :</strong> {{amount}}</p><p style="margin:8px 0 0">Le crédit apparaîtra sur votre moyen de paiement sous 5 à 10 jours ouvrés.</p></div><a href="{{baseUrl}}/facturation" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Voir ma facturation</a></div></div>`,
  },
  adminPaymentSuccess: {
    subject: "Paiement reçu — {{amount}} de {{companyName}}",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}} — Admin</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Nouveau paiement confirmé</h2><div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0"><p style="margin:0"><strong>Entreprise :</strong> {{companyName}}</p><p style="margin:8px 0 0"><strong>Montant :</strong> {{amount}}</p><p style="margin:8px 0 0"><strong>Facture :</strong> {{invoiceNumber}}</p></div><a href="{{baseUrl}}/admin/transactions" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Voir les transactions</a></div></div>`,
  },
  adminPaymentFailed: {
    subject: "Échec de paiement — {{amount}} de {{companyName}}",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}} — Admin</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Paiement échoué</h2><div style="background:#fef2f2;border-radius:8px;padding:16px;margin:16px 0"><p style="margin:0"><strong>Entreprise :</strong> {{companyName}}</p><p style="margin:8px 0 0"><strong>Montant :</strong> {{amount}}</p><p style="margin:8px 0 0"><strong>Date :</strong> {{dateTime}}</p></div><a href="{{baseUrl}}/admin/transactions" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Voir les transactions</a></div></div>`,
  },
  adminNewClaim: {
    subject: "Nouvelle réclamation de {{companyName}} — {{reason}}",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;border-radius:12px 12px 0 0"><h1 style="color:white;margin:0;font-size:24px">{{siteName}} — Admin</h1></div><div style="padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0">Nouvelle réclamation</h2><div style="background:#fffbeb;border-radius:8px;padding:16px;margin:16px 0"><p style="margin:0"><strong>Entreprise :</strong> {{companyName}}</p><p style="margin:8px 0 0"><strong>Motif :</strong> {{reason}}</p><p style="margin:8px 0 0"><strong>Réf :</strong> {{claimRef}}</p></div><a href="{{baseUrl}}/admin/claims" style="display:inline-block;background:#22c55e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Traiter la réclamation</a></div></div>`,
  },
  passwordReset: {
    subject: "Code de réinitialisation — {{siteName}}",
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:24px"><div style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:32px;border-radius:12px 12px 0 0;text-align:center"><h1 style="color:white;margin:0;font-size:24px;font-weight:700">{{siteName}}</h1></div><div style="padding:32px;background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px"><h2 style="margin-top:0;font-size:20px;color:#111827">Réinitialisation de votre mot de passe</h2><p style="color:#374151;line-height:1.6">Vous avez demandé à réinitialiser votre mot de passe. Utilisez le code ci-dessous pour choisir un nouveau mot de passe :</p><div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:24px;margin:28px 0;text-align:center"><p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Votre code de vérification</p><p style="margin:0;font-family:'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#166534">{{otpCode}}</p></div><div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px;margin:20px 0"><p style="margin:0;color:#92400e;font-size:14px"><strong>⏱ Expire dans {{expiryMinutes}} minutes.</strong> Ce code est à usage unique.</p></div><p style="color:#6b7280;font-size:14px;line-height:1.6;margin-top:24px">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe restera inchangé.</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"><p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">© {{siteName}} — Ne partagez jamais ce code avec qui que ce soit.</p></div></div>`,
  },
};

export const DEFAULT_SETTINGS: Settings = {
  emailTemplates: {},
  siteName: "Demenagement24",
  siteUrl: "https://demenagement24.com",
  contactEmail: "contact@demenagement24.com",
  contactPhone: "01 23 45 67 89",
  contactAddress: "Paris, France",
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
  trialDays: "30",
  smartPricingDepartments: [],
  smartPricingVolume: [],
  smartPricingSeasons: [],
  volumeDiscountTiers: [],
  promoCodes: [],
  emailFrom: "noreply@demenagement24.com",
  emailReclamations: "reclamations@demenagement24.com",
  smtpProvider: "resend",
  smtpHost: "",
  smtpPort: "587",
  smtpUser: "",
  smtpPassword: "",
  smtpEncryption: "tls",
  smtpFromName: "Demenagement24",
  smtpFromEmail: "noreply@demenagement24.com",
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
};
