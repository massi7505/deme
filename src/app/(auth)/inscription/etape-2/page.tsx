"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  AlertTriangle,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEPARTMENTS } from "@/lib/utils";

const MAX_DEPARTMENTS = 2;

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

/* ---------- Page ---------- */
export default function InscriptionEtape2Page() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  const filteredDepartments = useMemo(() => {
    const entries = Object.entries(DEPARTMENTS);
    if (!search.trim()) return entries;
    const q = search.toLowerCase().trim();
    return entries.filter(
      ([code, name]) =>
        code.toLowerCase().includes(q) || name.toLowerCase().includes(q)
    );
  }, [search]);

  function toggleDepartment(code: string) {
    if (selected.includes(code)) {
      setSelected((prev) => prev.filter((c) => c !== code));
      setShowWarning(false);
      return;
    }
    if (selected.length >= MAX_DEPARTMENTS) {
      setShowWarning(true);
      return;
    }
    setSelected((prev) => [...prev, code]);
    setShowWarning(false);
  }

  function handleContinue() {
    if (selected.length === 0) return;
    sessionStorage.setItem("inscription_departments", JSON.stringify(selected));
    router.push("/inscription/etape-3");
  }

  function handleBack() {
    router.push("/inscription/etape-1");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6"
    >
      <StepIndicator current={2} />

      {/* Header */}
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Sélectionnez vos départements d&apos;intervention
        </h1>
        <p className="text-sm text-muted-foreground">
          Limité à {MAX_DEPARTMENTS} départements pendant l&apos;essai gratuit
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un département..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Warning */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
              <p className="text-xs text-yellow-800">
                Vous ne pouvez sélectionner que {MAX_DEPARTMENTS} départements
                pendant la période d&apos;essai. Désélectionnez un département
                pour en choisir un autre.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="max-h-[320px] overflow-y-auto rounded-lg border bg-white p-2 scrollbar-thin">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {filteredDepartments.map(([code, name]) => {
            const isSelected = selected.includes(code);
            return (
              <motion.button
                key={code}
                type="button"
                onClick={() => toggleDepartment(code)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs transition-all",
                  isSelected
                    ? "border-green-500 bg-green-50 shadow-sm"
                    : "border-transparent bg-muted/40 hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-7 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold",
                    isSelected
                      ? "bg-green-600 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {code}
                </span>
                <span
                  className={cn(
                    "truncate font-medium",
                    isSelected ? "text-green-900" : "text-foreground"
                  )}
                >
                  {name}
                </span>
                {isSelected && (
                  <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-green-600" />
                )}
              </motion.button>
            );
          })}
        </div>

        {filteredDepartments.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Aucun département trouvé pour &quot;{search}&quot;
          </div>
        )}
      </div>

      {/* Recap */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4"
          >
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <div className="text-xs">
              <span className="font-semibold text-green-900">
                Départements sélectionnés :
              </span>{" "}
              <span className="text-green-800">
                {selected
                  .map((code) => `${code} - ${DEPARTMENTS[code]}`)
                  .join(", ")}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <Button
          onClick={handleContinue}
          disabled={selected.length === 0}
          className="flex-1 bg-brand-gradient text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl hover:shadow-green-500/30 hover:brightness-110"
          size="lg"
        >
          Continuer
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
