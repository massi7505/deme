import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createUntypedAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { data: { siteName: "Test" } } }),
        }),
      }),
    }),
  }),
}));

describe("smsfactorFetch", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.SMSFACTOR_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetModules();
  });

  it("sends Accept: application/json so SMSFactor returns JSON, not XML", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 1, message: "OK" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { sendOtpSMS } = await import("./smsfactor");
    await sendOtpSMS("+33612345678", "123456");

    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Accept).toBe("application/json");
  });

  it("throws a readable error when SMSFactor returns XML on HTTP 200", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(`<?xml version="1.0"?><response><status>0</status></response>`, {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      })
    ) as unknown as typeof fetch;

    const { sendOtpSMS } = await import("./smsfactor");
    await expect(sendOtpSMS("+33612345678", "123456")).rejects.toThrow(
      /SMSFactor.*non-JSON/i
    );
  });
});
