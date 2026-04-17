"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountManagerCard } from "@/components/dashboard/AccountManagerCard";
import { maskPhone, maskEmail, formatDate, formatPrice, heavyItemLabel, serviceLabel } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShieldCheck, Users,
  Truck, MapPin, Clock,
  Hash, User, Unlock, AlertTriangle, Flag, Package,
} from "lucide-react";
import toast from "react-hot-toast";

interface Lead {
  distributionId: string;
  quoteRequestId: string;
  priceCents: number;
  isTrial: boolean;
  status: string;
  competitorCount: number;
  totalUnlocks: number;
  maxUnlocks: number;
  createdAt: string;
  prospectId: string;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientSalutation: string | null;
  clientFirstName: string | null;
  clientLastName: string | null;
  fromAddress: string | null;
  fromCity: string | null;
  fromPostalCode: string | null;
  toAddress: string | null;
  toCity: string | null;
  toPostalCode: string | null;
  moveDate: string | null;
  category: string;
  volumeM3: number | null;
  roomCount: number | null;
  fromHousingType: string | null;
  fromFloor: number | null;
  fromElevator: boolean;
  toHousingType: string | null;
  toFloor: number | null;
  toElevator: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  heavyItems: string[];
  services: string[];
  notes: string | null;
  moveDateEnd: string | null;
  dateMode: "precise" | "flexible" | null;
}

