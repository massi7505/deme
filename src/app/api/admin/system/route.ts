import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getSystemHealth } from "@/lib/system-health";

// Always fresh. Frontend polls every 60s — no need for an extra cache layer.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  const health = await getSystemHealth();
  return NextResponse.json(health);
}
