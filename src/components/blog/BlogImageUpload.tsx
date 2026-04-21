"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface BlogImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export function BlogImageUpload({ value, onChange }: BlogImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Utilisez un fichier JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop volumineux (5 Mo max).");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur d'upload");
      }
      const { url } = await res.json();
      onChange(url);
      toast.success("Image uploadée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload impossible");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        Image de couverture
      </label>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex min-h-[180px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors",
          dragging
            ? "border-[var(--brand-green)] bg-green-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400",
          uploading && "cursor-wait opacity-70"
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Cover"
              className="h-full max-h-[220px] w-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-red-600"
              aria-label="Supprimer l'image"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            Upload en cours...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span>Glissez une image ou cliquez pour choisir</span>
            <span className="text-xs">JPG, PNG ou WebP &middot; 5 Mo max</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = ""; // allow re-selecting same file
        }}
      />
    </div>
  );
}
