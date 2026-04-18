import { describe, it, expect } from "vitest";
import { computeFrenchVAT } from "./sirene";

describe("computeFrenchVAT", () => {
  it("computes valid VAT from SIREN", () => {
    // SIREN 732829320 → key = (12 + 3 * (732829320 % 97)) % 97 = 44
    expect(computeFrenchVAT("732829320")).toBe("FR44732829320");
  });

  it("pads single-digit key with leading zero", () => {
    // SIREN 100000015 → key = (12 + 3 * (100000015 % 97)) % 97 = 9
    expect(computeFrenchVAT("100000015")).toBe("FR09100000015");
  });

  it("returns null for non-numeric input", () => {
    expect(computeFrenchVAT("invalid")).toBeNull();
  });

  it("returns null for wrong length", () => {
    expect(computeFrenchVAT("12345")).toBeNull();
  });
});
