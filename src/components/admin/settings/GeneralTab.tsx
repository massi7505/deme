"use client";

import { useRef, useState } from "react";
import { Globe, Upload, ImageIcon, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import type { Settings } from "./types";

interface Props {
  settings: Settings;
  onUpdate: (field: keyof Settings, value: string) => void;
}

function ImageUpload({
  label,
  currentUrl,
  type,
  onUploaded,
  onRemove,
  accept,
}: {
  label: string;
  currentUrl: string;
  type: "logo" | "favicon";
  onUploaded: (url: string) => void;
  onRemove: () => void;
  accept: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur upload");
        return;
      }
      const data = await res.json();
      onUploaded(data.url);
      toast.success(`${label} mis à jour`);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-gray-50">
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Upload..." : "Changer"}
          </button>
          {currentUrl && (
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
              Supprimer
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function GeneralTab({ settings, onUpdate }: Props) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <Globe className="h-4 w-4 text-[var(--brand-green)]" /> Informations générales
        </h3>
      </div>
      <div className="space-y-6 p-5">
        {/* Logo & Favicon */}
        <div className="grid gap-6 sm:grid-cols-2">
          <ImageUpload
            label="Logo du site"
            currentUrl={settings.logoUrl}
            type="logo"
            onUploaded={(url) => onUpdate("logoUrl", url)}
            onRemove={() => onUpdate("logoUrl", "")}
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
          />
          <ImageUpload
            label="Favicon"
            currentUrl={settings.faviconUrl}
            type="favicon"
            onUploaded={(url) => onUpdate("faviconUrl", url)}
            onRemove={() => onUpdate("faviconUrl", "")}
            accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
          />
        </div>

        {/* Site info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nom du site</label>
            <input
              value={settings.siteName}
              onChange={(e) => onUpdate("siteName", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">URL du site</label>
            <input
              value={settings.siteUrl}
              onChange={(e) => onUpdate("siteUrl", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email de contact</label>
          <input
            value={settings.contactEmail}
            onChange={(e) => onUpdate("contactEmail", e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Téléphone</label>
            <input
              value={settings.contactPhone}
              onChange={(e) => onUpdate("contactPhone", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Adresse</label>
            <input
              value={settings.contactAddress}
              onChange={(e) => onUpdate("contactAddress", e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]"
            />
          </div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          Ces informations sont affichées automatiquement dans le header, le footer et toutes les pages du site.
        </div>
      </div>
    </div>
  );
}
