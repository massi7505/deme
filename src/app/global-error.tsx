"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "4rem 1.5rem", background: "#fafafa" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111" }}>
            Une erreur critique est survenue
          </h1>
          <p style={{ color: "#555", marginTop: "0.75rem" }}>
            Nos équipes ont été prévenues automatiquement. Merci de réessayer dans quelques instants.
          </p>
          {error.digest && (
            <p style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#999", marginTop: "0.5rem" }}>
              {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 1.5rem",
              background: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
