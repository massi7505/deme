"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Search,
  Loader2,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/* ---------- Step indicator ---------- */
function StepIndicator({ current }: { current: number }) {
  const steps = [
    { num: 1, label: "Types" },
    { num: 2, label: "Départements" },
    { num: 3, label: "Entreprise" },
    { num: 4, label: "Contact" },
  ];

  return (
    <nav className="mb-8 flex items-center justify-between">
      {steps.map((step, i) => {
        const isCompleted = step.num < current;
        const isActive = step.num === current;
        return (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  isCompleted && "bg-green-600 text-white",
                  isActive && "bg-green-600 text-white ring-4 ring-green-100",
                  !isCompleted && !isActive && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.num}
              </div>
              <span
                className={cn(
                  "hidden text-[10px] font-medium sm:block",
                  isActive ? "text-green-700" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 w-8 rounded-full sm:w-12",
                  step.num < current ? "bg-green-600" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* ---------- Zod schema ---------- */
const companySchema = z.object({
  // 3a - SIRET
  siret: z
    .string()
    .min(1, "Le SIRET est requis")
    .regex(/^\d{14}$/, "Le SIRET doit contenir 14 chiffres"),
  // 3b - Coordonnées
  companyName: z.string().min(1, "La raison sociale est requise"),
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Veuillez entrer un email valide"),
  phone: z
    .string()
    .min(1, "Le téléphone est requis")
    .regex(/^(?:(?:\+33|0)\s?[1-9])(?:[\s.-]?\d{2}){4}$/, "Numéro invalide"),
  website: z.string().url("URL invalide").or(z.literal("")).optional(),
  // 3c - Adresse
  address: z.string().min(1, "L'adresse est requise"),
  postalCode: z
    .string()
    .min(1, "Le code postal est requis")
    .regex(/^\d{5}$/, "Code postal invalide (5 chiffres)"),
  city: z.string().min(1, "La ville est requise"),
});

type CompanyFormData = z.infer<typeof companySchema>;

/* ---------- Page ---------- */
export default function InscriptionEtape3Page() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("siret");
  const [siretVerified, setSiretVerified] = useState(false);
  const [verifyingsiret, setVerifyingSiret] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      siret: "",
      companyName: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      postalCode: "",
      city: "",
    },
  });

  const watchedSiret = watch("siret", "");

  async function handleVerifySiret() {
    const valid = await trigger("siret");
    if (!valid) return;

    setVerifyingSiret(true);
    try {
      const res = await fetch(`/api/sirene?siret=${watchedSiret}`);
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "SIRET non trouvé");
        setVerifyingSiret(false);
        return;
      }

      const d = result.data;

      // Auto-remplir tous les champs
      setValue("companyName", d.raisonSociale || d.companyName || "", { shouldValidate: true });
      if (d.address) setValue("address", d.address, { shouldValidate: true });
      if (d.postalCode) setValue("postalCode", d.postalCode, { shouldValidate: true });
      if (d.city) setValue("city", d.city, { shouldValidate: true });

      setSiretVerified(true);
      setActiveTab("coordonnees");
    } catch {
      toast.error("Erreur lors de la vérification du SIRET");
    } finally {
      setVerifyingSiret(false);
    }
  }

  async function onSubmit(data: CompanyFormData) {
    sessionStorage.setItem("inscription_company", JSON.stringify(data));
    router.push("/inscription/etape-4");
  }

  async function handleTabContinue(nextTab: string) {
    // Validate current tab fields before advancing
    if (activeTab === "siret") {
      const valid = await trigger(["siret", "companyName"]);
      if (!valid || !siretVerified) return;
    }
    if (activeTab === "coordonnees") {
      const valid = await trigger(["email", "phone"]);
      if (!valid) return;
    }
    setActiveTab(nextTab);
  }

  function handleBack() {
    router.push("/inscription/etape-2");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
    >
      <StepIndicator current={3} />

      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Informations entreprise
        </h1>
        <p className="text-sm text-muted-foreground">
          Complétez les informations de votre société en 3 sous-étapes
        </p>
      </div>

      {/* Tabs */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="siret" className="gap-1 text-xs">
              <span className="font-bold">3a</span> SIRET
            </TabsTrigger>
            <TabsTrigger value="coordonnees" className="gap-1 text-xs">
              <span className="font-bold">3b</span> Coordonnées
            </TabsTrigger>
            <TabsTrigger value="adresse" className="gap-1 text-xs">
              <span className="font-bold">3c</span> Adresse
            </TabsTrigger>
          </TabsList>

          {/* Tab 3a: SIRET */}
          <TabsContent value="siret" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="siret">Numéro SIRET</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="siret"
                    placeholder="12345678901234"
                    maxLength={14}
                    className={cn(
                      "pl-10 font-mono",
                      errors.siret && "border-destructive",
                      siretVerified && "border-green-500"
                    )}
                    {...register("siret", {
                      onChange: () => setSiretVerified(false),
                    })}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleVerifySiret}
                  disabled={
                    verifyingsiret ||
                    watchedSiret.length !== 14 ||
                    siretVerified
                  }
                  variant={siretVerified ? "outline" : "default"}
                  className={cn(
                    "shrink-0",
                    siretVerified &&
                      "border-green-500 text-green-700 hover:bg-green-50"
                  )}
                >
                  {verifyingsiret ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : siretVerified ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Vérifié
                    </>
                  ) : (
                    "Vérifier"
                  )}
                </Button>
              </div>
              {errors.siret && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive"
                >
                  {errors.siret.message}
                </motion.p>
              )}
            </div>

            {/* Company name (autofilled after SIRET verification) */}
            {siretVerified && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <Label htmlFor="companyName">Raison sociale</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="companyName"
                    className={cn(
                      "pl-10",
                      errors.companyName && "border-destructive"
                    )}
                    {...register("companyName")}
                  />
                </div>
                {errors.companyName && (
                  <p className="text-xs text-destructive">
                    {errors.companyName.message}
                  </p>
                )}
              </motion.div>
            )}

            <Button
              type="button"
              disabled={!siretVerified}
              onClick={() => handleTabContinue("coordonnees")}
              className="w-full bg-brand-gradient text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl hover:shadow-green-500/30 hover:brightness-110"
            >
              Continuer vers les coordonnées
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </TabsContent>

          {/* Tab 3b: Coordonnées */}
          <TabsContent value="coordonnees" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@votre-entreprise.fr"
                  className={cn(
                    "pl-10",
                    errors.email && "border-destructive"
                  )}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  className={cn(
                    "pl-10",
                    errors.phone && "border-destructive"
                  )}
                  {...register("phone")}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">
                Site web{" "}
                <span className="text-muted-foreground">(optionnel)</span>
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="website"
                  type="url"
                  placeholder="https://votre-site.fr"
                  className={cn(
                    "pl-10",
                    errors.website && "border-destructive"
                  )}
                  {...register("website")}
                />
              </div>
              {errors.website && (
                <p className="text-xs text-destructive">
                  {errors.website.message}
                </p>
              )}
            </div>

            <Button
              type="button"
              onClick={() => handleTabContinue("adresse")}
              className="w-full bg-brand-gradient text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl hover:shadow-green-500/30 hover:brightness-110"
            >
              Continuer vers l&apos;adresse
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </TabsContent>

          {/* Tab 3c: Adresse */}
          <TabsContent value="adresse" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="address"
                  placeholder="123 rue de la Logistique"
                  className={cn(
                    "pl-10",
                    errors.address && "border-destructive"
                  )}
                  {...register("address")}
                />
              </div>
              {errors.address && (
                <p className="text-xs text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal</Label>
                <Input
                  id="postalCode"
                  placeholder="75001"
                  maxLength={5}
                  className={cn(
                    "font-mono",
                    errors.postalCode && "border-destructive"
                  )}
                  {...register("postalCode")}
                />
                {errors.postalCode && (
                  <p className="text-xs text-destructive">
                    {errors.postalCode.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  placeholder="Paris"
                  className={cn(errors.city && "border-destructive")}
                  {...register("city")}
                />
                {errors.city && (
                  <p className="text-xs text-destructive">
                    {errors.city.message}
                  </p>
                )}
              </div>
            </div>

            {/* Submit the full form */}
            <Button
              type="submit"
              className="w-full bg-brand-gradient text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl hover:shadow-green-500/30 hover:brightness-110"
              size="lg"
            >
              Continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </TabsContent>
        </Tabs>

        {/* Back */}
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
      </form>
    </motion.div>
  );
}
