"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Package, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const step3Schema = z.object({
  heavyItems: z.array(z.string()),
  services: z.array(z.string()),
  notes: z.string().optional(),
});

export type Step3Data = z.infer<typeof step3Schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Step3DetailsProps {
  defaultValues?: Partial<Step3Data>;
  onNext: (data: Step3Data) => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const HEAVY_ITEMS = [
  { value: "piano", label: "Piano" },
  { value: "coffre-fort", label: "Coffre-fort" },
  { value: "billard", label: "Billard" },
  { value: "aquarium", label: "Aquarium" },
] as const;

const SERVICES = [
  { value: "emballage", label: "Emballage" },
  { value: "demontage-remontage", label: "Démontage / Remontage meubles" },
  { value: "garde-meuble", label: "Garde-meuble" },
  { value: "nettoyage", label: "Nettoyage" },
] as const;

// ---------------------------------------------------------------------------
// Reusable checkbox group
// ---------------------------------------------------------------------------

function CheckboxGroup({
  title,
  icon,
  options,
  value,
  onChange,
}: {
  title: string;
  icon: React.ReactNode;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item));
    } else {
      onChange([...value, item]);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-green-700">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((opt) => {
          const isChecked = value.includes(opt.value);
          return (
            <label
              key={opt.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                isChecked
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200 hover:border-green-200 hover:bg-gray-50"
              )}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => toggle(opt.value)}
              />
              <span className={cn("text-sm font-medium", isChecked ? "text-green-700" : "text-gray-700")}>
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Step3Details({ defaultValues, onNext, onBack }: Step3DetailsProps) {
  const { control, register, handleSubmit, formState: { errors } } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      heavyItems: defaultValues?.heavyItems ?? [],
      services: defaultValues?.services ?? [],
      notes: defaultValues?.notes ?? "",
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit(onNext)} className="space-y-6">
        {/* Heavy items */}
        <Controller
          control={control}
          name="heavyItems"
          render={({ field }) => (
            <CheckboxGroup
              title="Objets lourds / spéciaux"
              icon={<Package className="h-5 w-5" />}
              options={HEAVY_ITEMS}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {/* Services */}
        <Controller
          control={control}
          name="services"
          render={({ field }) => (
            <CheckboxGroup
              title="Services souhaités"
              icon={<Wrench className="h-5 w-5" />}
              options={SERVICES}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {/* Notes */}
        <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <Label htmlFor="notes" className="text-lg font-semibold text-gray-900">
            Notes complémentaires (optionnel)
          </Label>
          <Textarea
            id="notes"
            placeholder="Décrivez tout détail important pour votre déménagement..."
            rows={4}
            enterKeyHint="done"
            {...register("notes")}
          />
          {errors.notes && (
            <p className="text-sm text-red-600">{errors.notes.message}</p>
          )}
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 -mx-4 flex justify-between gap-2 border-t bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:static md:mx-0 md:border-t-0 md:bg-transparent md:px-0 md:pb-0 md:pt-4 md:backdrop-blur-none">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            Retour
          </Button>
          <Button type="submit" size="lg" className="px-8">
            Suivant
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
