import { createUntypedAdminClient } from "@/lib/supabase/admin";

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
export const MAX_ATTEMPTS = 3;
export const ATTEMPT_LOCK_MS = 60 * 60 * 1000; // 1 hour
export const ABANDON_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateOtp(length: number = OTP_LENGTH): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return String(Math.floor(min + Math.random() * (max - min)));
}

export function otpExpiryIso(now: Date = new Date()): string {
  return new Date(now.getTime() + OTP_EXPIRY_MS).toISOString();
}

export type Channel = "email" | "phone";

export interface RateLimitState {
  lastSentAt: string | null;
  attempts: number;
  createdAt: string;
}

export interface RateLimitResult {
  ok: boolean;
  reason?: "cooldown" | "locked" | "abandoned";
  retryAfterSec?: number;
}

/** Decide whether a send/resend is allowed. Does not mutate state. */
export function checkResendAllowed(state: RateLimitState, now: Date = new Date()): RateLimitResult {
  const createdMs = now.getTime() - new Date(state.createdAt).getTime();
  if (createdMs > ABANDON_AFTER_MS) {
    return { ok: false, reason: "abandoned" };
  }
  if (state.lastSentAt) {
    const elapsedMs = now.getTime() - new Date(state.lastSentAt).getTime();
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        reason: "cooldown",
        retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000),
      };
    }
  }
  if (state.attempts >= MAX_ATTEMPTS && state.lastSentAt) {
    const elapsedMs = now.getTime() - new Date(state.lastSentAt).getTime();
    if (elapsedMs < ATTEMPT_LOCK_MS) {
      return {
        ok: false,
        reason: "locked",
        retryAfterSec: Math.ceil((ATTEMPT_LOCK_MS - elapsedMs) / 1000),
      };
    }
  }
  return { ok: true };
}

/** Check if a code is valid against the stored code + expiry. */
export function verifyCode(
  input: string,
  stored: string | null,
  expires: string | null,
  now: Date = new Date()
): { ok: boolean; reason?: "missing" | "expired" | "mismatch" } {
  if (!stored) return { ok: false, reason: "missing" };
  if (expires && new Date(expires).getTime() < now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (stored.trim() !== input.trim()) return { ok: false, reason: "mismatch" };
  return { ok: true };
}

/** Mask an email for display: "benais***@gmail.com" */
export function maskEmailForDisplay(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = Math.min(4, Math.max(1, local.length - 3));
  return `${local.slice(0, visible)}${"*".repeat(3)}@${domain}`;
}

/** Mask a phone for display: "06 ** ** ** 12" */
export function maskPhoneForDisplay(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `${digits.slice(0, 2)} ** ** ** ${digits.slice(-2)}`;
}

/** Type-safe shortcut for grabbing quote_requests row fields needed everywhere. */
export async function loadQuoteForVerification(quoteId: string) {
  const supabase = createUntypedAdminClient();
  const { data } = await supabase
    .from("quote_requests")
    .select(
      "id, created_at, distributed_at, client_name, client_first_name, client_last_name, client_email, client_phone, email_verified, email_verification_code, email_verification_expires, email_verification_attempts, email_verification_last_sent_at, phone_verified, phone_verification_code, phone_verification_expires, phone_verification_attempts, phone_verification_last_sent_at"
    )
    .eq("id", quoteId)
    .single();
  return data;
}
