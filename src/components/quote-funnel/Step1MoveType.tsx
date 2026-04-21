"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Home, Briefcase, MapPin, Globe, Calendar } from "lucide-react";
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

const step1Schema = z
  .object({
    category: z.enum(["national", "entreprise", "international"], {
      message: "Sélectionnez une catégorie",
    }),
    moveType: z.enum(["appartement", "maison", "bureau"], {
      message: "Sélectionnez un type de bien",
    }),
    roomCount: z.string().min(1, "Sélectionnez le nombre de pièces"),
    volumeM3: z.number().positive("Volume positif").optional(),
    dateMode: z.enum(["precise", "flexible"]),
    moveDate: z.string().min(1, "Date requise"),
    moveDateEnd: z.string().optional(),
  })
  .refine(
    (d) =>
      d.dateMode === "precise" ||
      (!!d.moveDateEnd && d.moveDateEnd >= d.moveDate),
    {
      message: "La date de fin doit être après la date de début",
      path: ["moveDateEnd"],
    }
  );

export type Step1Data = z.infer<typeof step1Schema>;

interface Step1MoveTypeProps {
  defaultValues?: Partial<Step1Data>;
  onNext: (data: Step1Data) => void;
}

const CATEGORIES = [
  {
    value: "national" as const,
    label: "National",
    icon: MapPin,
    description: "Déménagement en France",
  },
  {
    value: "entreprise" as const,
    label: "Entreprise",
    icon: Briefcase,
    description: "Bureaux, commerce, local pro",
  },
  {
    value: "international" as const,
    label: "International",
    icon: Globe,
    description: "Hors de France",
  },
] as const;

const MOVE_TYPES_NATIONAL = [
  { value: "appartement" as const, label: "Appartement", icon: Building2, description: "Appartement en immeuble" },
  { value: "maison" as const, label: "Maison", icon: Home, description: "Maison individuelle" },
] as const;

