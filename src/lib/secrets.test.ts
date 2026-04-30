import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requireSecretEnv } from "./secrets";

describe("requireSecretEnv", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    warnSpy.mockRestore();
  });

  describe("production", () => {
    beforeEach(() => {
      (process.env as Record<string, string>).NODE_ENV = "production";
    });

    it("throws if the env var is missing", () => {
      delete process.env.MY_SECRET;
      expect(() => requireSecretEnv("MY_SECRET")).toThrow(/MY_SECRET.*missing/);
    });

    it("throws if the env var matches a dev placeholder", () => {
      process.env.MY_SECRET = "dev-admin-secret-change-me";
      expect(() => requireSecretEnv("MY_SECRET")).toThrow(/dev placeholder/);
    });

    it("throws if the env var is too short", () => {
      process.env.MY_SECRET = "short";
      expect(() => requireSecretEnv("MY_SECRET")).toThrow(/shorter than 16/);
    });

    it("returns the value when properly set", () => {
      process.env.MY_SECRET = "a-strong-and-long-enough-secret";
      expect(requireSecretEnv("MY_SECRET")).toBe("a-strong-and-long-enough-secret");
    });

    it("falls back to fallbackEnvVar when primary is missing", () => {
      delete process.env.PRIMARY_SECRET;
      process.env.LEGACY_SECRET = "a-strong-and-long-enough-legacy";
      expect(
        requireSecretEnv("PRIMARY_SECRET", { fallbackEnvVar: "LEGACY_SECRET" })
      ).toBe("a-strong-and-long-enough-legacy");
    });

    it("primary takes precedence over fallback", () => {
      process.env.PRIMARY_SECRET = "a-strong-and-long-enough-primary";
      process.env.LEGACY_SECRET = "a-strong-and-long-enough-legacy";
      expect(
        requireSecretEnv("PRIMARY_SECRET", { fallbackEnvVar: "LEGACY_SECRET" })
      ).toBe("a-strong-and-long-enough-primary");
    });
  });

  describe("dev / test", () => {
    beforeEach(() => {
      (process.env as Record<string, string>).NODE_ENV = "test";
    });

    it("warns and returns a random secret when missing", () => {
      delete process.env.MY_SECRET;
      const value = requireSecretEnv("MY_SECRET");
      expect(value).toMatch(/^[a-f0-9]{64}$/);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("warns and returns a random secret when placeholder", () => {
      process.env.MY_SECRET = "dev-admin-secret-change-me";
      const value = requireSecretEnv("MY_SECRET");
      expect(value).toMatch(/^[a-f0-9]{64}$/);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("returns the value when properly set even in dev", () => {
      process.env.MY_SECRET = "a-strong-and-long-enough-dev-secret";
      expect(requireSecretEnv("MY_SECRET")).toBe("a-strong-and-long-enough-dev-secret");
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("two consecutive calls in dev return DIFFERENT randoms (no caching)", () => {
      delete process.env.MY_SECRET;
      const a = requireSecretEnv("MY_SECRET");
      const b = requireSecretEnv("MY_SECRET");
      expect(a).not.toBe(b);
    });
  });
});
