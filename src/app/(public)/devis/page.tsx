"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, FileText, ShieldCheck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StepProgress } from "@/components/quote-funnel/StepProgress";
import { TrustTicker } from "@/components/quote-funnel/TrustTicker";
import { Step1MoveType, type Step1Data } from "@/components/quote-funnel/Step1MoveType";
import { Step2Addresses, type Step2Data } from "@/components/quote-funnel/Step2Addresses";
import { Step3Details, type Step3Data } from "@/components/quote-funnel/Step3Details";
import { Step4Contact, type Step4Data } from "@/components/quote-funnel/Step4Contact";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Full form data type
// ---------------------------------------------------------------------------

export interface QuoteFormData {
  // Step 1
  category: "national" | "entreprise" | "international";
  moveType: "appartement" | "maison" | "bureau";
  roomCount: string;
  volumeM3?: number;
  dateMode: "precise" | "flexible";
  moveDate: string;
  moveDateEnd?: string;
  // Step 2
  fromAddress: string;
  fromApartmentNumber?: string;
  fromCity: string;
  fromPostalCode: string;
  fromHousingType: string;
  fromFloor: number;
  fromElevator: boolean;
  toAddress: string;
  toApartmentNumber?: string;
  toCity: string;
  toPostalCode: string;
  toHousingType: string;
  toFloor: number;
  toElevator: boolean;
  // Step 3
  heavyItems: string[];
  services: string[];
  notes?: string;
  // Step 4
  salutation: "M." | "Mme";
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  acceptCgu: true;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DevisPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Partial data accumulated across steps
  const [formData, setFormData] = useState<Partial<QuoteFormData>>({});
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [matchedMovers, setMatchedMovers] = useState(0);

  // -- Step handlers --------------------------------------------------------

