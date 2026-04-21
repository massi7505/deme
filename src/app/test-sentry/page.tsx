export const dynamic = "force-dynamic";

function throwFromNamedHelper(): never {
  const message = "[sentry-sourcemaps-test] If you see this helper name and line 6 in Sentry, source maps work.";
  throw new Error(message);
}

export default function TestSentryPage() {
  throwFromNamedHelper();
}
