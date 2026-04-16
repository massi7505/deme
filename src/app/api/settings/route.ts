import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const SETTINGS_FILE = join(process.cwd(), "admin-settings.json");

const DEFAULTS = {
  siteName: "Demenagement24",
  siteUrl: "https://demenagement24.com",
  contactEmail: "contact@demenagement24.com",
  contactPhone: "01 23 45 67 89",
  contactAddress: "Paris, France",
};

export async function GET() {
  let settings = DEFAULTS;

  if (existsSync(SETTINGS_FILE)) {
    try {
      const saved = JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
      settings = {
        siteName: saved.siteName || DEFAULTS.siteName,
        siteUrl: saved.siteUrl || DEFAULTS.siteUrl,
        contactEmail: saved.contactEmail || DEFAULTS.contactEmail,
        contactPhone: saved.contactPhone || DEFAULTS.contactPhone,
        contactAddress: saved.contactAddress || DEFAULTS.contactAddress,
      };
    } catch {
      // Use defaults
    }
  }

  return NextResponse.json(settings);
}
