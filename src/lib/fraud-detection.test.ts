import { describe, it, expect } from "vitest";
import {
  isDisposableEmail,
  hasHoneypot,
  hasSuspiciousName,
  hasUrlInNotes,
  hasForeignScriptOrSpam,
  hasPostalMismatch,
  FRAUD_THRESHOLD,
  HONEYPOT_FIELD_NAME,
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
