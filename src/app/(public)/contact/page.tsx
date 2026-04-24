import type { Metadata } from "next";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — Nous écrire",
  description:
    "Une question, un partenariat ou besoin d'aide ? Contactez notre équipe par email, téléphone ou via le formulaire. Réponse sous 24 h ouvrables.",
  alternates: { canonical: "/contact" },
};

async function getContactInfo(): Promise<{
  address: string;
  phone: string;
  email: string;
}> {
  try {
    const supabase = createUntypedAdminClient();
    const { data } = await supabase
      .from("site_settings")
      .select("data")
      .eq("id", 1)
      .single();
    const settings = (data?.data || {}) as Record<string, string>;
    return {
      address: settings.contactAddress || "",
      phone: settings.contactPhone || BRAND.contactPhone,
      email: settings.contactEmail || BRAND.contactEmail,
    };
  } catch {
    return {
      address: "",
      phone: BRAND.contactPhone,
      email: BRAND.contactEmail,
    };
  }
}

export default async function ContactPage() {
  const { address, phone, email } = await getContactInfo();

  const contactInfo = [
    { icon: MapPin, label: "Adresse", value: address || "—" },
    { icon: Phone, label: "Téléphone", value: phone || "—" },
    { icon: Mail, label: "Email", value: email || "—" },
    {
      icon: Clock,
      label: "Horaires",
      value: "Lun-Ven : 9h-18h | Sam : 9h-13h",
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-green-50/80 via-white to-white">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-950 sm:text-5xl">
              Contactez-nous
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Une question, un partenariat ou besoin d&apos;aide ? Notre équipe
              est à votre écoute.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container pb-20">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_380px]">
          <div>
            <ContactForm />
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border bg-gray-50/50 p-6">
              <h2 className="font-display text-lg font-bold text-gray-950">
                Nos coordonnées
              </h2>
              <div className="mt-6 space-y-5">
                {contactInfo.map((item) => (
                  <div key={item.label} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-green-50/50 p-6">
              <h2 className="font-display text-base font-bold text-gray-950">
                Réponse rapide
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Notre équipe répond généralement sous 24 h ouvrables. Pour les
                demandes urgentes, privilégiez le téléphone.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
