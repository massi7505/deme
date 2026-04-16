"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Building2, Home, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const step1Schema = z.object({
  moveType: z.enum(["appartement", "maison", "bureau"], {
    message: "Veuillez sélectionner un type de déménagement",
  }),
  roomCount: z.string({ message: "Veuillez sélectionner le nombre de pièces" }),
  volumeM3: z
    .number()
    .positive("Le volume doit être positif")
    .optional(),
  moveDate: z.string().min(1, "Veuillez sélectionner une date"),
});

export type Step1Data = z.infer<typeof step1Schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Step1MoveTypeProps {
  defaultValues?: Partial<Step1Data>;
  onNext: (data: Step1Data) => void;
}

// ---------------------------------------------------------------------------
// Move type cards config
// ---------------------------------------------------------------------------

const MOVE_TYPES = [
  {
    value: "appartement" as const,
    label: "Appartement",
    icon: Building2,
    description: "Déménagement d'appartement",
  },
  {
    value: "maison" as const,
    label: "Maison",
    icon: Home,
    description: "Déménagement de maison",
  },
  {
    value: "bureau" as const,
    label: "Bureau / Commerce",
    icon: Briefcase,
    description: "Déménagement professionnel",
  },
] as const;

const ROOM_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "2", label: "2 pièces" },
  { value: "3", label: "3 pièces" },
  { value: "4", label: "4 pièces" },
  { value: "5+", label: "5+ pièces" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Step1MoveType({ defaultValues, onNext }: Step1MoveTypeProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      moveType: defaultValues?.moveType,
      roomCount: defaultValues?.roomCount ?? "",
      volumeM3: defaultValues?.volumeM3,
      moveDate: defaultValues?.moveDate ?? "",
    },
  });

  const selectedType = watch("moveType");

  const today = new Date().toISOString().split("T")[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit(onNext)} className="space-y-8">
        {/* Move type cards */}
        <fieldset>
          <legend className="mb-4 text-lg font-semibold text-gray-900">
            Type de déménagement
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {MOVE_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setValue("moveType", type.value, { shouldValidate: true })}
                  className={cn(
                    "group flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all duration-200",
                    isSelected
                      ? "border-green-600 bg-green-50 shadow-md shadow-green-100"
                      : "border-gray-200 bg-white hover:border-green-300 hover:shadow-sm"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                      isSelected
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-600"
                    )}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <p className={cn("font-semibold", isSelected ? "text-green-700" : "text-gray-900")}>
                      {type.label}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{type.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {errors.moveType && (
            <p className="mt-2 text-sm text-red-600">{errors.moveType.message}</p>
          )}
        </fieldset>

        {/* Volume estimator */}
        <fieldset>
          <legend className="mb-4 text-lg font-semibold text-gray-900">
            Volume estimé
          </legend>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Room count */}
            <div className="space-y-2">
              <Label htmlFor="roomCount">Nombre de pièces</Label>
              <Select
                value={watch("roomCount")}
                onValueChange={(val) => setValue("roomCount", val, { shouldValidate: true })}
              >
                <SelectTrigger id="roomCount">
                  <SelectValue placeholder="Sélectionnez" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roomCount && (
                <p className="text-sm text-red-600">{errors.roomCount.message}</p>
              )}
            </div>

            {/* Direct m3 input */}
            <div className="space-y-2">
              <Label htmlFor="volumeM3">Ou volume en m³ (optionnel)</Label>
              <Input
                id="volumeM3"
                type="number"
                min={1}
                placeholder="ex: 25"
                {...register("volumeM3", { valueAsNumber: true })}
              />
              {errors.volumeM3 && (
                <p className="text-sm text-red-600">{errors.volumeM3.message}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Move date */}
        <fieldset>
          <legend className="mb-4 text-lg font-semibold text-gray-900">
            Date souhaitée
          </legend>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="moveDate">Date du déménagement</Label>
            <Input
              id="moveDate"
              type="date"
              min={today}
              {...register("moveDate")}
            />
            {errors.moveDate && (
              <p className="text-sm text-red-600">{errors.moveDate.message}</p>
            )}
          </div>
        </fieldset>

        {/* Navigation */}
        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="px-8">
            Suivant
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
