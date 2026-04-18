import { describe, it, expect } from "vitest";
import { isHardReason, shouldFlagDefect, HARD_REASONS, DEFECT_THRESHOLD } from "./defect-detection";

describe("isHardReason", () => {
  it("returns true for hard reasons", () => {
    expect(isHardReason("Fausse demande")).toBe(true);
    expect(isHardReason("Doublon")).toBe(true);
    expect(isHardReason("Numéro invalide")).toBe(true);
    expect(isHardReason("Client déjà déménagé")).toBe(true);
  });

  it("returns false for soft reasons", () => {
    expect(isHardReason("Client déjà contacté")).toBe(false);
  });

  it("returns false for unknown reasons", () => {
    expect(isHardReason("foo")).toBe(false);
    expect(isHardReason("")).toBe(false);
  });
});

describe("shouldFlagDefect", () => {
  it("flags when at or above threshold", () => {
    expect(shouldFlagDefect(DEFECT_THRESHOLD)).toBe(true);
    expect(shouldFlagDefect(DEFECT_THRESHOLD + 1)).toBe(true);
  });

  it("does not flag below threshold", () => {
    expect(shouldFlagDefect(DEFECT_THRESHOLD - 1)).toBe(false);
    expect(shouldFlagDefect(0)).toBe(false);
  });
});

describe("constants", () => {
  it("threshold is 4", () => {
    expect(DEFECT_THRESHOLD).toBe(4);
  });
  it("hard reasons set has 4 entries", () => {
    expect(HARD_REASONS.size).toBe(4);
  });
});
