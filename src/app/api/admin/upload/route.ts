import { NextRequest, NextResponse } from "next/server";
import {
  uploadBlob,
  ALLOWED_IMAGE_TYPES,
  MAX_FAVICON_SIZE,
  extFromFile,
  detectImageMimeFromBytes,
} from "@/lib/blob";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "logo" or "favicon"

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Type de fichier non autorisé. Utilisez JPG, PNG, WebP ou ICO.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FAVICON_SIZE) {
      return NextResponse.json(
        { error: "Le fichier ne doit pas dépasser 2 Mo" },
        { status: 400 }
      );
    }

    const headerBuf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const detectedMime = detectImageMimeFromBytes(headerBuf);
    if (!detectedMime) {
      return NextResponse.json(
        { error: "Le fichier ne semble pas être une image valide (JPG, PNG, WebP ou ICO)." },
        { status: 400 }
      );
    }

    const ext = extFromFile(file, "png");
    const folder = type === "favicon" ? "favicon" : "site-logo";
    const pathname = `site/${folder}/${Date.now()}.${ext}`;

    const { url } = await uploadBlob(file, pathname);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[admin/upload]", err);
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}
