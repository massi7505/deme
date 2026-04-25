interface RegionLite {
  department_code: string;
  categories: string[];
}

interface RadiusLite {
  departure_city: string;
  move_types: string[];
}

export type ConfigConflict =
  | { type: "empty"; message: string }
  | { type: "empty_category"; message: string };

/**
 * Pure function — detects misconfigurations in a mover's lead-targeting
 * setup. Called server-side from /configurations/page.tsx.
 *
 * V1 ships only the high-confidence rules (no zone, empty categories).
 * The "department × radius redundancy" rule is intentionally skipped:
 * we have lat/lng on radius rules but no reverse geocoding, so we
 * cannot reliably know which department a given lat/lng falls in.
 */
export function detectConflicts(
  regions: RegionLite[],
  radiusRules: RadiusLite[]
): ConfigConflict[] {
  const conflicts: ConfigConflict[] = [];

  if (regions.length === 0 && radiusRules.length === 0) {
    conflicts.push({
      type: "empty",
      message:
        "Aucune zone configurée — vous ne recevrez aucun lead. Ajoutez au moins un département ou une zone par rayon.",
    });
  }

  for (const r of regions) {
    if (!r.categories || r.categories.length === 0) {
      conflicts.push({
        type: "empty_category",
        message: `Le département ${r.department_code} n'a aucune catégorie cochée — il ne reçoit aucun lead.`,
      });
    }
  }

  for (const r of radiusRules) {
    if (!r.move_types || r.move_types.length === 0) {
      conflicts.push({
        type: "empty_category",
        message: `La zone autour de ${r.departure_city} n'a aucune catégorie cochée — elle ne reçoit aucun lead.`,
      });
    }
  }

  return conflicts;
}
