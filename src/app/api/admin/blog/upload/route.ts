import { NextRequest, NextResponse } from "next/server";
import {
  uploadBlob,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  extFromFile,
} from "@/lib/blob";
import { verifyAdminToken } from "@/lib/admin-auth";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  // Auth: admin_token cookie is set by /admin/login with path=/ so it
  // reaches this route.
  const token = request.cookies.get("admin_token")?.value;
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Utilisez JPG, PNG ou WebP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Le fichier ne doit pas dépasser 5 Mo" },
        { status: 400 }
      );
    }

    // blog/{YYYY-MM}/{timestamp}-{random}.{ext} keeps storage browsable.
    const now = new Date();
    const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const random = crypto.randomBytes(3).toString("hex");
    const ext = extFromFile(file);
    const pathname = `blog/${yyyymm}/${now.getTime()}-${random}.${ext}`;

    const { url } = await uploadBlob(file, pathname);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[admin/blog/upload]", err);
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}
