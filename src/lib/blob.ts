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
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

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
  if (file.type === "image/svg+xml") return "svg";
  if (file.type.includes("icon")) return "ico";
  return fallback;
}
