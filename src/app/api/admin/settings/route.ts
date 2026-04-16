import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadSettings(): Promise<Record<string, any>> {
  const supabase = createUntypedAdminClient();
  const { data } = await supabase
    .from("site_settings")
    .select("data")
    .eq("id", 1)
    .single();
  return data?.data || {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveSettings(settings: Record<string, any>) {
  const supabase = createUntypedAdminClient();
  await supabase
    .from("site_settings")
    .update({ data: settings, updated_at: new Date().toISOString() })
    .eq("id", 1);
}

export async function GET() {
  const settings = await loadSettings();
  // Never expose full Mollie keys to the frontend — mask them
  const masked = { ...settings };
  if (masked.mollieTestKey) {
    masked.mollieTestKey = masked.mollieTestKey.slice(0, 8) + "••••••••••••••••";
  }
  if (masked.mollieLiveKey) {
    masked.mollieLiveKey = masked.mollieLiveKey.slice(0, 8) + "••••••••••••••••";
  }
  return NextResponse.json(masked);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const current = await loadSettings();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {};
  for (const [key, value] of Object.entries(body)) {
    // Only update Mollie keys if they don't contain mask characters
    if ((key === "mollieTestKey" || key === "mollieLiveKey") && typeof value === "string" && value.includes("••")) {
      continue;
    }
    updates[key] = value;
  }

  const newSettings = { ...current, ...updates };
  await saveSettings(newSettings);

  // Update the Mollie API key in the environment for this process
  const activeKey = newSettings.mollieMode === "live"
    ? newSettings.mollieLiveKey
    : newSettings.mollieTestKey;

  if (activeKey) {
    process.env.MOLLIE_API_KEY = activeKey;
  }

  return NextResponse.json({ success: true });
}
