import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import {
  uploadBlob,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  extFromFile,
} from "@/lib/blob";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });
  }

  const companyId = (company as { id: string }).id;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "logo" or "photo"

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Utilisez JPG, PNG, WebP ou SVG." },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Le fichier ne doit pas dépasser 5 Mo" },
        { status: 400 }
      );
    }

    const ext = extFromFile(file);
    const folder = type === "logo" ? "logos" : "photos";
    const pathname = `${folder}/${companyId}/${Date.now()}.${ext}`;

    const { url } = await uploadBlob(file, pathname);

    if (type === "logo") {
      await admin.from("companies").update({ logo_url: url }).eq("id", companyId);
    } else if (type === "photo") {
      // Cap at 4 non-rejected photos (approved + pending count; rejected don't,
      // so a mover can replace a refused image).
      const { count } = await admin
        .from("company_photos")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .neq("status", "rejected");
      if ((count ?? 0) >= 4) {
        return NextResponse.json(
          { error: "Maximum 4 photos par profil. Supprimez-en une avant d'en ajouter." },
          { status: 400 }
        );
      }
      await admin.from("company_photos").insert({
        company_id: companyId,
        url,
        status: "pending",
      });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[dashboard/upload]", err);
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}
