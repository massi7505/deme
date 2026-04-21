"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
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

const addressBlock = {
  address: z.string().min(2, "Veuillez entrer une adresse"),
  apartmentNumber: z.string().optional(),
  city: z.string().min(2, "Veuillez entrer une ville"),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, "Code postal invalide (5 chiffres)"),
  housingType: z.string().min(1, "Veuillez sélectionner un type de logement"),
  floor: z.number({ message: "Veuillez sélectionner l'étage" }),
  elevator: z.boolean(),
};

const step2Schema = z.object({
  fromAddress: addressBlock.address,
  fromApartmentNumber: addressBlock.apartmentNumber,
  fromCity: addressBlock.city,
  fromPostalCode: addressBlock.postalCode,
  fromHousingType: addressBlock.housingType,
  fromFloor: addressBlock.floor,
  fromElevator: addressBlock.elevator,
  toAddress: addressBlock.address,
  toApartmentNumber: addressBlock.apartmentNumber,
  toCity: addressBlock.city,
  toPostalCode: addressBlock.postalCode,
  toHousingType: addressBlock.housingType,
  toFloor: addressBlock.floor,
  toElevator: addressBlock.elevator,
});

export type Step2Data = z.infer<typeof step2Schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Step2AddressesProps {
  defaultValues?: Partial<Step2Data>;
  onNext: (data: Step2Data) => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const HOUSING_TYPES = [
  { value: "appartement", label: "Appartement" },
  { value: "maison", label: "Maison" },
  { value: "studio", label: "Studio" },
  { value: "loft", label: "Loft" },
] as const;

const FLOOR_OPTIONS = [
  { value: 0, label: "Rez-de-chaussée" },
  ...Array.from({ length: 10 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}${i === 0 ? "er" : "e"} étage`,
  })),
  { value: 11, label: "10+ étages" },
] as const;

// ---------------------------------------------------------------------------
// Address section sub-component
// ---------------------------------------------------------------------------

function AddressSection({
  prefix,
  title,
  icon,
  register,
  errors,
  watch,
  setValue,
}: {
  prefix: "from" | "to";
  title: string;
  icon: React.ReactNode;
  register: ReturnType<typeof useForm<Step2Data>>["register"];
  errors: ReturnType<typeof useForm<Step2Data>>["formState"]["errors"];
  watch: ReturnType<typeof useForm<Step2Data>>["watch"];
  setValue: ReturnType<typeof useForm<Step2Data>>["setValue"];
}) {
  const addressKey = `${prefix}Address` as const;
  const aptKey = `${prefix}ApartmentNumber` as const;
  const cityKey = `${prefix}City` as const;
  const postalKey = `${prefix}PostalCode` as const;
  const housingKey = `${prefix}HousingType` as const;
  const floorKey = `${prefix}Floor` as const;
  const elevatorKey = `${prefix}Elevator` as const;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-green-700">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      {/* Adresse exacte avec autocomplete */}
      <div className="space-y-2">
        <Label htmlFor={addressKey}>Adresse exacte</Label>
        <AddressAutocomplete
          id={addressKey}
          value={watch(addressKey) ?? ""}
          onChange={(val) => setValue(addressKey, val, { shouldValidate: true })}
          onSelect={(data) => {
            setValue(addressKey, data.address, { shouldValidate: true });
            setValue(cityKey, data.city, { shouldValidate: true });
            setValue(postalKey, data.postalCode, { shouldValidate: true });
          }}
          placeholder="ex: 12 Rue de la Paix, Paris"
          searchAddresses
        />
        {errors[addressKey] && (
          <p className="text-sm text-red-600">{errors[addressKey]?.message}</p>
        )}
      </div>

      {/* Numéro d'appartement */}
      <div className="space-y-2">
        <Label htmlFor={aptKey}>N° appartement / bâtiment / complément <span className="text-xs text-muted-foreground">(optionnel)</span></Label>
        <Input
          id={aptKey}
          placeholder="ex: Apt 4B, Bât C, Escalier 2..."
          autoComplete="address-line2"
          {...register(aptKey)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={cityKey}>Ville</Label>
          <Input
            id={cityKey}
            placeholder="Rempli automatiquement"
            autoComplete="address-level2"
            {...register(cityKey)}
            className="bg-gray-50"
          />
          {errors[cityKey] && (
            <p className="text-sm text-red-600">{errors[cityKey]?.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={postalKey}>Code postal</Label>
          <Input
            id={postalKey}
            placeholder="Rempli automatiquement"
            maxLength={5}
            inputMode="numeric"
            autoComplete="postal-code"
            {...register(postalKey)}
            className="bg-gray-50"
          />
          {errors[postalKey] && (
            <p className="text-sm text-red-600">{errors[postalKey]?.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={housingKey}>Type de logement</Label>
          <Select
            value={watch(housingKey) ?? ""}
            onValueChange={(val) => setValue(housingKey, val, { shouldValidate: true })}
          >
            <SelectTrigger id={housingKey}>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {HOUSING_TYPES.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors[housingKey] && (
            <p className="text-sm text-red-600">{errors[housingKey]?.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={floorKey}>Étage</Label>
          <Select
            value={watch(floorKey)?.toString() ?? ""}
            onValueChange={(val) => setValue(floorKey, parseInt(val, 10), { shouldValidate: true })}
          >
            <SelectTrigger id={floorKey}>
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent>
              {FLOOR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value.toString()}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors[floorKey] && (
            <p className="text-sm text-red-600">{errors[floorKey]?.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Checkbox
          id={elevatorKey}
          checked={watch(elevatorKey) ?? false}
          onCheckedChange={(checked) =>
            setValue(elevatorKey, checked === true, { shouldValidate: true })
          }
        />
        <Label htmlFor={elevatorKey} className="cursor-pointer">
          Ascenseur disponible
        </Label>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Step2Addresses({ defaultValues, onNext, onBack }: Step2AddressesProps) {
  const form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      fromAddress: defaultValues?.fromAddress ?? "",
      fromApartmentNumber: defaultValues?.fromApartmentNumber ?? "",
      fromCity: defaultValues?.fromCity ?? "",
      fromPostalCode: defaultValues?.fromPostalCode ?? "",
      fromHousingType: defaultValues?.fromHousingType ?? "",
      fromFloor: defaultValues?.fromFloor,
      fromElevator: defaultValues?.fromElevator ?? false,
      toAddress: defaultValues?.toAddress ?? "",
      toApartmentNumber: defaultValues?.toApartmentNumber ?? "",
      toCity: defaultValues?.toCity ?? "",
      toPostalCode: defaultValues?.toPostalCode ?? "",
      toHousingType: defaultValues?.toHousingType ?? "",
      toFloor: defaultValues?.toFloor,
      toElevator: defaultValues?.toElevator ?? false,
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit(onNext)} className="space-y-6">
        <AddressSection
          prefix="from"
          title="Adresse de départ"
          icon={<MapPin className="h-5 w-5" />}
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
        />

        {/* Visual separator with arrow */}
        <div className="flex items-center justify-center">
          <div className="rounded-full border border-gray-200 bg-white p-2 shadow-sm">
            <ArrowRight className="h-5 w-5 rotate-90 text-green-600 sm:rotate-0" />
          </div>
        </div>

        <AddressSection
          prefix="to"
          title="Adresse d'arrivée"
          icon={<MapPin className="h-5 w-5" />}
          register={register}
          errors={errors}
          watch={watch}
          setValue={setValue}
        />

        {/* Navigation */}
        <div className="flex justify-between pt-4">
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
