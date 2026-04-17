import crypto from "crypto";

const DIDIT_BASE_URL = "https://verification.didit.me";

export type DiditStatus =
  | "Not Started"
  | "In Progress"
  | "In Review"
  | "Approved"
  | "Declined"
  | "Abandoned"
  | "Expired";

export type DiditSession = {
  session_id: string;
  url: string;
  // Optional fields returned by didit v3 — kept as unknown so we don't
  // couple to the full response shape.
  session_number?: number;
  status?: string;
  workflow_id?: string;
};

export type DiditWebhookPayload = {
  session_id: string;
  status: DiditStatus;
  vendor_data: string;
  webhook_type?: string;
  decision?: {
    status?: string;
    reject_reason?: string;
    [k: string]: unknown;
  };
  [k: string]: unknown;
};

function apiKey(): string {
  const k = process.env.DIDIT_API_KEY;
  if (!k) throw new Error("DIDIT_API_KEY not set");
  return k;
}

function webhookSecret(): string {
  const s = process.env.DIDIT_WEBHOOK_SECRET;
  if (!s) throw new Error("DIDIT_WEBHOOK_SECRET not set");
  return s;
}

function workflowId(): string {
  const w = process.env.DIDIT_WORKFLOW_ID;
  if (!w) throw new Error("DIDIT_WORKFLOW_ID not set");
  return w;
}

export async function createSession(args: {
  companyId: string;
  email: string;
  callbackUrl: string;
}): Promise<DiditSession> {
  const response = await fetch(`${DIDIT_BASE_URL}/v3/session/`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: workflowId(),
      vendor_data: args.companyId,
      callback: args.callbackUrl,
      contact_details: { email: args.email },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`didit createSession failed ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as DiditSession & {
    verification_url?: string;
  };

  // didit v3 returns `url`; older/alternate doc mentions `verification_url`.
  // Support both so we don't break if the API shape shifts.
  const verificationUrl = data.url ?? data.verification_url;
  if (!verificationUrl || !data.session_id) {
    throw new Error(
      `didit createSession returned unexpected shape: ${JSON.stringify(data)}`
    );
  }

  return { ...data, url: verificationUrl };
}

export async function getSession(
  sessionId: string
): Promise<{ status: DiditStatus; [k: string]: unknown }> {
  const response = await fetch(
    `${DIDIT_BASE_URL}/v3/session/${sessionId}/decision/`,
    {
      method: "GET",
      headers: { "x-api-key": apiKey() },
    }
  );
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`didit getSession failed ${response.status}: ${errText}`);
  }
  return await response.json();
}

export function verifyWebhook(args: {
  rawBody: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
}): DiditWebhookPayload {
  if (!args.signatureHeader) throw new Error("missing signature header");

  // Timestamp is optional — some didit setups don't send it. If present,
  // enforce a 300s replay window.
  if (args.timestampHeader) {
    const ts = parseInt(args.timestampHeader, 10);
    if (!Number.isFinite(ts)) throw new Error("invalid x-timestamp");
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > 300) {
      throw new Error(
        `stale webhook: timestamp skew ${Math.abs(nowSec - ts)}s`
      );
    }
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret())
    .update(args.rawBody)
    .digest("hex");

  // Accept signature as raw hex, optionally prefixed with "sha256=" (Stripe-
  // style).
  const given = args.signatureHeader.trim().replace(/^sha256=/, "");

  const sameLen = given.length === expected.length;
  if (
    !sameLen ||
    !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  ) {
    throw new Error(
      `signature mismatch (expected=${expected.slice(0, 8)}… given=${given.slice(0, 8)}…)`
    );
  }

  return JSON.parse(args.rawBody) as DiditWebhookPayload;
}

export function mapDiditStatus(
  s: DiditStatus
): "pending" | "in_review" | "approved" | "rejected" {
  switch (s) {
    case "Approved":
      return "approved";
    case "Declined":
      return "rejected";
    case "In Review":
      return "in_review";
    default:
      return "pending";
  }
}
