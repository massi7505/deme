export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installSupabaseAuthNoiseFilter } = await import("./src/lib/console-filter");
    installSupabaseAuthNoiseFilter();
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    const { installSupabaseAuthNoiseFilter } = await import("./src/lib/console-filter");
    installSupabaseAuthNoiseFilter();
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
