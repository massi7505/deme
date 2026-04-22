import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMINJS_COOKIE_SECRET ?? "dev-admin-secret-change-me";

/**
 * Guard helper for /api/admin/* routes. Reads the admin_token cookie,
 * verifies the HMAC + expiry. Returns null when the caller is a valid
 * admin (route may proceed). Returns a 401 NextResponse when not — the
 * route MUST return this response immediately.
 *
 * Usage:
 *   const auth = requireAdmin(request);
 *   if (auth) return auth;
 *   // ... proceed with the handler
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const token = request.cookies.get("admin_token")?.value;
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return null;
}

export function generateAdminToken(email: string): string {
  const payload = `${email}:${Date.now() + 86400000}`;
  const hmac = crypto.createHmac("sha256", ADMIN_SECRET);
  hmac.update(payload);
  const sig = hmac.digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64");
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;

    const [, expiryStr, sig] = parts;
    const expiry = parseInt(expiryStr);

    if (Date.now() > expiry) return false;

    const payload = `${parts[0]}:${expiryStr}`;
    const hmac = crypto.createHmac("sha256", ADMIN_SECRET);
    hmac.update(payload);
    const expectedSig = hmac.digest("hex");

    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}
