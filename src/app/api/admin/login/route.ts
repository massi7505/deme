import { NextRequest, NextResponse } from "next/server";
import { generateAdminToken } from "@/lib/admin-auth";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";
import { BRAND } from "@/lib/brand";

const ADMIN_EMAIL = BRAND.adminEmail || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin2024!";

export async function POST(request: NextRequest) {
  const ipCheck = await checkIpRateLimit(getClientIp(request), "admin-login", 300, 5);
  if (!ipCheck.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Merci de réessayer plus tard.", retryAfterSec: ipCheck.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSec ?? 60) } }
    );
  }

  const { email, password } = await request.json();

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Email ou mot de passe incorrect" },
      { status: 401 }
    );
  }

  const token = generateAdminToken(email);
  return NextResponse.json({ success: true, token });
}
