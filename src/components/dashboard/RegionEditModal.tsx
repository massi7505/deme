"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
// Select components available if needed for future enhancements
import { DEPARTMENTS, REGIONS } from "@/lib/utils";
import { CoverageMap } from "@/components/dashboard/CoverageMap";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import toast from "react-hot-toast";
import { Trash2, Loader2, Info, MapPin, ChevronLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Region {
  id: string;
  department_code: string;
  department_name: string;
  categories: string[];
}

interface RadiusRule {
  id: string;
  departure_city: string;
  lat: number;
  lng: number;
  radius_km: number;
  move_types: string[];
}

interface RegionEditModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  regions: Region[];
  radiusRules: RadiusRule[];
}

const CATEGORY_OPTIONS = [
  { value: "national", label: "National", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "entreprise", label: "Entreprise", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "international", label: "International", color: "bg-purple-100 text-purple-800 border-purple-200" },
];

// Villes principales par département avec code postal
const DEPT_CITIES: Record<string, Array<{ name: string; cp: string }>> = {
  "01": [{ name: "Bourg-en-Bresse", cp: "01000" }, { name: "Oyonnax", cp: "01100" }, { name: "Ambérieu-en-Bugey", cp: "01500" }, { name: "Belley", cp: "01300" }],
  "02": [{ name: "Laon", cp: "02000" }, { name: "Saint-Quentin", cp: "02100" }, { name: "Soissons", cp: "02200" }, { name: "Château-Thierry", cp: "02400" }],
  "06": [{ name: "Nice", cp: "06000" }, { name: "Cannes", cp: "06400" }, { name: "Antibes", cp: "06600" }, { name: "Grasse", cp: "06130" }, { name: "Menton", cp: "06500" }],
  "13": [{ name: "Marseille", cp: "13000" }, { name: "Aix-en-Provence", cp: "13100" }, { name: "Arles", cp: "13200" }, { name: "Martigues", cp: "13500" }, { name: "Salon-de-Provence", cp: "13300" }],
  "31": [{ name: "Toulouse", cp: "31000" }, { name: "Blagnac", cp: "31700" }, { name: "Colomiers", cp: "31770" }, { name: "Tournefeuille", cp: "31170" }, { name: "Muret", cp: "31600" }],
  "33": [{ name: "Bordeaux", cp: "33000" }, { name: "Mérignac", cp: "33700" }, { name: "Pessac", cp: "33600" }, { name: "Talence", cp: "33400" }, { name: "Libourne", cp: "33500" }],
  "34": [{ name: "Montpellier", cp: "34000" }, { name: "Béziers", cp: "34500" }, { name: "Sète", cp: "34200" }, { name: "Lunel", cp: "34400" }, { name: "Agde", cp: "34300" }],
  "38": [{ name: "Grenoble", cp: "38000" }, { name: "Échirolles", cp: "38130" }, { name: "Saint-Martin-d'Hères", cp: "38400" }, { name: "Vienne", cp: "38200" }, { name: "Bourgoin-Jallieu", cp: "38300" }],
  "44": [{ name: "Nantes", cp: "44000" }, { name: "Saint-Nazaire", cp: "44600" }, { name: "Rezé", cp: "44400" }, { name: "Saint-Herblain", cp: "44800" }],
  "59": [{ name: "Lille", cp: "59000" }, { name: "Roubaix", cp: "59100" }, { name: "Tourcoing", cp: "59200" }, { name: "Dunkerque", cp: "59140" }, { name: "Villeneuve-d'Ascq", cp: "59650" }, { name: "Valenciennes", cp: "59300" }],
  "67": [{ name: "Strasbourg", cp: "67000" }, { name: "Haguenau", cp: "67500" }, { name: "Schiltigheim", cp: "67300" }, { name: "Illkirch-Graffenstaden", cp: "67400" }],
  "69": [{ name: "Lyon", cp: "69000" }, { name: "Villeurbanne", cp: "69100" }, { name: "Vénissieux", cp: "69200" }, { name: "Vaulx-en-Velin", cp: "69120" }, { name: "Saint-Priest", cp: "69800" }, { name: "Caluire-et-Cuire", cp: "69300" }],
  "75": [{ name: "Paris 1er", cp: "75001" }, { name: "Paris 2e", cp: "75002" }, { name: "Paris 3e", cp: "75003" }, { name: "Paris 4e", cp: "75004" }, { name: "Paris 5e", cp: "75005" }, { name: "Paris 6e", cp: "75006" }, { name: "Paris 7e", cp: "75007" }, { name: "Paris 8e", cp: "75008" }, { name: "Paris 9e", cp: "75009" }, { name: "Paris 10e", cp: "75010" }, { name: "Paris 11e", cp: "75011" }, { name: "Paris 12e", cp: "75012" }, { name: "Paris 13e", cp: "75013" }, { name: "Paris 14e", cp: "75014" }, { name: "Paris 15e", cp: "75015" }, { name: "Paris 16e", cp: "75016" }, { name: "Paris 17e", cp: "75017" }, { name: "Paris 18e", cp: "75018" }, { name: "Paris 19e", cp: "75019" }, { name: "Paris 20e", cp: "75020" }],
  "76": [{ name: "Rouen", cp: "76000" }, { name: "Le Havre", cp: "76600" }, { name: "Dieppe", cp: "76200" }, { name: "Sotteville-lès-Rouen", cp: "76300" }],
  "77": [{ name: "Meaux", cp: "77100" }, { name: "Chelles", cp: "77500" }, { name: "Melun", cp: "77000" }, { name: "Pontault-Combault", cp: "77340" }, { name: "Savigny-le-Temple", cp: "77176" }],
  "78": [{ name: "Versailles", cp: "78000" }, { name: "Sartrouville", cp: "78500" }, { name: "Mantes-la-Jolie", cp: "78200" }, { name: "Saint-Germain-en-Laye", cp: "78100" }, { name: "Poissy", cp: "78300" }],
  "83": [{ name: "Toulon", cp: "83000" }, { name: "Fréjus", cp: "83600" }, { name: "Hyères", cp: "83400" }, { name: "Draguignan", cp: "83300" }, { name: "La Seyne-sur-Mer", cp: "83500" }],
  "91": [{ name: "Évry-Courcouronnes", cp: "91000" }, { name: "Corbeil-Essonnes", cp: "91100" }, { name: "Massy", cp: "91300" }, { name: "Palaiseau", cp: "91120" }, { name: "Savigny-sur-Orge", cp: "91600" }, { name: "Athis-Mons", cp: "91200" }],
  "92": [{ name: "Boulogne-Billancourt", cp: "92100" }, { name: "Nanterre", cp: "92000" }, { name: "Colombes", cp: "92700" }, { name: "Courbevoie", cp: "92400" }, { name: "Asnières-sur-Seine", cp: "92600" }, { name: "Rueil-Malmaison", cp: "92500" }, { name: "Levallois-Perret", cp: "92300" }],
  "93": [{ name: "Saint-Denis", cp: "93200" }, { name: "Montreuil", cp: "93100" }, { name: "Aubervilliers", cp: "93300" }, { name: "Aulnay-sous-Bois", cp: "93600" }, { name: "Drancy", cp: "93700" }, { name: "Bondy", cp: "93140" }, { name: "Bobigny", cp: "93000" }],
  "94": [{ name: "Créteil", cp: "94000" }, { name: "Vitry-sur-Seine", cp: "94400" }, { name: "Champigny-sur-Marne", cp: "94500" }, { name: "Saint-Maur-des-Fossés", cp: "94100" }, { name: "Ivry-sur-Seine", cp: "94200" }, { name: "Maisons-Alfort", cp: "94700" }],
  "95": [{ name: "Cergy", cp: "95000" }, { name: "Argenteuil", cp: "95100" }, { name: "Sarcelles", cp: "95200" }, { name: "Garges-lès-Gonesse", cp: "95140" }, { name: "Bezons", cp: "95870" }],
};

