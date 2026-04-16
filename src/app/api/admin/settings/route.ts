import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const SETTINGS_FILE = join(process.cwd(), "admin-settings.json");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadSettings(): Record<string, any> {
  if (existsSync(SETTINGS_FILE)) {
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
  }
  return {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveSettings(settings: Record<string, any>) {
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

export async function GET() {
  const settings = loadSettings();
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
  const current = loadSettings();

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
  saveSettings(newSettings);

  // Update the Mollie API key in the environment for this process
  const activeKey = newSettings.mollieMode === "live"
    ? newSettings.mollieLiveKey
    : newSettings.mollieTestKey;

  if (activeKey) {
    process.env.MOLLIE_API_KEY = activeKey;
  }

  return NextResponse.json({ success: true });
}
