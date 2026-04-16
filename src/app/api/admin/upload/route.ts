import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "logo" or "favicon"

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "image/x-icon",
      "image/vnd.microsoft.icon",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Utilisez JPG, PNG, WebP, SVG ou ICO." },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Le fichier ne doit pas dépasser 2 Mo" },
        { status: 400 }
      );
    }

    const admin = createUntypedAdminClient();
    const ext = file.name.split(".").pop() || "png";
    const folder = type === "favicon" ? "favicon" : "logo";
    const filePath = `site/${folder}/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await admin.storage
      .from("company-assets")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("company-assets").getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}