const ROOM_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "2", label: "2 pièces" },
  { value: "3", label: "3 pièces" },
  { value: "4", label: "4 pièces" },
  { value: "5+", label: "5+ pièces" },
] as const;

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
      category: defaultValues?.category,
      moveType: defaultValues?.moveType,
      roomCount: defaultValues?.roomCount ?? "",
      volumeM3: defaultValues?.volumeM3,
      dateMode: defaultValues?.dateMode ?? "precise",
      moveDate: defaultValues?.moveDate ?? "",
      moveDateEnd: defaultValues?.moveDateEnd ?? "",
    },
  });

  const category = watch("category");
  const moveType = watch("moveType");
  const dateMode = watch("dateMode");
  const roomCount = watch("roomCount");

  const moveTypeRef = useRef<HTMLFieldSetElement | null>(null);
  const detailsRef = useRef<HTMLFieldSetElement | null>(null);
  const dateRef = useRef<HTMLFieldSetElement | null>(null);

  // Auto-scroll after each choice so the next block is clearly in view.
  useEffect(() => {
    if (category && !moveType) {
      // If entreprise, skip housing type selection
      if (category === "entreprise") {
        setValue("moveType", "bureau", { shouldValidate: true });
      } else {
        moveTypeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [category, moveType, setValue]);

  useEffect(() => {
    if (category && moveType && !roomCount) {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [category, moveType, roomCount]);

  useEffect(() => {
    if (roomCount) {
      dateRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [roomCount]);

  const today = new Date().toISOString().split("T")[0];
  const showMoveType = category === "national" || category === "international";

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit(onNext)} className="space-y-10">
        {/* Category */}
        <fieldset>
          <legend className="mb-4 text-lg font-semibold text-gray-900">
            Catégorie de déménagement
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const selected = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => {
                    setValue("category", c.value, { shouldValidate: true });
                    if (c.value === "entreprise") {
                      setValue("moveType", "bureau", { shouldValidate: true });
                    } else if (moveType === "bureau") {
                      setValue("moveType", "appartement", { shouldValidate: true });
                    }
                  }}
                  className={cn(
                    "group flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all duration-200",
                    selected
                      ? "border-green-600 bg-green-50 shadow-md shadow-green-100"
                      : "border-gray-200 bg-white hover:border-green-300 hover:shadow-sm"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                      selected
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-600"
                    )}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <p className={cn("font-semibold", selected ? "text-green-700" : "text-gray-900")}>{c.label}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{c.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {errors.category && (
            <p className="mt-2 text-sm text-red-600">{errors.category.message}</p>
          )}
        </fieldset>

        {/* Move type (only for national / international) */}
        <AnimatePresence>
          {showMoveType && (
            <motion.fieldset
              ref={moveTypeRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <legend className="mb-4 text-lg font-semibold text-gray-900">
                Type de bien
              </legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {MOVE_TYPES_NATIONAL.map((t) => {
                  const Icon = t.icon;
                  const selected = moveType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setValue("moveType", t.value, { shouldValidate: true })}
                      className={cn(
                        "group flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all duration-200",
                        selected
                          ? "border-green-600 bg-green-50 shadow-md shadow-green-100"
                          : "border-gray-200 bg-white hover:border-green-300 hover:shadow-sm"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
                          selected
                            ? "bg-green-600 text-white"
                            : "bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-600"
                        )}
                      >
                        <Icon className="h-7 w-7" />
                      </div>
                      <div>
                        <p className={cn("font-semibold", selected ? "text-green-700" : "text-gray-900")}>{t.label}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{t.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.moveType && (
                <p className="mt-2 text-sm text-red-600">{errors.moveType.message}</p>
              )}
            </motion.fieldset>
          )}
        </AnimatePresence>

        {/* Details (rooms + volume) */}
        <AnimatePresence>
          {category && moveType && (
            <motion.fieldset
              ref={detailsRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <legend className="mb-4 text-lg font-semibold text-gray-900">
                Volume estimé
              </legend>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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

                <div className="space-y-2">
                  <Label htmlFor="volumeM3">Ou volume en m³ (optionnel)</Label>
                  <Input
                    id="volumeM3"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="ex: 25"
                    {...register("volumeM3", {
                      setValueAs: (v) =>
                        v === "" || v === null || v === undefined ? undefined : Number(v),
                    })}
                  />
                  {errors.volumeM3 && (
                    <p className="text-sm text-red-600">{errors.volumeM3.message}</p>
                  )}
                </div>
              </div>
            </motion.fieldset>
          )}
        </AnimatePresence>

        {/* Date */}
        <AnimatePresence>
          {category && moveType && roomCount && (
            <motion.fieldset
              ref={dateRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <legend className="mb-4 text-lg font-semibold text-gray-900">
                Date souhaitée
              </legend>

              <div className="mb-4 inline-flex rounded-lg border bg-gray-50 p-1">
                {(
                  [
                    { value: "precise" as const, label: "Date précise" },
                    { value: "flexible" as const, label: "Plage flexible" },
                  ] as const
                ).map((opt) => {
                  const selected = dateMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue("dateMode", opt.value, { shouldValidate: true })}
                      className={cn(
                        "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                        selected ? "bg-white text-green-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="moveDate">
                    {dateMode === "flexible" ? "À partir du" : "Date du déménagement"}
                  </Label>
                  <Input id="moveDate" type="date" min={today} {...register("moveDate")} />
                  {errors.moveDate && (
                    <p className="text-sm text-red-600">{errors.moveDate.message}</p>
                  )}
                </div>
                {dateMode === "flexible" && (
                  <div className="space-y-2">
                    <Label htmlFor="moveDateEnd">Jusqu&apos;au</Label>
                    <Input id="moveDateEnd" type="date" min={watch("moveDate") || today} {...register("moveDateEnd")} />
                    {errors.moveDateEnd && (
                      <p className="text-sm text-red-600">{errors.moveDateEnd.message}</p>
                    )}
                  </div>
                )}
              </div>
              {dateMode === "flexible" && (
                <p className="mt-2 text-xs text-gray-500">
                  Une plage flexible permet aux déménageurs de vous proposer des tarifs plus avantageux.
                </p>
              )}
            </motion.fieldset>
          )}
        </AnimatePresence>

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="px-8" disabled={!category || !moveType || !roomCount}>
            Suivant
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
