"use client";

import { Shield } from "lucide-react";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  onUpdate: (field: keyof Settings, value: string) => void;
  adminPassword: string;
  onPasswordChange: (value: string) => void;
}

export default function SecurityTab({ settings, onUpdate, adminPassword, onPasswordChange }: Props) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <Shield className="h-4 w-4 text-[var(--brand-green)]" /> Sécurité
        </h3>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email admin</label>
          <input
            value={settings.adminEmail}
            onChange={(e) => onUpdate("adminEmail", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Nouveau mot de passe admin</label>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Laisser vide pour ne pas changer"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Laissez ce champ vide si vous ne souhaitez pas modifier le mot de passe
          </p>
        </div>
      </div>
    </div>
  );
}
