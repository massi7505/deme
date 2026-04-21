import type { createUntypedAdminClient } from "@/lib/supabase/admin";
import { DISPOSABLE_DOMAINS } from "./disposable-emails";

type Admin = ReturnType<typeof createUntypedAdminClient>;

export const FRAUD_THRESHOLD = 50;
export const HONEYPOT_FIELD_NAME = "__nickname";

export type FraudReason = {
  code: string;
  label: string;
  weight: number;
};

export type LeadInput = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  notes?: string;
  fromPostalCode?: string;
  fromCity?: string;
  honeypot?: string;
};

export type ScoreContext = {
  supabase: Admin;
  quoteId: string;
};

// ─── Sync detectors ──────────────────────────────────────────────────────

export function isDisposableEmail(email: string | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return DISPOSABLE_DOMAINS.has(domain);
}

export function hasHoneypot(honeypot: string | undefined): boolean {
  if (!honeypot || typeof honeypot !== "string") return false;
  return honeypot.trim() !== "";
}

export function hasSuspiciousName(name: string | undefined): boolean {
  if (!name || typeof name !== "string") return false;
  if (/\d/.test(name)) return true;
  if (/[^a-zA-Zà-ÿÀ-Ÿ '\-]/.test(name)) return true;
  if (name.length >= 3 && name === name.toUpperCase() && /[A-ZÀ-Ÿ]/.test(name)) return true;
  return false;
}

export function hasUrlInNotes(notes: string | undefined): boolean {
  if (!notes || typeof notes !== "string") return false;
  return /(https?:\/\/|www\.|\.(com|fr|ru|cn|xyz|click|top|info|biz)\b)/i.test(notes);
}

export function hasForeignScriptOrSpam(notes: string | undefined, name: string | undefined): boolean {
  const haystack = `${notes || ""} ${name || ""}`;
  if (/[Ѐ-ӿ一-鿿]/.test(haystack)) return true;
  if (/\b(casino|loan|bitcoin|viagra|crypto|btc)\b/i.test(haystack)) return true;
  return false;
}

const CITY_TO_DEPARTMENT: Record<string, string> = {
  "paris": "75",
  "marseille": "13",
  "lyon": "69",
  "toulouse": "31",
  "nice": "06",
  "nantes": "44",
  "montpellier": "34",
  "strasbourg": "67",
  "bordeaux": "33",
  "lille": "59",
  "rennes": "35",
  "reims": "51",
  "saint-etienne": "42",
  "toulon": "83",
  "le havre": "76",
  "grenoble": "38",
  "dijon": "21",
  "angers": "49",
  "nimes": "30",
  "villeurbanne": "69",
  "saint-denis": "93",
  "aix-en-provence": "13",
  "clermont-ferrand": "63",
  "brest": "29",
  "tours": "37",
  "limoges": "87",
  "amiens": "80",
  "perpignan": "66",
  "metz": "57",
  "besancon": "25",
  "boulogne-billancourt": "92",
  "orleans": "45",
  "mulhouse": "68",
  "rouen": "76",
  "caen": "14",
  "nancy": "54",
  "saint-paul": "974",
  "argenteuil": "95",
  "montreuil": "93",
  "roubaix": "59",
  "tourcoing": "59",
  "nanterre": "92",
  "avignon": "84",
  "vitry-sur-seine": "94",
  "creteil": "94",
  "dunkerque": "59",
  "poitiers": "86",
  "asnieres-sur-seine": "92",
  "versailles": "78",
  "courbevoie": "92",
};

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function hasPostalMismatch(
  postalCode: string | undefined,
  city: string | undefined
): boolean {
  if (!postalCode || !city) return false;
  if (!/^\d{5}$/.test(postalCode)) return false;
  const postalDept = postalCode.slice(0, 2);
  const cityDept = CITY_TO_DEPARTMENT[normalizeCity(city)];
  if (!cityDept) return false;
  return !cityDept.startsWith(postalDept);
}

// ─── DB detectors ────────────────────────────────────────────────────────

async function hasDuplicatePhone7d(
  phone: string | undefined,
  ctx: ScoreContext
): Promise<boolean> {
  if (!phone) return false;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await ctx.supabase
    .from("quote_requests")
    .select("id", { count: "exact", head: true })
    .eq("client_phone", phone)
    .gte("created_at", sevenDaysAgo)
    .neq("id", ctx.quoteId);
  return (count ?? 0) > 0;
}

async function hasDuplicateEmail7d(
  email: string | undefined,
  ctx: ScoreContext
): Promise<boolean> {
  if (!email) return false;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await ctx.supabase
    .from("quote_requests")
    .select("id", { count: "exact", head: true })
    .eq("client_email", email.toLowerCase())
    .gte("created_at", sevenDaysAgo)
    .neq("id", ctx.quoteId);
  return (count ?? 0) > 0;
}

// ─── Aggregator ──────────────────────────────────────────────────────────

export async function scoreLead(
  lead: LeadInput,
  ctx: ScoreContext
): Promise<{ score: number; reasons: FraudReason[] }> {
  const reasons: FraudReason[] = [];

  if (hasHoneypot(lead.honeypot)) {
    reasons.push({ code: "honeypot_filled", label: "Bot (champ piégé rempli)", weight: 100 });
  }
  if (isDisposableEmail(lead.email)) {
    reasons.push({ code: "disposable_email", label: "Email jetable", weight: 50 });
  }
  const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
  if (hasSuspiciousName(lead.firstName) || hasSuspiciousName(lead.lastName)) {
    reasons.push({ code: "suspicious_name", label: "Nom / prénom suspect", weight: 20 });
  }
  if (hasUrlInNotes(lead.notes)) {
    reasons.push({ code: "url_in_notes", label: "URL dans les notes", weight: 40 });
  }
  if (hasForeignScriptOrSpam(lead.notes, fullName)) {
    reasons.push({ code: "foreign_script_or_spam", label: "Texte étranger / spam", weight: 35 });
  }
  if (hasPostalMismatch(lead.fromPostalCode, lead.fromCity)) {
    reasons.push({ code: "postal_mismatch", label: "Code postal / ville incohérents", weight: 30 });
  }

  const [dupPhone, dupEmail] = await Promise.all([
    hasDuplicatePhone7d(lead.phone, ctx),
    hasDuplicateEmail7d(lead.email, ctx),
  ]);
  if (dupPhone) {
    reasons.push({ code: "dup_phone_7d", label: "Téléphone déjà utilisé (<7j)", weight: 40 });
  }
  if (dupEmail) {
    reasons.push({ code: "dup_email_7d", label: "Email déjà utilisé (<7j)", weight: 35 });
  }

  const score = reasons.reduce((sum, r) => sum + r.weight, 0);
  return { score, reasons };
}