  const handleStep1 = useCallback((data: Step1Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleStep2 = useCallback((data: Step2Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleStep3 = useCallback((data: Step3Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleStep4 = useCallback(
    async (data: Step4Data) => {
      const completeData: QuoteFormData = {
        ...formData,
        ...data,
      } as QuoteFormData;

      setIsSubmitting(true);
      try {
        const res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: completeData.category,
            moveType: completeData.moveType,
            moveDateEnd: completeData.dateMode === "flexible" ? completeData.moveDateEnd : undefined,
            fromAddress: completeData.fromAddress,
            fromCity: completeData.fromCity,
            fromPostalCode: completeData.fromPostalCode,
            fromHousingType: completeData.fromHousingType,
            fromFloor: completeData.fromFloor,
            fromElevator: completeData.fromElevator,
            toAddress: completeData.toAddress,
            toCity: completeData.toCity,
            toPostalCode: completeData.toPostalCode,
            toHousingType: completeData.toHousingType,
            toFloor: completeData.toFloor,
            toElevator: completeData.toElevator,
            roomCount: completeData.roomCount,
            volumeM3: completeData.volumeM3,
            moveDate: completeData.moveDate,
            salutation: completeData.salutation,
            firstName: completeData.firstName,
            lastName: completeData.lastName,
            phone: completeData.phone,
            email: completeData.email,
            heavyItems: completeData.heavyItems,
            services: completeData.services,
            notes: completeData.notes,
          }),
        });

        if (!res.ok) {
          toast.error("Erreur lors de l'envoi");
          return;
        }
        const result = await res.json().catch(() => ({}));
        if (!result.success) {
          toast.error(result.error || "Erreur lors de l'envoi");
          return;
        }
        if (result.verificationRequired) {
          router.push(`/verifier-demande/${result.quoteId}`);
          return;
        }
        // Fallback (feature flag off): keep inline success flow
        setProspectId(result.prospectId);
        setQuoteId(result.quoteId || null);
        setSmsSent(result.smsSent || false);
        setMatchedMovers(result.matchedMovers || 0);
        setFormData(completeData);
        setIsSubmitted(true);
        toast.success("Demande envoyée avec succès !");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error) {
        console.error("Submission error:", error);
        toast.error("Une erreur est survenue. Veuillez réessayer.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData]
  );

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // -- Success screen -------------------------------------------------------

  async function handleVerifyPhone() {
    if (!quoteId || otpCode.length !== 6) {
      toast.error("Entrez le code à 6 chiffres reçu par SMS");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/quotes/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, code: otpCode }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Code incorrect");
        return;
      }
      setPhoneVerified(true);
      toast.success("Numéro vérifié avec succès !");
    } catch {
      toast.error("Erreur de vérification");
    } finally {
      setVerifying(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-b from-green-50 to-white">
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="mb-3 text-3xl font-bold text-gray-900">
              Demande envoyée !
            </h1>
            <p className="mb-2 text-lg text-gray-600">
              Merci pour votre demande de devis.
              {matchedMovers > 0
                ? ` ${matchedMovers} déménageur${matchedMovers > 1 ? "s" : ""} correspondent à votre zone et vous contacteront dans les prochaines heures.`
                : " Nous recherchons des déménageurs disponibles dans votre zone."}
            </p>
            {prospectId && (
              <p className="mb-6 text-sm text-gray-500">
                Numéro de suivi : <span className="font-mono font-semibold text-gray-700">{prospectId}</span>
              </p>
            )}

            {/* Phone verification block */}
            {smsSent && !phoneVerified && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6 text-left shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <h2 className="font-semibold text-blue-900">Vérifiez votre numéro</h2>
                </div>
                <p className="mb-4 text-sm text-blue-700">
                  Un code à 6 chiffres a été envoyé par SMS au <strong>{formData.phone}</strong>.
                  Saisissez-le ci-dessous pour confirmer votre numéro.
                </p>
                <div className="flex gap-3">
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="flex-1 text-center font-mono text-lg tracking-[0.3em]"
                  />
                  <Button
                    onClick={handleVerifyPhone}
                    disabled={verifying || otpCode.length !== 6}
                    className="shrink-0 gap-2"
                  >
                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Vérifier
                  </Button>
                </div>
                <p className="mt-2 text-xs text-blue-600">
                  Code valable 10 minutes. Les déménageurs verront que votre numéro est vérifié.
                </p>
              </motion.div>
            )}

            {phoneVerified && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
              >
                <ShieldCheck className="h-5 w-5" />
                Numéro de téléphone vérifié
              </motion.div>
            )}

            <div className="mb-8 rounded-xl border border-green-200 bg-white p-6 text-left shadow-sm">
              <h2 className="mb-3 font-semibold text-gray-900">Récapitulatif</h2>
              <dl className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <dt>Type</dt>
                  <dd className="font-medium text-gray-900 capitalize">{formData.moveType}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Départ</dt>
                  <dd className="text-right font-medium text-gray-900">
                    <div>{formData.fromAddress}</div>
                    <div className="text-xs text-muted-foreground">{formData.fromPostalCode} {formData.fromCity}</div>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Arrivée</dt>
                  <dd className="text-right font-medium text-gray-900">
                    <div>{formData.toAddress}</div>
                    <div className="text-xs text-muted-foreground">{formData.toPostalCode} {formData.toCity}</div>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Date</dt>
                  <dd className="font-medium text-gray-900">{formData.moveDate}</dd>
                </div>
              </dl>
            </div>
            <Button asChild size="lg">
              <a href="/">Retour à l&apos;accueil</a>
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  // -- Form -----------------------------------------------------------------

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <FileText className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Demande de devis gratuit
          </h1>
          <p className="mt-2 text-gray-500">
            Recevez jusqu&apos;à 5 devis de déménageurs certifiés en quelques minutes
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-10">
          <StepProgress currentStep={currentStep} />
        </div>

        {/* Step content with animations */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <Step1MoveType
              key="step1"
              defaultValues={formData}
              onNext={handleStep1}
            />
          )}
          {currentStep === 2 && (
            <Step2Addresses
              key="step2"
              defaultValues={formData}
              onNext={handleStep2}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && (
            <Step3Details
              key="step3"
              defaultValues={formData}
              onNext={handleStep3}
              onBack={handleBack}
            />
          )}
          {currentStep === 4 && (
            <Step4Contact
              key="step4"
              defaultValues={formData}
              onNext={handleStep4}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </AnimatePresence>

        <TrustTicker />
      </div>
    </div>
  );
}
