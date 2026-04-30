import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { installSupabaseAuthNoiseFilter, isExpectedSupabaseAuthNoise } from "./console-filter";

describe("isExpectedSupabaseAuthNoise", () => {
  it("matches refresh_token_not_found AuthApiError", () => {
    const err = Object.assign(new Error("Invalid Refresh Token"), {
      __isAuthError: true,
      status: 400,
      code: "refresh_token_not_found",
    });
    expect(isExpectedSupabaseAuthNoise([err])).toBe(true);
  });

  it("matches refresh_token_already_used AuthApiError", () => {
    const err = Object.assign(new Error("Already used"), {
      __isAuthError: true,
      status: 400,
      code: "refresh_token_already_used",
    });
    expect(isExpectedSupabaseAuthNoise([err])).toBe(true);
  });

  it("matches when error is not the first arg", () => {
    const err = Object.assign(new Error("..."), {
      __isAuthError: true,
      code: "refresh_token_not_found",
    });
    expect(isExpectedSupabaseAuthNoise(["context msg", err])).toBe(true);
  });

  it("does NOT match other AuthApiErrors (e.g. invalid_credentials)", () => {
    const err = Object.assign(new Error("Bad creds"), {
      __isAuthError: true,
      status: 400,
      code: "invalid_credentials",
    });
    expect(isExpectedSupabaseAuthNoise([err])).toBe(false);
  });

  it("does NOT match plain errors with refresh_token in message", () => {
    expect(isExpectedSupabaseAuthNoise([new Error("refresh_token_not_found")])).toBe(false);
  });

  it("does NOT match arbitrary objects with the code property", () => {
    expect(isExpectedSupabaseAuthNoise([{ code: "refresh_token_not_found" }])).toBe(false);
  });

  it("does NOT match when there are no args", () => {
    expect(isExpectedSupabaseAuthNoise([])).toBe(false);
  });
});

describe("installSupabaseAuthNoiseFilter", () => {
  let originalError: typeof console.error;
  let underlying: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalError = console.error;
    underlying = vi.fn();
    console.error = underlying as unknown as typeof console.error;
  });

  afterEach(() => {
    console.error = originalError;
  });

  it("swallows refresh_token_not_found errors", () => {
    const restore = installSupabaseAuthNoiseFilter();
    const err = Object.assign(new Error("Invalid Refresh Token"), {
      __isAuthError: true,
      code: "refresh_token_not_found",
    });
    console.error(err);
    expect(underlying).not.toHaveBeenCalled();
    restore();
  });

  it("forwards unrelated errors unchanged", () => {
    const restore = installSupabaseAuthNoiseFilter();
    console.error("a real error", { foo: 1 });
    expect(underlying).toHaveBeenCalledWith("a real error", { foo: 1 });
    restore();
  });

  it("restore() reverts to the original console.error", () => {
    const restore = installSupabaseAuthNoiseFilter();
    restore();
    const err = Object.assign(new Error("..."), {
      __isAuthError: true,
      code: "refresh_token_not_found",
    });
    console.error(err);
    expect(underlying).toHaveBeenCalledOnce();
  });

  it("is idempotent — calling install twice does not double-wrap", () => {
    const restore1 = installSupabaseAuthNoiseFilter();
    const restore2 = installSupabaseAuthNoiseFilter();
    console.error("plain log");
    expect(underlying).toHaveBeenCalledTimes(1);
    restore2();
    restore1();
  });
});
