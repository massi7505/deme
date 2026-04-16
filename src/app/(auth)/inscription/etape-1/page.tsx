"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Truck, Building2, Globe, ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
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

/* ---------- Data ---------- */
const MOVE_TYPES = [
  {
    id: "national",
    icon: Truck,
    title: "National",
    description: "Déménagements partout en France métropolitaine",
  },
  {
    id: "entreprise",
    icon: Building2,
    title: "Entreprise",
    description: "Transfert de bureaux et locaux professionnels",
  },
  {
    id: "international",
    icon: Globe,
    title: "International",
    description: "Déménagements vers et depuis l'étranger",
  },
] as const;

type MoveTypeId = (typeof MOVE_TYPES)[number]["id"];

/* ---------- Page ---------- */
export default function InscriptionEtape1Page() {
  const router = useRouter();
  const [selected, setSelected] = useState<MoveTypeId[]>(["national"]);
  const [showError, setShowError] = useState(false);

  function toggleType(id: MoveTypeId) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((t) => t !== id);
      }
      return [...prev, id];
    });
    setShowError(false);
  }

  function handleContinue() {
    if (selected.length === 0) {
      setShowError(true);
      return;
    }
    // Store in sessionStorage for later steps
    sessionStorage.setItem("inscription_types", JSON.stringify(selected));
    router.push("/inscription/etape-2");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
    >
      <StepIndicator current={1} />

      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Quel type de déménagement proposez-vous ?
        </h1>
        <p className="text-sm text-muted-foreground">
          Sélectionnez un ou plusieurs types de service
        </p>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {MOVE_TYPES.map((type, i) => {
          const Icon = type.icon;
          const isSelected = selected.includes(type.id);
          return (
            <motion.button
              key={type.id}
              type="button"
              onClick={() => toggleType(type.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.35 }}
              className={cn(
                "group relative flex w-full items-start gap-4 rounded-xl border-2 p-5 text-left transition-all",
                isSelected
                  ? "border-green-500 bg-green-50/50 shadow-md shadow-green-500/10"
                  : "border-muted bg-white hover:border-green-200 hover:bg-green-50/30"
              )}
            >
              {/* Checkbox indicator */}
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                  isSelected
                    ? "border-green-600 bg-green-600"
                    : "border-muted-foreground/30 bg-white"
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>

              {/* Icon */}
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors",
                  isSelected ? "bg-green-100" : "bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isSelected ? "text-green-700" : "text-muted-foreground"
                  )}
                />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-display text-sm font-semibold",
                    isSelected ? "text-green-900" : "text-foreground"
                  )}
                >
                  {type.title}
                </p>
                <motion.p
                  initial={false}
                  animate={{
                    height: isSelected ? "auto" : 0,
                    opacity: isSelected ? 1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden text-xs text-muted-foreground"
                >
                  {type.description}
                </motion.p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Error */}
      {showError && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-medium text-destructive"
        >
          Veuillez sélectionner au moins un type de déménagement
        </motion.p>
      )}

      {/* Continue */}
      <Button
        onClick={handleContinue}
        className="w-full bg-brand-gradient text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl hover:shadow-green-500/30 hover:brightness-110"
        size="lg"
      >
        Continuer
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  );
}
