import crypto from "crypto";

const ADMIN_SECRET = process.env.ADMINJS_COOKIE_SECRET ?? "demenagement24-admin-secret-key";

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
