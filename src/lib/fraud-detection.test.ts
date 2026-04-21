import { describe, it, expect } from "vitest";
import {
  isDisposableEmail,
  hasHoneypot,
  hasSuspiciousName,
  hasUrlInNotes,
  hasForeignScriptOrSpam,
  hasPostalMismatch,
  normalizeEmail,
  normalizePhone,
  FRAUD_THRESHOLD,
  HONEYPOT_FIELD_NAME,
  scoreLead as scoreLeadFn,
} from "./fraud-detection";

describe("isDisposableEmail", () => {
  it("flags a disposable domain", () => {
    expect(isDisposableEmail("user@yopmail.com")).toBe(true);
    expect(isDisposableEmail("Test@MAILINATOR.COM")).toBe(true);
  });
  it("does not flag a mainstream domain", () => {
    expect(isDisposableEmail("user@gmail.com")).toBe(false);
    expect(isDisposableEmail("foo@orange.fr")).toBe(false);
  });
  it("returns false when email is missing or malformed", () => {
    expect(isDisposableEmail(undefined)).toBe(false);
    expect(isDisposableEmail("")).toBe(false);
    expect(isDisposableEmail("not-an-email")).toBe(false);
  });
});

describe("hasHoneypot", () => {
  it("flags when honeypot field has content", () => {
    expect(hasHoneypot("anything")).toBe(true);
    expect(hasHoneypot("  padded  ")).toBe(true);
  });
  it("does not flag when empty or whitespace", () => {
    expect(hasHoneypot("")).toBe(false);
    expect(hasHoneypot("   ")).toBe(false);
    expect(hasHoneypot(undefined)).toBe(false);
  });
});

describe("hasSuspiciousName", () => {
  it("flags names with digits or symbols", () => {
    expect(hasSuspiciousName("jean3")).toBe(true);
    expect(hasSuspiciousName("jean@paul")).toBe(true);
  });
  it("flags ALL-CAPS names >= 3 chars", () => {
    expect(hasSuspiciousName("DUPONT")).toBe(true);
  });
  it("does not flag real French names", () => {
    expect(hasSuspiciousName("Jean-Pierre")).toBe(false);
    expect(hasSuspiciousName("O'Brien")).toBe(false);
    expect(hasSuspiciousName("Élise")).toBe(false);
    expect(hasSuspiciousName("Mo")).toBe(false);
  });
  it("handles missing name", () => {
    expect(hasSuspiciousName("")).toBe(false);
    expect(hasSuspiciousName(undefined)).toBe(false);
  });
});

describe("hasUrlInNotes", () => {
  it("flags http/https URLs", () => {
    expect(hasUrlInNotes("visit https://example.com for more")).toBe(true);
    expect(hasUrlInNotes("http://foo.bar")).toBe(true);
  });
  it("flags www. prefix", () => {
    expect(hasUrlInNotes("go to www.example.com")).toBe(true);
  });
  it("flags bare TLDs", () => {
    expect(hasUrlInNotes("my site is coolshop.com")).toBe(true);
    expect(hasUrlInNotes("contact me at site.xyz")).toBe(true);
  });
  it("does not flag normal French moving notes", () => {
    expect(hasUrlInNotes("J'ai un piano fragile, merci de faire attention")).toBe(false);
    expect(hasUrlInNotes("")).toBe(false);
    expect(hasUrlInNotes(undefined)).toBe(false);
  });
});

describe("hasForeignScriptOrSpam", () => {
  it("flags Cyrillic script", () => {
    expect(hasForeignScriptOrSpam("Привет мир", "")).toBe(true);
  });
  it("flags CJK script", () => {
    expect(hasForeignScriptOrSpam("你好", "")).toBe(true);
  });
  it("flags spam keywords", () => {
    expect(hasForeignScriptOrSpam("make money with casino now", "")).toBe(true);
    expect(hasForeignScriptOrSpam("bitcoin loan", "")).toBe(true);
  });
  it("does not flag normal French content", () => {
    expect(hasForeignScriptOrSpam("Besoin d'un devis rapide", "Jean Dupont")).toBe(false);
  });
});

