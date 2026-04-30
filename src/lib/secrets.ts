import crypto from "crypto";

const KNOWN_DEV_PLACEHOLDERS = new Set([
  "dev-admin-secret-change-me",
  "change-me",
  "your-secret-here",
]);

export interface RequireSecretOptions {
  /** Minimum byte length (default 16). */
  minLength?: number;
  /** Optional fallback env var name to support gradual rotation. */
  fallbackEnvVar?: string;
}

/**
 * Read a required secret env var. Behavior:
 *
 * - Production (`NODE_ENV === "production"`): throws if the value is missing,
 *   too short, or matches a known dev placeholder. The throw happens at the
 *   first call (typically module load), so misconfigured deploys fail fast
 *   instead of silently signing tokens with `"dev-admin-secret-change-me"`.
 * - Dev / test: warns once and returns a random per-process secret so the
 *   app still boots. All sessions / signatures become invalid across
 *   restarts, which is desirable in dev (no false sense of persistence).
 */
export function requireSecretEnv(
  envVarName: string,
  opts: RequireSecretOptions = {}
): string {
  const minLength = opts.minLength ?? 16;
  const primary = process.env[envVarName];
  const fallback = opts.fallbackEnvVar ? process.env[opts.fallbackEnvVar] : undefined;
  const value = primary ?? fallback;

  const isMissing = !value;
  const isPlaceholder = value !== undefined && KNOWN_DEV_PLACEHOLDERS.has(value);
  const isTooShort = value !== undefined && value.length < minLength;

  if (isMissing || isPlaceholder || isTooShort) {
    if (process.env.NODE_ENV === "production") {
      const reason = isMissing
        ? "missing"
        : isPlaceholder
          ? "matches a dev placeholder"
          : `shorter than ${minLength} chars`;
      throw new Error(
        `Required secret env var ${envVarName} is ${reason}. ` +
          `Set it in your environment (e.g. Vercel project settings) before deploying.`
      );
    }

    // Dev / test: noisy warn, random per-process value.
    console.warn(
      `[secrets] ${envVarName} ${isMissing ? "is missing" : isPlaceholder ? "matches a dev placeholder" : "is too short"} — ` +
        `generating a random per-process secret. Sessions/signatures will not survive restart.`
    );
    return crypto.randomBytes(32).toString("hex");
  }

  return value;
}
