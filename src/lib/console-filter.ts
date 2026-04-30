const SILENCED_AUTH_CODES = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
]);

const INSTALLED = Symbol.for("demenagement24.consoleFilter.installed");

type ConsoleErrorFn = (...args: unknown[]) => void;

type GlobalConsoleWithMarker = typeof globalThis & {
  [INSTALLED]?: boolean;
};

export function isExpectedSupabaseAuthNoise(args: unknown[]): boolean {
  for (const arg of args) {
    if (
      arg !== null &&
      typeof arg === "object" &&
      (arg as { __isAuthError?: unknown }).__isAuthError === true
    ) {
      const code = (arg as { code?: unknown }).code;
      if (typeof code === "string" && SILENCED_AUTH_CODES.has(code)) {
        return true;
      }
    }
  }
  return false;
}

export function installSupabaseAuthNoiseFilter(): () => void {
  const g = globalThis as GlobalConsoleWithMarker;
  if (g[INSTALLED]) {
    return () => {};
  }

  const original = console.error.bind(console) as ConsoleErrorFn;

  console.error = ((...args: unknown[]) => {
    if (isExpectedSupabaseAuthNoise(args)) return;
    original(...args);
  }) as typeof console.error;

  g[INSTALLED] = true;

  return () => {
    console.error = original as typeof console.error;
    g[INSTALLED] = false;
  };
}
