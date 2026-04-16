import { createUntypedAdminClient } from "@/lib/supabase/admin";

const SMSFACTOR_API_URL = "https://api.smsfactor.com";

async function getSiteName(): Promise<string> {
  try {
    const supabase = createUntypedAdminClient();
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).single();
    return (data?.data as Record<string, string>)?.siteName || "Demenagement24";
  } catch {
    return "Demenagement24";
  }
}

async function smsfactorFetch(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${SMSFACTOR_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SMSFACTOR_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SMSFactor API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function sendLeadSMS(
  phone: string,
  leadData: {
    fromCity: string;
    toCity: string;
    moveDate?: string;
  }
) {
  const dateStr = leadData.moveDate ? ` le ${leadData.moveDate}` : "";

  return smsfactorFetch("/send", {
    to: normalizePhone(phone),
    sender: "Demenag24",
    text: `Nouvelle demande de demenagement : ${leadData.fromCity} -> ${leadData.toCity}${dateStr}. Connectez-vous pour voir les details.`,
  });
}

export async function sendOtpSMS(phone: string, code: string) {
  const siteName = await getSiteName();
  return smsfactorFetch("/send", {
    to: normalizePhone(phone),
    sender: "Demenag24",
    text: `Votre code de verification ${siteName} : ${code}. Valable 10 minutes.`,
  });
}

export async function sendConfirmationSMS(
  phone: string,
  message: string
) {
  return smsfactorFetch("/send", {
    to: normalizePhone(phone),
    sender: "Demenag24",
    text: message,
  });
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, "");

  // Convert French local format to international
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "+33" + cleaned.slice(1);
  }
  if (cleaned.startsWith("33") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  return cleaned;
}
