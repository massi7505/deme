import { describe, it, expect } from "vitest";
import { detectImageMimeFromBytes, ALLOWED_IMAGE_TYPES } from "./blob";

describe("detectImageMimeFromBytes", () => {
  it("recognizes JPEG by FF D8 FF magic bytes", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    expect(detectImageMimeFromBytes(bytes)).toBe("image/jpeg");
  });

  it("recognizes PNG by 89 50 4E 47 0D 0A 1A 0A magic bytes", () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(detectImageMimeFromBytes(bytes)).toBe("image/png");
  });

  it("recognizes WebP by RIFF...WEBP signature", () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x00, 0x00, 0x00, 0x00, // size (placeholder)
      0x57, 0x45, 0x42, 0x50, // "WEBP"
    ]);
    expect(detectImageMimeFromBytes(bytes)).toBe("image/webp");
  });

  it("recognizes ICO by 00 00 01 00 magic bytes", () => {
    const bytes = new Uint8Array([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]);
    expect(detectImageMimeFromBytes(bytes)).toBe("image/x-icon");
  });

  it("rejects SVG (XML text) — not in supported formats", () => {
    // SVG starts with "<?xml" or "<svg" — neither matches any magic-bytes signature
    const bytes = new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`);
    expect(detectImageMimeFromBytes(bytes)).toBeNull();
  });

  it("rejects HTML disguised as image (XSS payload)", () => {
    const bytes = new TextEncoder().encode(`<html><script>alert(1)</script></html>`);
    expect(detectImageMimeFromBytes(bytes)).toBeNull();
  });

  it("rejects PDF (%PDF magic)", () => {
    const bytes = new TextEncoder().encode(`%PDF-1.4`);
    expect(detectImageMimeFromBytes(bytes)).toBeNull();
  });

  it("rejects ZIP (PK magic)", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    expect(detectImageMimeFromBytes(bytes)).toBeNull();
  });

  it("rejects empty bytes", () => {
    expect(detectImageMimeFromBytes(new Uint8Array([]))).toBeNull();
  });

  it("rejects truncated PNG (less than 8 bytes)", () => {
    expect(detectImageMimeFromBytes(new Uint8Array([0x89, 0x50, 0x4e]))).toBeNull();
  });

  it("every detected MIME is in ALLOWED_IMAGE_TYPES", () => {
    const detected = [
      detectImageMimeFromBytes(new Uint8Array([0xff, 0xd8, 0xff])),
      detectImageMimeFromBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      detectImageMimeFromBytes(new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      ])),
      detectImageMimeFromBytes(new Uint8Array([0x00, 0x00, 0x01, 0x00])),
    ];
    for (const mime of detected) {
      expect(mime).not.toBeNull();
      expect(ALLOWED_IMAGE_TYPES).toContain(mime!);
    }
  });

  it("ALLOWED_IMAGE_TYPES no longer includes image/svg+xml", () => {
    expect((ALLOWED_IMAGE_TYPES as readonly string[]).includes("image/svg+xml")).toBe(false);
  });
});
