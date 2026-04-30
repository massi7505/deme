import crypto from "crypto";
import { requireSecretEnv } from "@/lib/secrets";

// Distinct from ADMINJS_COOKIE_SECRET so the same key isn't reused for two
// HMAC purposes (admin session cookie vs. reconfirm email tokens). Falls
// back to ADMINJS_COOKIE_SECRET so already-issued tokens (signed before
// the split) still verify until they expire (14d TTL).
const SECRET = requireSecretEnv("RECONFIRM_TOKEN_SECRET", {
  fallbackEnvVar: "ADMINJS_COOKIE_SECRET",
});

export type ReconfirmAction = "yes" | "no";

/**
 * Signed HMAC token for the client re-engagement email. Encodes the
 * quote_request_id + the allowed action + an expiry so old email clicks
 * can't be replayed weeks later. Stateless — no DB table required; the
 * reconfirm API just verifies the signature and expiry.
 */
export function generateReconfirmToken(
  quoteRequestId: string,
  action: ReconfirmAction,
  ttlDays = 14
): string {
  const exp = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
  const payload = `${quoteRequestId}:${action}:${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyReconfirmToken(
  token: string
): { quoteRequestId: string; action: ReconfirmAction } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return null;
    const [quoteRequestId, action, expStr, sig] = parts;
    if (action !== "yes" && action !== "no") return null;
    const exp = parseInt(expStr, 10);
    if (!Number.isFinite(exp) || Date.now() > exp) return null;

    const payload = `${quoteRequestId}:${action}:${expStr}`;
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    return { quoteRequestId, action: action as ReconfirmAction };
  } catch {
    return null;
  }
}
