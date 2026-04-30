import { put, del } from "@vercel/blob";

/**
 * Wrapper around Vercel Blob. Requires the BLOB_READ_WRITE_TOKEN env var,
 * which Vercel injects automatically when the Blob store is connected to
 * the project.
 *
 * Keeps a single place to enforce naming conventions: we always build
 * paths like `logos/{companyId}/{ts}.{ext}` or `photos/{companyId}/{ts}.{ext}`
 * so storage stays organized and cheap-to-prune.
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
] as const;

/**
 * Inspect the first bytes of a file's raw content and return the actual
 * MIME type, or null if the bytes match no supported format. This is the
 * authoritative check — `file.type` is set from the client-supplied
 * Content-Type header and can be lied to (rename `payload.svg` to
 * `payload.png` and set Content-Type: image/png → file.type lies, magic
 * bytes don't).
 *
 * Only formats in ALLOWED_IMAGE_TYPES are detected; everything else (SVG,
 * PDF, ZIP, HTML, etc.) returns null.
 */
export function detectImageMimeFromBytes(bytes: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // ICO: 00 00 01 00
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x01 &&
    bytes[3] === 0x00
  ) {
    return "image/x-icon";
  }
  return null;
}

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_FAVICON_SIZE = 2 * 1024 * 1024; // 2 MB

export interface UploadResult {
  url: string;
  pathname: string;
}

export async function uploadBlob(
  file: File,
  pathname: string
): Promise<UploadResult> {
  const result = await put(pathname, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { url: result.url, pathname: result.pathname };
}

export async function deleteBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (err) {
    // Non-fatal — the file may have already been deleted or migrated.
    console.error("[blob] delete failed:", err);
  }
}

export function extFromFile(file: File, fallback = "jpg"): string {
  // Trust the filename extension only if it matches a safe, whitelist-ish
  // alphanumeric pattern. Otherwise a file named `pwn.php` would end up in
  // the blob path as `.php` — harmless today (Blob serves with the stored
  // Content-Type, not the URL extension) but confusing and brittle.
  const nameExt = file.name.split(".").pop()?.toLowerCase();
  if (nameExt && /^[a-z0-9]{1,5}$/.test(nameExt)) return nameExt;
  // MIME fallback.
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type.includes("icon")) return "ico";
  return fallback;
}
