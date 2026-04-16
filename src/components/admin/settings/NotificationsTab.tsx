"use client";

import { Mail } from "lucide-react";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  onUpdate: (field: keyof Settings, value: string) => void;
}

export default function NotificationsTab({ settings, onUpdate }: Props) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <Mail className="h-4 w-4 text-[var(--brand-green)]" /> Notifications email
        </h3>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email expéditeur</label>
          <input
            value={settings.emailFrom}
            onChange={(e) => onUpdate("emailFrom", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Adresse utilisée comme expéditeur pour tous les emails envoyés par la plateforme
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email réclamations</label>
          <input
            value={settings.emailReclamations}
            onChange={(e) => onUpdate("emailReclamations", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Adresse qui reçoit les notifications de nouvelles réclamations
          </p>
        </div>
      </div>
    </div>
  );
}
