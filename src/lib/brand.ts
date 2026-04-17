/**
 * Single source of truth for brand identity.
 *
 * Values come from environment variables so the app can be re-branded
 * without touching code. Empty strings are the intentional fallback when
 * env vars are unset (dev, fresh clone). Consumers that need a user-facing
 * fallback can combine with the DB settings read or OR-chain their own.
 *
 * NEXT_PUBLIC_* vars are inlined at build time and available in the browser.
 * Non-public vars are server-only.
 */
export const BRAND = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  // SMS sender ID, typically 11 alphanumeric chars max (carrier limit).
  smsSender: process.env.SMS_SENDER ?? "",
} as const;