describe("hasPostalMismatch", () => {
  it("flags when postal department does not match city department", () => {
    expect(hasPostalMismatch("06000", "Paris")).toBe(true);
  });
  it("does not flag matching postal / city", () => {
    expect(hasPostalMismatch("75001", "Paris")).toBe(false);
    expect(hasPostalMismatch("06000", "Nice")).toBe(false);
  });
  it("skips gracefully with incomplete data (no false positive)", () => {
    expect(hasPostalMismatch(undefined, "Paris")).toBe(false);
    expect(hasPostalMismatch("75001", undefined)).toBe(false);
    expect(hasPostalMismatch("abc", "Paris")).toBe(false);
  });
  it("does not flag when the city is unknown to us (data gap, not fraud)", () => {
    expect(hasPostalMismatch("75001", "Pouet-sur-Mer")).toBe(false);
  });
});

describe("constants", () => {
  it("threshold is 50", () => {
    expect(FRAUD_THRESHOLD).toBe(50);
  });
  it("honeypot field name is stable", () => {
    expect(HONEYPOT_FIELD_NAME).toBe("__nickname");
  });
});

describe("normalizeEmail", () => {
  it("lower-cases and trims", () => {
    expect(normalizeEmail("  Jean@Gmail.COM  ")).toBe("jean@gmail.com");
  });
});

describe("normalizePhone", () => {
  it("folds leading 0 to 33", () => {
    expect(normalizePhone("06 12 34 56 78")).toBe("33612345678");
  });
  it("folds +33 to 33", () => {
    expect(normalizePhone("+33 6 12 34 56 78")).toBe("33612345678");
  });
  it("folds 0033 to 33", () => {
    expect(normalizePhone("0033612345678")).toBe("33612345678");
  });
  it("keeps already-canonical", () => {
    expect(normalizePhone("33612345678")).toBe("33612345678");
  });
  it("strips non-digits on unknown format", () => {
    expect(normalizePhone("abc-123-def")).toBe("123");
  });
});

describe("scoreLead", () => {
  function mockCtx(dupPhone = false, dupEmail = false) {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: (col: string) => ({
            gte: () => ({
              neq: async () => {
                if (col === "client_phone_normalized") return { count: dupPhone ? 1 : 0 };
                if (col === "client_email_normalized") return { count: dupEmail ? 1 : 0 };
                return { count: 0 };
              },
            }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof scoreLeadFn>[1]["supabase"];
    return { supabase, quoteId: "q-test" };
  }

  it("returns score 0 and empty reasons for a clean lead", async () => {
    const result = await scoreLeadFn(
      {
        email: "jean@gmail.com",
        phone: "0612345678",
        firstName: "Jean",
        lastName: "Dupont",
        notes: "J'ai un piano",
        fromPostalCode: "75001",
        fromCity: "Paris",
      },
      mockCtx()
    );
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it("trips honeypot alone (score 100)", async () => {
    const result = await scoreLeadFn(
      { email: "jean@gmail.com", honeypot: "bot-fill" },
      mockCtx()
    );
    expect(result.score).toBe(100);
    expect(result.reasons.map((r) => r.code)).toContain("honeypot_filled");
  });

  it("trips disposable email alone (score 50)", async () => {
    const result = await scoreLeadFn(
      { email: "user@yopmail.com" },
      mockCtx()
    );
    expect(result.score).toBe(50);
    expect(result.reasons.map((r) => r.code)).toEqual(["disposable_email"]);
  });

  it("sums multiple signals", async () => {
    const result = await scoreLeadFn(
      {
        email: "user@yopmail.com",
        firstName: "DUPONT",
        notes: "visit https://scam.example",
      },
      mockCtx()
    );
    // disposable_email (50) + suspicious_name (20) + url_in_notes (40) = 110
    expect(result.score).toBe(110);
    const codes = result.reasons.map((r) => r.code);
    expect(codes).toContain("disposable_email");
    expect(codes).toContain("suspicious_name");
    expect(codes).toContain("url_in_notes");
  });

  it("surfaces dup_phone_7d via mocked DB", async () => {
    const result = await scoreLeadFn(
      { phone: "0612345678", email: "jean@gmail.com" },
      mockCtx(true, false)
    );
    expect(result.reasons.map((r) => r.code)).toContain("dup_phone_7d");
  });

  it("surfaces dup_email_7d via mocked DB", async () => {
    const result = await scoreLeadFn(
      { phone: "0612345678", email: "jean@gmail.com" },
      mockCtx(false, true)
    );
    expect(result.reasons.map((r) => r.code)).toContain("dup_email_7d");
  });
});
