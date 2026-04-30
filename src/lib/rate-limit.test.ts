import { describe, it, expect } from "vitest";
import { getClientIp } from "./rate-limit";

function makeReq(opts: {
  ip?: string;
  headers?: Record<string, string>;
}): import("next/server").NextRequest {
  const headers = new Headers(opts.headers ?? {});
  // NextRequest.ip is set by Vercel's edge; we mimic it via Object.defineProperty.
  const req = { ip: opts.ip, headers } as unknown as import("next/server").NextRequest;
  return req;
}

describe("getClientIp", () => {
  it("prefers request.ip (trusted Vercel edge value) over headers", () => {
    const req = makeReq({
      ip: "10.0.0.1",
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
      },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip when request.ip is missing", () => {
    const req = makeReq({
      headers: {
        "x-forwarded-for": "1.2.3.4",
        "x-real-ip": "5.6.7.8",
      },
    });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("does NOT trust a spoofed leftmost X-Forwarded-For when request.ip is set", () => {
    const req = makeReq({
      ip: "10.0.0.1",
      headers: {
        // Simulated attacker-controlled XFF
        "x-forwarded-for": "1.1.1.1, 2.2.2.2",
      },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("when only XFF is available (local dev), uses the rightmost (proxy view) not the leftmost", () => {
    const req = makeReq({
      headers: {
        // Attacker injects "1.1.1.1" as leftmost; rightmost is the real proxy hop.
        "x-forwarded-for": "1.1.1.1, 5.6.7.8",
      },
    });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("returns 'unknown' when no source is available", () => {
    expect(getClientIp(makeReq({}))).toBe("unknown");
  });
});
