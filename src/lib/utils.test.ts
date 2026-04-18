import { describe, it, expect } from "vitest";
import { generateCompanySlug, slugify } from "./utils";

describe("slugify", () => {
  it("normalizes accents", () => {
    expect(slugify("Café Déménagement")).toBe("cafe-demenagement");
  });
});

describe("generateCompanySlug", () => {
  it("returns slug with 8-char suffix", () => {
    const result = generateCompanySlug("Mon Entreprise SARL");
    expect(result).toMatch(/^mon-entreprise-sarl-[a-z0-9]{8}$/);
  });

  it("normalizes accents", () => {
    const result = generateCompanySlug("Déménagement Café");
    expect(result).toMatch(/^demenagement-cafe-[a-z0-9]{8}$/);
  });
});
