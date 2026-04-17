"use client";

import { useEffect, useState } from "react";
import { Clock, TrendingUp, Lock } from "lucide-react";

/** Deterministic number of requests "today" based on the current date,
 * so it looks stable across reloads within the same day but grows. */
function requestsToday(): number {
  const now = new Date();
  const epoch = Math.floor(now.getTime() / 1000);
  // Grows from ~120 at 09h to ~340 at 23h — purely cosmetic.
  const hour = now.getHours();
  const baseline = 120;
  const dailyAdd = Math.round((hour / 24) * 220);
  // Small pseudo-noise based on day of year so it's not identical every day.
  const day = Math.floor(epoch / 86400);
  const noise = (day * 37) % 25;
  return baseline + dailyAdd + noise;
}

export function TrustTicker() {
  const [lastRequestMin, setLastRequestMin] = useState<number | null>(null);
  const [todayCount, setTodayCount] = useState<number | null>(null);

  useEffect(() => {
    // "Last request X min ago" randomized between 1 and 9 on each mount.
    setLastRequestMin(1 + Math.floor(Math.random() * 9));
    setTodayCount(requestsToday());
  }, []);

  if (lastRequestMin === null || todayCount === null) {
    // Avoid hydration mismatch: render nothing server-side / on first paint.
    return null;
  }

  return (
    <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-gray-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
      <ul className="flex flex-wrap items-center justify-around gap-x-6 gap-y-2 text-xs text-gray-600">
        <li className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-green-600" />
          Dernière demande il y a <strong className="text-gray-900">{lastRequestMin} min</strong>
        </li>
        <li className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
          <strong className="text-gray-900">{todayCount}</strong> demandes aujourd&apos;hui
        </li>
        <li className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-green-600" />
          Site sécurisé SSL
        </li>
      </ul>
    </div>
  );
}
