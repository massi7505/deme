"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  User, ShieldCheck, Clock, Mail, Lock, Pencil, Bell,
  Building2, Phone, MapPin, Globe, CheckCircle2,
} from "lucide-react";

interface DashboardData {
  profile: Record<string, unknown>;
  company: Record<string, unknown>;
}

export default function ComptePage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/overview")
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  if (!data) return <p className="py-20 text-center text-muted-foreground">Impossible de charger les données</p>;

  const { profile, company } = data;
  const accountStatus = company.account_status as string;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold tracking-tight">Mon compte</h2>
        <p className="text-sm text-muted-foreground">Gérez vos informations de compte et vos préférences.</p>
      </motion.div>

      {/* Account status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-[var(--brand-green)]" /> Statut du compte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {accountStatus === "active" ? (
              <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Actif</Badge>
            ) : accountStatus === "trial" ? (
              <Badge variant="default" className="gap-1"><Clock className="h-3 w-3" /> Période d&apos;essai</Badge>
            ) : (
              <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> En attente de vérification</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-[var(--brand-green)]" /> Identifiants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted"><Mail className="h-4 w-4 text-muted-foreground" /></div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Nom d&apos;utilisateur (email)</p>
                <p className="text-sm font-medium">{profile.email as string}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push("/compte/parametres")}><Pencil className="h-3.5 w-3.5" /> Modifier</Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted"><Lock className="h-4 w-4 text-muted-foreground" /></div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Mot de passe</p>
                <p className="text-sm font-medium tracking-widest">••••••••••</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push("/compte/parametres")}><Pencil className="h-3.5 w-3.5" /> Modifier</Button>
          </div>
        </CardContent>
      </Card>

      {/* Email notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-[var(--brand-green)]" /> Notifications par email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Nouvelles demandes de devis</p>
              <p className="text-xs text-muted-foreground">Recevez un email à chaque nouvelle demande correspondant à vos critères.</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
        </CardContent>
      </Card>

      {/* Company information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-[var(--brand-green)]" /> Informations sur l&apos;entreprise
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => router.push("/profil-entreprise")}><Pencil className="h-3.5 w-3.5" /> Modifier</Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField icon={Building2} label="Nom de l'entreprise" value={company.name as string} />
            <InfoField icon={Building2} label="SIRET" value={company.siret as string} />
            <InfoField icon={Building2} label="Statut juridique" value={(company.legal_status as string) || "—"} />
            <InfoField icon={MapPin} label="Adresse" value={(company.address as string) || "—"} />
            <InfoField icon={MapPin} label="Ville" value={`${company.postal_code || ""} ${company.city || ""}`} />
            <InfoField icon={Phone} label="Téléphone" value={(company.phone as string) || "—"} />
            <InfoField icon={Globe} label="Site web" value={(company.website as string) || "—"} />
            <InfoField icon={Mail} label="Email contact" value={(company.email_contact as string) || "—"} />
          </div>
        </CardContent>
      </Card>

      {/* Contact information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-[var(--brand-green)]" /> Information du Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField icon={User} label="Nom du contact" value={(profile.full_name as string) || "—"} />
            <InfoField icon={Mail} label="Email devis" value={(company.email_contact as string) || "—"} />
            <InfoField icon={Mail} label="Email facturation" value={(company.email_billing as string) || "—"} />
            <InfoField icon={Mail} label="Email général" value={(company.email_general as string) || "—"} />
            <InfoField icon={Phone} label="Téléphone" value={(profile.phone as string) || "—"} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoField({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
        <p className="text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}