export function RegionEditModal({ open, onClose, onSaved, regions, radiusRules }: RegionEditModalProps) {
  const [tab, setTab] = useState("rayon");
  const [saving, setSaving] = useState(false);

  // Rayon state
  const [rayonCity, setRayonCity] = useState("");
  const [rayonLat, setRayonLat] = useState(0);
  const [rayonLng, setRayonLng] = useState(0);
  const [rayonKm, setRayonKm] = useState(30);
  const [rayonTypes, setRayonTypes] = useState<string[]>(["national"]);

  // Region tab state
  const [selectedDepts, setSelectedDepts] = useState<Record<string, string[]>>({});
  const [excludedCities, setExcludedCities] = useState<Record<string, string[]>>({});
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

  // Init selected departments from existing regions
  useEffect(() => {
    const depts: Record<string, string[]> = {};
    for (const r of regions) {
      depts[r.department_code] = r.categories;
    }
    setSelectedDepts(depts);
  }, [regions]);

  function toggleDept(code: string) {
    setSelectedDepts((prev) => {
      const next = { ...prev };
      if (next[code]) {
        delete next[code];
      } else {
        next[code] = ["national"];
      }
      return next;
    });
  }

  function toggleRegionBulk(deptCodes: string[]) {
    setSelectedDepts((prev) => {
      const allPresent = deptCodes.every((c) => !!prev[c]);
      const next = { ...prev };
      if (allPresent) {
        // Remove all departments of this region
        for (const c of deptCodes) {
          delete next[c];
        }
      } else {
        // Add any missing departments with default category
        for (const c of deptCodes) {
          if (!next[c]) {
            next[c] = ["national"];
          }
        }
      }
      return next;
    });
  }

  function toggleDeptCategory(code: string, category: string) {
    setSelectedDepts((prev) => {
      const current = prev[code] || [];
      const next = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      return { ...prev, [code]: next.length > 0 ? next : ["national"] };
    });
  }

  async function handleAddRadius() {
    if (!rayonCity) { toast.error("Sélectionnez une ville de départ"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_radius",
          departure_city: rayonCity,
          lat: rayonLat,
          lng: rayonLng,
          radius_km: rayonKm,
          move_types: rayonTypes,
        }),
      });
      if (res.ok) {
        toast.success("Rayon ajouté !");
        setRayonCity("");
        onSaved();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur");
      }
    } catch { toast.error("Erreur réseau"); }
    finally { setSaving(false); }
  }

  async function handleDeleteRadius(id: string) {
    const res = await fetch("/api/dashboard/regions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_radius", id }),
    });
    if (res.ok) { toast.success("Rayon supprimé"); onSaved(); }
    else toast.error("Erreur");
  }

  async function handleSaveRegions() {
    setSaving(true);
    try {
      // Remove regions that are no longer selected
      for (const r of regions) {
        if (!selectedDepts[r.department_code]) {
          await fetch("/api/dashboard/regions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "remove_region", id: r.id }),
          });
        }
      }

      // Add new regions or update existing
      for (const [code, categories] of Object.entries(selectedDepts)) {
        const existing = regions.find((r) => r.department_code === code);
        if (!existing) {
          await fetch("/api/dashboard/regions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add_region", department_code: code, categories }),
          });
        }
      }

      toast.success("Régions enregistrées !");
      onSaved();
      onClose();
    } catch { toast.error("Erreur"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Modifier les régions et les catégories</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rayon">Rayon</TabsTrigger>
            <TabsTrigger value="region">Région</TabsTrigger>
          </TabsList>

          {/* ─── RAYON TAB ──────────────────────────────── */}
          <TabsContent value="rayon" className="flex-1 overflow-y-auto space-y-4 mt-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Vous pouvez définir un rayon à partir d&apos;un lieu de départ, un rayon définit la distance autour du ou de ses lieux de déménagement. Ajoutez autant de rayons que nécessaire.</p>
            </div>

            {/* Existing radius rules */}
            {radiusRules.length > 0 && (
              <div className="space-y-2">
                {radiusRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{rule.departure_city}</p>
                      <p className="text-xs text-muted-foreground">{rule.radius_km} km · {rule.move_types.join(", ")}</p>
                    </div>
                    <button onClick={() => handleDeleteRadius(rule.id)} className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new radius */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="mb-1.5 block text-sm font-medium">Lieu de départ</label>
                  <AddressAutocomplete
                    value={rayonCity}
                    onChange={setRayonCity}
                    onSelect={(data) => {
                      setRayonCity(data.city || data.address);
                      setRayonLat(data.lat);
                      setRayonLng(data.lng);
                    }}
                    placeholder="Paris, France"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Rayon</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={5}
                      max={200}
                      value={rayonKm}
                      onChange={(e) => setRayonKm(parseInt(e.target.value))}
                      className="flex-1 accent-green-500"
                    />
                    <span className="w-16 rounded-lg border px-2 py-1 text-center text-sm font-semibold">{rayonKm} km</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Type de déménagement</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <label key={cat.value} className="flex items-center gap-1.5">
                        <Checkbox
                          checked={rayonTypes.includes(cat.value)}
                          onCheckedChange={(checked) => {
                            setRayonTypes((prev) =>
                              checked ? [...prev, cat.value] : prev.filter((t) => t !== cat.value)
                            );
                          }}
                        />
                        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", cat.color)}>{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Map preview */}
              {rayonLat !== 0 && rayonLng !== 0 && (
                <CoverageMap
                  markers={[{ lat: rayonLat, lng: rayonLng, label: rayonCity, radiusKm: rayonKm }]}
                  className="h-72"
                />
              )}

              <Button onClick={handleAddRadius} disabled={saving || !rayonCity} className="gap-2 bg-brand-gradient">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Enregistrer le rayon
              </Button>
            </div>
          </TabsContent>

          {/* ─── RÉGION TAB ─────────────────────────────── */}
          <TabsContent value="region" className="flex-1 overflow-hidden flex flex-col mt-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 flex items-start gap-2 mb-4">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Sélectionnez une région, puis cochez les départements où vous intervenez.</p>
            </div>

            {!activeRegion ? (
              /* ── STEP 1: Region grid ── */
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Bulk region picker — toggle all departments of a region in one click */}
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Sélection rapide par région française
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(REGIONS).map(([regionName, deptCodes]) => {
                      const present = deptCodes.filter((d) => !!selectedDepts[d]).length;
                      const state =
                        present === 0
                          ? "none"
                          : present === deptCodes.length
                          ? "all"
                          : "partial";
                      return (
                        <button
                          key={regionName}
                          type="button"
                          onClick={() => toggleRegionBulk(deptCodes)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            state === "all"
                              ? "border-green-500 bg-green-500 text-white"
                              : state === "partial"
                              ? "border-green-300 bg-green-50 text-green-800"
                              : "border-gray-200 bg-white text-gray-700 hover:border-green-200"
                          )}
                          aria-pressed={state === "all"}
                        >
                          {regionName}{" "}
                          <span className="opacity-70">
                            ({present}/{deptCodes.length})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(REGIONS).map(([regionName, deptCodes]) => {
                    const selectedCount = deptCodes.filter((c) => !!selectedDepts[c]).length;
                    return (
                      <button
                        key={regionName}
                        onClick={() => { setActiveRegion(regionName); setExpandedDept(null); }}
                        className={cn(
                          "relative rounded-xl border p-4 text-left transition-all hover:shadow-md",
                          selectedCount > 0
                            ? "border-green-300 bg-green-50/50 ring-1 ring-green-200"
                            : "hover:border-gray-300"
                        )}
                      >
                        <p className="text-sm font-semibold">{regionName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{deptCodes.length} départements</p>
                        {selectedCount > 0 && (
                          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            <Check className="h-3 w-3" /> {selectedCount}/{deptCodes.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ── STEP 2: Departments of selected region ── */
              <div className="flex-1 overflow-hidden flex flex-col">
                <button
                  onClick={() => setActiveRegion(null)}
                  className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" /> Retour aux régions
                </button>
                <h3 className="text-base font-semibold mb-3">{activeRegion}</h3>

                <div className="flex-1 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr className="border-b">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-8"></th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Département</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Catégorie</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(REGIONS[activeRegion] || []).map((code) => {
                        const name = DEPARTMENTS[code] || code;
                        const isSelected = !!selectedDepts[code];
                        const cats = selectedDepts[code] || [];
                        const cities = DEPT_CITIES[code];
                        const isExpanded = expandedDept === code;
                        const excluded = excludedCities[code] || [];

                        return (
                          <tr key={code} className={cn("border-b transition-colors", isSelected && "bg-green-50/30")}>
                            <td className="px-4 py-2.5 align-top">
                              <Checkbox checked={isSelected} onCheckedChange={() => toggleDept(code)} />
                            </td>
                            <td className="px-4 py-2.5 align-top">
                              <div>
                                <button
                                  className="flex items-center gap-1 text-left"
                                  onClick={() => isSelected && cities ? setExpandedDept(isExpanded ? null : code) : toggleDept(code)}
                                >
                                  <span className="font-medium">{name}</span>
                                  <span className="text-xs text-muted-foreground">({code})</span>
                                  {isSelected && cities && (
                                    <span className="ml-1 text-xs text-muted-foreground">
                                      {isExpanded ? "▲" : "▼"} {cities.length} villes
                                      {excluded.length > 0 && <span className="ml-1 text-red-500">({excluded.length} exclue{excluded.length > 1 ? "s" : ""})</span>}
                                    </span>
                                  )}
                                </button>
                                {isSelected && isExpanded && cities && (
                                  <div className="mt-2 ml-1 space-y-1 rounded-lg border bg-white p-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Villes / Codes postaux — décochez pour exclure :</p>
                                    <div className="grid gap-1 sm:grid-cols-2">
                                      {cities.map((city) => {
                                        const isExcluded = excluded.includes(city.cp);
                                        return (
                                          <label key={city.cp} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors", isExcluded ? "bg-red-50 line-through text-red-400" : "hover:bg-gray-50")}>
                                            <Checkbox
                                              checked={!isExcluded}
                                              onCheckedChange={(checked) => {
                                                setExcludedCities((prev) => {
                                                  const current = prev[code] || [];
                                                  return checked
                                                    ? { ...prev, [code]: current.filter((c) => c !== city.cp) }
                                                    : { ...prev, [code]: [...current, city.cp] };
                                                });
                                              }}
                                            />
                                            <span className="font-medium">{city.name}</span>
                                            <span className="text-muted-foreground">{city.cp}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 align-top">
                              {isSelected ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {CATEGORY_OPTIONS.map((cat) => (
                                    <button
                                      key={cat.value}
                                      onClick={() => toggleDeptCategory(code, cat.value)}
                                      className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all", cats.includes(cat.value) ? cat.color : "bg-gray-50 text-gray-400 border-gray-200")}
                                    >
                                      {cat.label}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Type de déménagement</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Selected summary */}
            {Object.keys(selectedDepts).length > 0 && (
              <div className="mt-3 rounded-lg border bg-green-50/50 p-3 text-sm">
                <span className="font-medium">{Object.keys(selectedDepts).length} département{Object.keys(selectedDepts).length > 1 ? "s" : ""} sélectionné{Object.keys(selectedDepts).length > 1 ? "s" : ""}</span>
                <span className="text-muted-foreground">
                  {" : "}{Object.entries(selectedDepts).map(([code, cats]) => `${DEPARTMENTS[code]} (${cats.join(", ")})`).join(" · ")}
                </span>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          {tab === "region" && (
            <Button onClick={handleSaveRegions} disabled={saving} className="gap-2 bg-brand-gradient">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
