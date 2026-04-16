"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Type de déménagement",
  "Adresses",
  "Détails",
  "Contact",
] as const;

interface StepProgressProps {
  currentStep: number;
}

export function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <nav aria-label="Progression du formulaire" className="w-full">
      <ol className="flex items-center justify-between">
        {STEPS.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const isFuture = stepNum > currentStep;

          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                    isCompleted &&
                      "border-green-600 bg-green-600 text-white",
                    isCurrent &&
                      "border-green-600 bg-white text-green-600 shadow-md shadow-green-100",
                    isFuture &&
                      "border-gray-300 bg-white text-gray-400"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={cn(
                    "hidden text-center text-xs font-medium sm:block",
                    isCompleted && "text-green-700",
                    isCurrent && "text-green-700",
                    isFuture && "text-gray-400"
                  )}
                >
                  {label}
                </span>
              </div>

              {/* Connector line between steps */}
              {idx < STEPS.length - 1 && (
                <div className="mx-2 h-0.5 flex-1 sm:mx-4">
                  <div
                    className={cn(
                      "h-full rounded-full transition-colors duration-300",
                      stepNum < currentStep ? "bg-green-600" : "bg-gray-200"
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
