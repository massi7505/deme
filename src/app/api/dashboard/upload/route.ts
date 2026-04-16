import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createUntypedAdminClient();

  // Get company
  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!company) {
    return NextResponse.json(
      { error: "Entreprise introuvable" },
      { status: 404 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null; // "logo" or "photo"

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Utilisez JPG, PNG, WebP ou SVG." },
        { status: 400 }
      );
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Le fichier ne doit pas dépasser 5 Mo" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || "jpg";
    const folder = type === "logo" ? "logos" : "photos";
    const filePath = `${company.id}/${folder}/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await admin.storage
      .from("company-assets")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
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

    // If it's a logo, update the company record
    if (type === "logo") {
      await admin
        .from("companies")
        .update({ logo_url: publicUrl })
        .eq("id", company.id);
    }

    // If it's a photo, add to company_photos
    if (type === "photo") {
      await admin.from("company_photos").insert({
        company_id: company.id,
        url: publicUrl,
      });
    }

    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}
