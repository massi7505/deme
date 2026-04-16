import crypto from "crypto";

const SUMSUB_BASE_URL = "https://api.sumsub.com";

function createSignature(
  ts: number,
  httpMethod: string,
  url: string,
  body?: string
): string {
  const hmac = crypto.createHmac("sha256", process.env.SUMSUB_SECRET_KEY!);
  hmac.update(ts + httpMethod.toUpperCase() + url);
  if (body) hmac.update(body);
  return hmac.digest("hex");
}

async function sumsubFetch(
  method: string,
  path: string,
  body?: Record<string, unknown>
) {
  const ts = Math.floor(Date.now() / 1000);
  const bodyStr = body ? JSON.stringify(body) : undefined;
  const signature = createSignature(ts, method, path, bodyStr);

  const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-App-Token": process.env.SUMSUB_APP_TOKEN!,
      "X-App-Access-Ts": String(ts),
      "X-App-Access-Sig": signature,
    },
    body: bodyStr,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sumsub API error ${response.status}: ${error}`);
  }

  return response.json();
}

export async function createApplicant(
  companyId: string,
  email: string,
  companyName?: string
) {
  return sumsubFetch("POST", "/resources/applicants", {
    externalUserId: companyId,
    email,
    type: "company",
    info: {
      companyInfo: {
        companyName: companyName ?? "",
        country: "FRA",
      },
    },
  });
}

export async function generateAccessToken(
  applicantId: string,
  levelName = "basic-kyb-level"
) {
  return sumsubFetch(
    "POST",
    `/resources/accessTokens?userId=${applicantId}&levelName=${levelName}`,
    {}
  );
}

export async function getApplicantStatus(applicantId: string) {
  return sumsubFetch(
    "GET",
    `/resources/applicants/${applicantId}/requiredIdDocsStatus`
  );
}

export async function getApplicantInfo(applicantId: string) {
  return sumsubFetch("GET", `/resources/applicants/${applicantId}/one`);
}

export type SumsubWebhookPayload = {
  type: string;
  applicantId: string;
  inspectionId: string;
  correlationId: string;
  externalUserId: string;
  reviewResult?: {
    reviewAnswer: "GREEN" | "RED";
    rejectLabels?: string[];
    reviewRejectType?: string;
  };
  reviewStatus?: string;
  createdAt: string;
};

export function verifySumsubWebhook(
  body: string,
  signature: string
): boolean {
  const hmac = crypto.createHmac("sha256", process.env.SUMSUB_SECRET_KEY!);
  hmac.update(body);
  const expectedSignature = hmac.digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
