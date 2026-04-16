import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  const token = auth?.replace("Bearer ", "");

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
