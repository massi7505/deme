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

export interface Settings {
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
  // Security
  adminEmail: string;
}

export const DEFAULT_SETTINGS: Settings = {
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
  adminEmail: "",
};
