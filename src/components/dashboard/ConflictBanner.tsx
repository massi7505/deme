import { AlertTriangle } from "lucide-react";
import type { ConfigConflict } from "@/lib/config-conflicts";

export function ConflictBanner({ conflicts }: { conflicts: ConfigConflict[] }) {
  if (conflicts.length === 0) return null;

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-amber-900">
            {conflicts.length === 1
              ? "Un problème détecté dans votre configuration"
              : `${conflicts.length} problèmes détectés dans votre configuration`}
          </p>
          <ul className="list-disc space-y-1 pl-4 text-sm text-amber-800">
            {conflicts.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
