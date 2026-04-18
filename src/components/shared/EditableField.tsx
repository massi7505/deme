"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Pencil } from "lucide-react";

export function EditableTextField({
  label,
  value,
  icon,
  placeholder,
  multiline,
  onSave,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  placeholder?: string;
  multiline?: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(current);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-1 space-y-2">
          {multiline ? (
            <textarea
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-[var(--brand-green)]"
            />
          ) : (
            <input
              type="text"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-[var(--brand-green)]"
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1 h-7 text-xs">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              OK
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCurrent(value);
                setEditing(false);
              }}
              className="h-7 text-xs"
            >
              Annuler
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        {icon}
        <p className="text-sm font-medium">
          {value || <span className="text-muted-foreground/60">Non renseigné</span>}
        </p>
        <button
          onClick={() => {
            setCurrent(value);
            setEditing(true);
          }}
          className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