export default function LeadDetailPage() {
  const params = useParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimReason, setClaimReason] = useState("");
  const [claimDescription, setClaimDescription] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/overview")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.leads) {
          const found = data.leads.find((l: Lead) => l.distributionId === params.id);
          setLead(found || null);
        }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleUnlock() {
    if (!lead) return;
    setUnlocking(true);
    try {
      const res = await fetch("/api/leads/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ distributionId: lead.distributionId }),
      });
      const result = await res.json();

      if (!res.ok) {
        if (result.requiresKyc) {
          toast.error("Vérification d'identité requise");
          // Redirect to KYC page after 2 seconds
          setTimeout(() => { window.location.href = "/verification-identite"; }, 2000);
        } else if (result.trialExpired) {
          toast.error("Votre période d'essai est terminée. Vérifiez votre identité pour continuer.");
          setTimeout(() => { window.location.href = "/verification-identite"; }, 2000);
        } else {
          toast.error(result.error || "Erreur lors du paiement");
        }
      } else if (result.testMode) {
        toast.success("Lead déverrouillé !");
        const r = await fetch("/api/dashboard/overview");
        const data = await r.json();
        const updated = data.leads.find((l: Lead) => l.distributionId === params.id);
        if (updated) setLead(updated);
      } else if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        toast.error("Aucune URL de paiement retournée. Veuillez réessayer.");
      }
    } catch {
      toast.error("Erreur lors du déverrouillage");
    } finally {
      setUnlocking(false);
    }
  }

  async function handleClaimSubmit() {
    if (!lead || !claimReason) {
      toast.error("Veuillez sélectionner un motif");
      return;
    }
    setSubmittingClaim(true);
    try {
      const res = await fetch("/api/dashboard/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributionId: lead.distributionId,
          reason: claimReason,
          description: claimDescription,
        }),
      });

      if (!res.ok) {
        const result = await res.json();
        toast.error(result.error || "Erreur lors de la soumission");
        return;
      }

      toast.success("Réclamation envoyée avec succès");
      setClaimDialogOpen(false);
      setClaimReason("");
      setClaimDescription("");
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setSubmittingClaim(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="py-20 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <h2 className="mt-4 text-xl font-bold">Demande non trouvée</h2>
        <Link href="/demandes-de-devis" className="mt-4 inline-block text-sm text-[var(--brand-green)] hover:underline">
          ← Retour aux demandes
        </Link>
      </div>
    );
  }

  const isUnlocked = lead.status === "unlocked";

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copié`),
      () => toast.error("Impossible de copier")
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/demandes-de-devis" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour aux demandes
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Demande de devis {lead.clientFirstName ? `de ${lead.clientLastName || ""} ${lead.clientFirstName}` : ""}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">{lead.prospectId}</Badge>
            <Badge variant={isUnlocked ? "success" : "secondary"}>
              {isUnlocked ? "Déverrouillé" : "Bloqué"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {lead.totalUnlocks}/{lead.maxUnlocks} acheteurs
            </Badge>
            {lead.emailVerified && (
              <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-700">
                <ShieldCheck className="h-3 w-3" /> Email vérifié
              </Badge>
            )}
            {lead.phoneVerified && (
              <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700">
                <ShieldCheck className="h-3 w-3" /> Tél vérifié
              </Badge>
            )}
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {lead.maxUnlocks - lead.totalUnlocks} place{lead.maxUnlocks - lead.totalUnlocks !== 1 ? "s" : ""} restante{lead.maxUnlocks - lead.totalUnlocks !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold">{formatPrice(lead.priceCents)}</span>
        </div>
      </motion.div>

      {/* Unlock banner */}
      {!isUnlocked && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between">
              <div>
                <p className="font-semibold text-yellow-800">Vous êtes intéressé ?</p>
                <p className="text-sm text-yellow-700">
                  Achetez ce lead pour {formatPrice(lead.priceCents)} et accédez aux coordonnées complètes du client.
                  {lead.maxUnlocks - lead.totalUnlocks <= 2 && (
                    <span className="ml-1 font-semibold">Plus que {lead.maxUnlocks - lead.totalUnlocks} place{lead.maxUnlocks - lead.totalUnlocks !== 1 ? "s" : ""} !</span>
                  )}
                </p>
              </div>
              <Button onClick={handleUnlock} disabled={unlocking} className="shrink-0 gap-2 bg-brand-gradient shadow-md shadow-green-500/20">
                {unlocking ? <Clock className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                {unlocking ? "Paiement en cours..." : `Acheter ce lead — ${formatPrice(lead.priceCents)}`}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-4 lg:col-span-2">
          {/* Le déménagement */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4 text-[var(--brand-green)]" /> Le déménagement
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              <div><span className="text-muted-foreground">Catégorie</span><p className="font-medium capitalize">{lead.category}</p></div>
              <div>
                <span className="text-muted-foreground">Date envisagée</span>
                <p className="font-medium">
                  {lead.moveDate
                    ? lead.dateMode === "flexible" && lead.moveDateEnd
                      ? `Du ${formatDate(lead.moveDate)} au ${formatDate(lead.moveDateEnd)}`
                      : formatDate(lead.moveDate)
                    : "Non précisée"}
                </p>
                {lead.dateMode === "flexible" && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Dates flexibles</p>
                )}
              </div>
              <div><span className="text-muted-foreground">Volume</span><p className="font-medium">{lead.volumeM3 ? `${lead.volumeM3} m³` : lead.roomCount ? `${lead.roomCount} pièces` : "Non précisé"}</p></div>
            </CardContent>
          </Card>

          {/* Départ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-red-500" /> Déménagement de {lead.fromPostalCode && <span className="font-normal text-muted-foreground">{lead.fromPostalCode} {lead.fromCity}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Adresse</span>
                <p className="font-medium">
                  {isUnlocked
                    ? (lead.fromAddress ? `${lead.fromAddress}, ${lead.fromPostalCode} ${lead.fromCity}` : `${lead.fromPostalCode} ${lead.fromCity}`)
                    : <span className="tracking-wider">••••••••, {lead.fromCity}</span>
                  }
                </p>
              </div>
              <div><span className="text-muted-foreground">Ville</span><p className="font-medium">{lead.fromCity || "—"}</p></div>
              <div><span className="text-muted-foreground">Code postal</span><p className="font-medium">{lead.fromPostalCode || "—"}</p></div>
              <div><span className="text-muted-foreground">Type</span><p className="font-medium">{lead.fromHousingType || "Non précisé"}</p></div>
              <div>
                <span className="text-muted-foreground">Étage / Ascenseur</span>
                <p className="font-medium">
                  {lead.fromFloor != null ? `${lead.fromFloor}e étage` : "—"} / {lead.fromElevator ? "Oui" : "Non"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Arrivée */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-green-500" /> Emménagement à {lead.toPostalCode && <span className="font-normal text-muted-foreground">{lead.toPostalCode} {lead.toCity}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Adresse</span>
                <p className="font-medium">
                  {isUnlocked
                    ? (lead.toAddress ? `${lead.toAddress}, ${lead.toPostalCode} ${lead.toCity}` : `${lead.toPostalCode} ${lead.toCity}`)
                    : <span className="tracking-wider">••••••••, {lead.toCity}</span>
                  }
                </p>
              </div>
              <div><span className="text-muted-foreground">Ville</span><p className="font-medium">{lead.toCity || "—"}</p></div>
              <div><span className="text-muted-foreground">Code postal</span><p className="font-medium">{lead.toPostalCode || "—"}</p></div>
              <div><span className="text-muted-foreground">Type</span><p className="font-medium">{lead.toHousingType || "Non précisé"}</p></div>
              <div>
                <span className="text-muted-foreground">Ascenseur</span>
                <p className="font-medium">{lead.toElevator ? "Oui" : "Non"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-[var(--brand-green)]" /> Informations du contact
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
              {isUnlocked ? (
                <>
                  <div>
                    <span className="text-muted-foreground">Nom</span>
                    <p className="font-medium">{lead.clientName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Téléphone</span>
                    <div className="flex items-center gap-2">
                      <a href={`tel:${lead.clientPhone ?? ""}`} className="font-medium text-[var(--brand-green)] hover:underline">
                        {lead.clientPhone || "—"}
                      </a>
                      {lead.clientPhone && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(lead.clientPhone!, "Téléphone")}
                          className="rounded-md border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                        >
                          Copier
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email</span>
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${lead.clientEmail ?? ""}`} className="font-medium text-[var(--brand-green)] hover:underline">
                        {lead.clientEmail || "—"}
                      </a>
                      {lead.clientEmail && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(lead.clientEmail!, "Email")}
                          className="rounded-md border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted"
                        >
                          Copier
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-muted-foreground">Nom</span>
                    <p className="font-medium">{lead.clientFirstName && lead.clientLastName ? `${lead.clientLastName} ${lead.clientFirstName}` : maskPhone("Client")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Téléphone</span>
                    <p className="font-medium">{lead.clientPhone ? maskPhone(lead.clientPhone) : maskPhone("0600000000")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email</span>
                    <p className="font-medium">{lead.clientEmail ? maskEmail(lead.clientEmail) : maskEmail("client@email.com")}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Informations complémentaires — only shown when unlocked and data exists */}
          {isUnlocked && (lead.heavyItems.length > 0 || lead.services.length > 0 || lead.notes) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4 text-[var(--brand-green)]" />
                  Informations complémentaires
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {lead.heavyItems.length > 0 && (
                  <div>
                    <p className="mb-2 text-muted-foreground">Objets lourds / spéciaux</p>
                    <div className="flex flex-wrap gap-2">
                      {lead.heavyItems.map((item) => (
                        <Badge key={item} variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
                          {heavyItemLabel(item)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {lead.services.length > 0 && (
                  <div>
                    <p className="mb-2 text-muted-foreground">Services demandés</p>
                    <div className="flex flex-wrap gap-2">
                      {lead.services.map((svc) => (
                        <Badge key={svc} variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700">
                          {serviceLabel(svc)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {lead.notes && (
                  <div>
                    <p className="mb-2 text-muted-foreground">Notes du client</p>
                    <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-foreground">
                      {lead.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Détails */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Hash className="h-4 w-4 text-[var(--brand-green)]" /> Détails
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div><span className="text-muted-foreground">ID Prospect</span><p className="font-mono font-medium">{lead.prospectId}</p></div>
              <div><span className="text-muted-foreground">Date de réception</span><p className="font-medium">{formatDate(lead.createdAt)}</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-[var(--brand-green)]" /> Besoin d&apos;aide ?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Contactez le client dans les <strong className="text-foreground">8 heures</strong> pour maximiser vos chances.</p>
              <p>Si pas de réponse au téléphone, envoyez un email avec votre devis détaillé.</p>
              <p>Vous pouvez demander un <strong className="text-foreground">remboursement</strong> si le numéro est invalide.</p>
              <Link href="/recommandations" className="inline-block text-[var(--brand-green)] hover:underline">
                Voir la FAQ →
              </Link>
            </CardContent>
          </Card>
          <AccountManagerCard />

          {/* Claim button - only for unlocked leads */}
          {isUnlocked && (
            <Card className="border-red-100">
              <CardContent className="p-4">
                <Button
                  variant="outline"
                  className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setClaimDialogOpen(true)}
                >
                  <Flag className="h-4 w-4" />
                  Signaler un problème
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Claim dialog */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler un problème</DialogTitle>
            <DialogDescription>
              Si vous rencontrez un problème avec cette demande, décrivez-le ci-dessous. Notre équipe examinera votre réclamation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="claim-reason">Motif de la réclamation</Label>
              <Select value={claimReason} onValueChange={setClaimReason}>
                <SelectTrigger id="claim-reason">
                  <SelectValue placeholder="Sélectionnez un motif" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Numéro invalide">Numéro invalide</SelectItem>
                  <SelectItem value="Client déjà contacté">Client déjà contacté</SelectItem>
                  <SelectItem value="Fausse demande">Fausse demande</SelectItem>
                  <SelectItem value="Client déjà déménagé">Client déjà déménagé</SelectItem>
                  <SelectItem value="Doublon">Doublon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-description">Description (optionnel)</Label>
              <Textarea
                id="claim-description"
                placeholder="Décrivez le problème rencontré..."
                rows={4}
                value={claimDescription}
                onChange={(e) => setClaimDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClaimDialogOpen(false)}
              disabled={submittingClaim}
            >
              Annuler
            </Button>
            <Button
              onClick={handleClaimSubmit}
              disabled={submittingClaim || !claimReason}
              className="gap-2"
            >
              <Flag className="h-4 w-4" />
              {submittingClaim ? "Envoi en cours..." : "Envoyer la réclamation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
