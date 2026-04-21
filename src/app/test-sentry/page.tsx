"use client";

import { useEffect } from "react";

function throwFromNamedHelper(): never {
  const message = "[sentry-sourcemaps-test-client] If Sentry shows this helper name and line 6, source maps work.";
  throw new Error(message);
}

export default function TestSentryPage() {
  useEffect(() => {
    throwFromNamedHelper();
  }, []);
  return <div>Triggering client-side error…</div>;
}
