"use client";

import { useState, useMemo } from "react";
import { Tag, MapPin, Package, Sun, TrendingDown, Ticket, Plus, Trash2, X, Calculator } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Settings, DepartmentRule, VolumeRule, SeasonRule, DiscountTier, PromoCode } from "./types";

interface Props {
  settings: Settings;
  onUpdate: <K extends keyof Settings>(field: K, value: Settings[K]) => void;
}

/* ------------------------------------------------------------------ */
/* Shared input style                                                  */
/* ------------------------------------------------------------------ */
const inputCls = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]";
const smallInputCls = "rounded-lg border px-2.5 py-1.5 text-sm outline-none focus:border-[var(--brand-green)]";

/* ------------------------------------------------------------------ */
/* Departments list for select                                        */
/* ------------------------------------------------------------------ */
const DEPARTMENTS = [
  "01 - Ain","02 - Aisne","03 - Allier","04 - Alpes-de-Haute-Provence","05 - Hautes-Alpes",
  "06 - Alpes-Maritimes","07 - Ardèche","08 - Ardennes","09 - Ariège","10 - Aube",
  "11 - Aude","12 - Aveyron","13 - Bouches-du-Rhône","14 - Calvados","15 - Cantal",
  "16 - Charente","17 - Charente-Maritime","18 - Cher","19 - Corrèze","2A - Corse-du-Sud",
  "2B - Haute-Corse","21 - Côte-d'Or","22 - Côtes-d'Armor","23 - Creuse","24 - Dordogne",
  "25 - Doubs","26 - Drôme","27 - Eure","28 - Eure-et-Loir","29 - Finistère",
  "30 - Gard","31 - Haute-Garonne","32 - Gers","33 - Gironde","34 - Hérault",
  "35 - Ille-et-Vilaine","36 - Indre","37 - Indre-et-Loire","38 - Isère","39 - Jura",
  "40 - Landes","41 - Loir-et-Cher","42 - Loire","43 - Haute-Loire","44 - Loire-Atlantique",
  "45 - Loiret","46 - Lot","47 - Lot-et-Garonne","48 - Lozère","49 - Maine-et-Loire",
  "50 - Manche","51 - Marne","52 - Haute-Marne","53 - Mayenne","54 - Meurthe-et-Moselle",
  "55 - Meuse","56 - Morbihan","57 - Moselle","58 - Nièvre","59 - Nord",
  "60 - Oise","61 - Orne","62 - Pas-de-Calais","63 - Puy-de-Dôme","64 - Pyrénées-Atlantiques",
  "65 - Hautes-Pyrénées","66 - Pyrénées-Orientales","67 - Bas-Rhin","68 - Haut-Rhin","69 - Rhône",
  "70 - Haute-Saône","71 - Saône-et-Loire","72 - Sarthe","73 - Savoie","74 - Haute-Savoie",
  "75 - Paris","76 - Seine-Maritime","77 - Seine-et-Marne","78 - Yvelines","79 - Deux-Sèvres",
  "80 - Somme","81 - Tarn","82 - Tarn-et-Garonne","83 - Var","84 - Vaucluse",
  "85 - Vendée","86 - Vienne","87 - Haute-Vienne","88 - Vosges","89 - Yonne",
  "90 - Territoire de Belfort","91 - Essonne","92 - Hauts-de-Seine","93 - Seine-Saint-Denis",
  "94 - Val-de-Marne","95 - Val-d'Oise",
];

export default function PricingTab({ settings, onUpdate }: Props) {
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [simCategory, setSimCategory] = useState("national");
  const [simDept, setSimDept] = useState("");
  const [simVolume, setSimVolume] = useState("");
  const [simPromo, setSimPromo] = useState("");

  const isSmartMode = settings.pricingMode === "smart";

  /* Live price simulator */
  const simulatedPrice = useMemo(() => {
    const basePrices: Record<string, string> = {
      national: settings.priceNational || "12.00",
      entreprise: settings.priceEntreprise || "18.00",
      international: settings.priceInternational || "25.00",
    };
    let price = parseFloat(basePrices[simCategory] || basePrices.national);
    const steps: Array<{ label: string; value: string; delta: string }> = [
      { label: "Prix de base", value: `${price.toFixed(2)} €`, delta: "" },
    ];

    if (isSmartMode) {
      // Department
      if (simDept) {
        const deptRule = settings.smartPricingDepartments.find((r) => r.code === simDept);
        if (deptRule && deptRule.percent !== 0) {
          const before = price;
          price *= 1 + deptRule.percent / 100;
          steps.push({ label: `Département ${deptRule.code} (${deptRule.percent > 0 ? "+" : ""}${deptRule.percent}%)`, value: `${price.toFixed(2)} €`, delta: `${(price - before) > 0 ? "+" : ""}${(price - before).toFixed(2)} €` });
        }
      }

      // Volume
      const vol = parseFloat(simVolume);
      if (vol > 0) {
        const volRule = settings.smartPricingVolume.find((r) => vol >= r.minM3 && vol <= r.maxM3);
        if (volRule && volRule.percent !== 0) {
          const before = price;
          price *= 1 + volRule.percent / 100;
          steps.push({ label: `Volume ${vol} m³ (${volRule.percent > 0 ? "+" : ""}${volRule.percent}%)`, value: `${price.toFixed(2)} €`, delta: `${(price - before) > 0 ? "+" : ""}${(price - before).toFixed(2)} €` });
        }
      }

      // Season
      const today = new Date().toISOString().slice(0, 10);
      const seasonRule = settings.smartPricingSeasons.find((r) => r.startDate && r.endDate && today >= r.startDate && today <= r.endDate);
      if (seasonRule && seasonRule.percent !== 0) {
        const before = price;
        price *= 1 + seasonRule.percent / 100;
        steps.push({ label: `Saison active (${seasonRule.percent > 0 ? "+" : ""}${seasonRule.percent}%)`, value: `${price.toFixed(2)} €`, delta: `${(price - before) > 0 ? "+" : ""}${(price - before).toFixed(2)} €` });
      }

      // Discount tiers (based on a hypothetical monthly count — skip for now, just show if configured)
    }

    // Promo code
    if (simPromo) {
      const promo = settings.promoCodes.find((p) => p.code === simPromo.toUpperCase() && p.active);
      if (promo) {
        const before = price;
        if (promo.type === "percent") {
          price *= 1 - promo.value / 100;
          steps.push({ label: `Code promo ${promo.code} (-${promo.value}%)`, value: `${price.toFixed(2)} €`, delta: `${(price - before).toFixed(2)} €` });
        } else {
          price -= promo.value;
          steps.push({ label: `Code promo ${promo.code} (-${promo.value.toFixed(2)} €)`, value: `${price.toFixed(2)} €`, delta: `${(price - before).toFixed(2)} €` });
        }
      }
    }

    return { finalPrice: Math.max(0, price), steps };
  }, [simCategory, simDept, simVolume, simPromo, settings, isSmartMode]);

  /* ---------------------------------------------------------------- */
  /* Department rules                                                  */
  /* ---------------------------------------------------------------- */
  function addDepartmentRule() {
    const existing = settings.smartPricingDepartments;
    const first = DEPARTMENTS.find((d) => !existing.some((r) => r.code === d.split(" - ")[0]));
    if (!first) return;
    const [code, name] = first.split(" - ");
    onUpdate("smartPricingDepartments", [...existing, { code, name, percent: 0 }]);
  }

  function updateDeptRule(index: number, field: keyof DepartmentRule, value: string | number) {
    const rules = [...settings.smartPricingDepartments];
    if (field === "code") {
      const full = DEPARTMENTS.find((d) => d.startsWith(value as string));
      if (full) {
        const [code, name] = full.split(" - ");
        rules[index] = { ...rules[index], code, name };
      }
    } else {
      rules[index] = { ...rules[index], [field]: value };
    }
    onUpdate("smartPricingDepartments", rules);
  }

  function removeDeptRule(index: number) {
    onUpdate("smartPricingDepartments", settings.smartPricingDepartments.filter((_, i) => i !== index));
  }

  /* ---------------------------------------------------------------- */
  /* Volume rules                                                      */
  /* ---------------------------------------------------------------- */
  function addVolumeRule() {
    const rules = settings.smartPricingVolume;
    const lastMax = rules.length > 0 ? rules[rules.length - 1].maxM3 : 0;
    onUpdate("smartPricingVolume", [...rules, { minM3: lastMax, maxM3: lastMax + 20, percent: 0 }]);
  }

  function updateVolumeRule(index: number, field: keyof VolumeRule, value: number) {
    const rules = [...settings.smartPricingVolume];
    rules[index] = { ...rules[index], [field]: value };
    onUpdate("smartPricingVolume", rules);
  }

  function removeVolumeRule(index: number) {
    onUpdate("smartPricingVolume", settings.smartPricingVolume.filter((_, i) => i !== index));
  }

  /* ---------------------------------------------------------------- */
  /* Season rules                                                      */
  /* ---------------------------------------------------------------- */
  function addSeasonRule() {
    onUpdate("smartPricingSeasons", [
      ...settings.smartPricingSeasons,
      { startDate: "", endDate: "", percent: 0 },
    ]);
  }

  function updateSeasonRule(index: number, field: keyof SeasonRule, value: string | number) {
    const rules = [...settings.smartPricingSeasons];
    rules[index] = { ...rules[index], [field]: value };
    onUpdate("smartPricingSeasons", rules);
  }

  function removeSeasonRule(index: number) {
    onUpdate("smartPricingSeasons", settings.smartPricingSeasons.filter((_, i) => i !== index));
  }

  /* ---------------------------------------------------------------- */
  /* Discount tiers                                                    */
  /* ---------------------------------------------------------------- */
  function addDiscountTier() {
    const tiers = settings.volumeDiscountTiers;
    const lastMax = tiers.length > 0 ? tiers[tiers.length - 1].maxLeads : 0;
    onUpdate("volumeDiscountTiers", [...tiers, { minLeads: lastMax + 1, maxLeads: lastMax + 10, discountPercent: 0 }]);
  }

  function updateDiscountTier(index: number, field: keyof DiscountTier, value: number) {
    const tiers = [...settings.volumeDiscountTiers];
    tiers[index] = { ...tiers[index], [field]: value };
    onUpdate("volumeDiscountTiers", tiers);
  }

  function removeDiscountTier(index: number) {
    onUpdate("volumeDiscountTiers", settings.volumeDiscountTiers.filter((_, i) => i !== index));
  }

  /* ---------------------------------------------------------------- */
  /* Promo codes                                                       */
  /* ---------------------------------------------------------------- */
  function openNewPromo() {
    setEditingPromo({
      id: crypto.randomUUID(),
      code: "",
      type: "percent",
      value: 0,
      expiresAt: "",
      maxUses: 0,
      usedCount: 0,
      companyId: "",
      active: true,
    });
    setPromoDialogOpen(true);
  }

  function savePromo(promo: PromoCode) {
    const existing = settings.promoCodes;
    const idx = existing.findIndex((p) => p.id === promo.id);
    if (idx >= 0) {
      const updated = [...existing];
      updated[idx] = promo;
      onUpdate("promoCodes", updated);
    } else {
      onUpdate("promoCodes", [...existing, promo]);
    }
    setPromoDialogOpen(false);
    setEditingPromo(null);
  }

  function removePromo(id: string) {
    onUpdate("promoCodes", settings.promoCodes.filter((p) => p.id !== id));
  }

  function togglePromo(id: string) {
    const promos = settings.promoCodes.map((p) =>
      p.id === id ? { ...p, active: !p.active } : p
    );
    onUpdate("promoCodes", promos);
  }

  const deptCount = settings.smartPricingDepartments.length;
  const volCount = settings.smartPricingVolume.length;
  const seasonCount = settings.smartPricingSeasons.length;
  const discountCount = settings.volumeDiscountTiers.length;
  const promoActiveCount = settings.promoCodes.filter((p) => p.active).length;

  return (
    <div className="space-y-6">
      {/* Pricing mode switch */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Tag className="h-4 w-4 text-[var(--brand-green)]" /> Mode de tarification
          </h3>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tarification intelligente</p>
              <p className="text-xs text-muted-foreground">
                {isSmartMode
                  ? "Les prix sont calculés dynamiquement selon les règles ci-dessous"
                  : "Prix fixe par catégorie de déménagement"}
              </p>
            </div>
            <Switch
              checked={isSmartMode}
              onCheckedChange={(checked) => onUpdate("pricingMode", checked ? "smart" : "fixed")}
            />
          </div>

          {/* Smart pricing summary — visible when active */}
          {isSmartMode && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">
                Règles actives
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs font-medium">{deptCount} département{deptCount !== 1 ? "s" : ""}</p>
                    {deptCount > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {settings.smartPricingDepartments.slice(0, 3).map((d) => `${d.code} (${d.percent > 0 ? "+" : ""}${d.percent}%)`).join(", ")}
                        {deptCount > 3 ? ` +${deptCount - 3}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm">
                  <Package className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-xs font-medium">{volCount} tranche{volCount !== 1 ? "s" : ""} volume</p>
                    {volCount > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {settings.smartPricingVolume[0].minM3}–{settings.smartPricingVolume[volCount - 1].maxM3} m³
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-medium">{seasonCount} période{seasonCount !== 1 ? "s" : ""}</p>
                    {seasonCount > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {settings.smartPricingSeasons.map((s) => `${s.percent > 0 ? "+" : ""}${s.percent}%`).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-xs font-medium">{discountCount} palier{discountCount !== 1 ? "s" : ""} remise</p>
                    {discountCount > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        Jusqu&apos;à -{settings.volumeDiscountTiers.reduce((max, t) => Math.max(max, t.discountPercent), 0)}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {promoActiveCount > 0 && (
                <p className="mt-2 text-xs text-green-700">
                  + {promoActiveCount} code{promoActiveCount !== 1 ? "s" : ""} promo actif{promoActiveCount !== 1 ? "s" : ""}
                </p>
              )}
              <p className="mt-3 text-[10px] text-green-600">
                Calcul : prix de base × département × volume m³ × saison − palier remise − code promo
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Base prices (always shown) */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Tag className="h-4 w-4 text-[var(--brand-green)]" />
            {isSmartMode ? "Prix de base" : "Tarification fixe"}
          </h3>
          {isSmartMode && (
            <p className="mt-1 text-xs text-muted-foreground">
              Les règles intelligentes s&apos;appliquent en majoration/réduction sur ces prix de base
            </p>
          )}
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">National (EUR)</label>
              <input
                type="number"
                step="0.50"
                value={settings.priceNational}
                onChange={(e) => onUpdate("priceNational", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Entreprise (EUR)</label>
              <input
                type="number"
                step="0.50"
                value={settings.priceEntreprise}
                onChange={(e) => onUpdate("priceEntreprise", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">International (EUR)</label>
              <input
                type="number"
                step="0.50"
                value={settings.priceInternational}
                onChange={(e) => onUpdate("priceInternational", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Max distributions par lead</label>
            <input
              type="number"
              value={settings.maxDistributions}
              onChange={(e) => onUpdate("maxDistributions", e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-muted-foreground">Nombre max de déménageurs pouvant acheter un même lead.</p>
          </div>
        </div>
      </div>

      {/* Price simulator */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
        <div className="border-b border-blue-200 px-5 py-4">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Calculator className="h-4 w-4 text-blue-500" /> Simulateur de prix en temps réel
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Testez le prix calculé selon vos règles actuelles. Le prix s&apos;applique aux <strong>nouveaux leads</strong>.
          </p>
        </div>
        <div className="p-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Catégorie</label>
              <select value={simCategory} onChange={(e) => setSimCategory(e.target.value)} className={inputCls}>
                <option value="national">National</option>
                <option value="entreprise">Entreprise</option>
                <option value="international">International</option>
              </select>
            </div>
            {isSmartMode && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium">Département</label>
                  <select value={simDept} onChange={(e) => setSimDept(e.target.value)} className={inputCls}>
                    <option value="">Aucun</option>
                    {DEPARTMENTS.map((d) => {
                      const code = d.split(" - ")[0];
                      return <option key={code} value={code}>{d}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium">Volume (m³)</label>
                  <input type="number" value={simVolume} onChange={(e) => setSimVolume(e.target.value)} placeholder="30" className={inputCls} />
                </div>
              </>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium">Code promo</label>
              <input value={simPromo} onChange={(e) => setSimPromo(e.target.value)} placeholder="BIENVENUE20" className={inputCls} />
            </div>
          </div>

          {/* Price breakdown */}
          <div className="mt-4 rounded-lg border bg-white p-4">
            <div className="space-y-2">
              {simulatedPrice.steps.map((step, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className={i === 0 ? "font-medium" : "text-muted-foreground"}>{step.label}</span>
                  <div className="flex items-center gap-3">
                    {step.delta && (
                      <span className={`text-xs font-medium ${step.delta.startsWith("+") ? "text-red-500" : "text-green-600"}`}>
                        {step.delta}
                      </span>
                    )}
                    <span className="font-mono text-sm">{step.value}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t pt-3 flex items-center justify-between">
              <span className="text-base font-bold">Prix final du lead</span>
              <span className="text-2xl font-bold text-[var(--brand-green)]">{simulatedPrice.finalPrice.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart pricing rules */}
      {isSmartMode && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <TrendingDown className="h-4 w-4 text-[var(--brand-green)]" /> Règles de tarification intelligente
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Ordre d&apos;application : prix de base → département → volume m³ → saison → palier remise
            </p>
          </div>
          <div className="p-5">
            <Accordion type="multiple" className="w-full">
              {/* Department rules */}
              <AccordionItem value="departments">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    Par département ({settings.smartPricingDepartments.length} règle{settings.smartPricingDepartments.length !== 1 ? "s" : ""})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {settings.smartPricingDepartments.map((rule, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={rule.code}
                          onChange={(e) => updateDeptRule(i, "code", e.target.value)}
                          className={`${smallInputCls} flex-1`}
                        >
                          {DEPARTMENTS.map((d) => {
                            const code = d.split(" - ")[0];
                            return (
                              <option key={code} value={code}>
                                {d}
                              </option>
                            );
                          })}
                        </select>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={rule.percent}
                            onChange={(e) => updateDeptRule(i, "percent", parseFloat(e.target.value) || 0)}
                            className={`${smallInputCls} w-20 text-right`}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <button type="button" onClick={() => removeDeptRule(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addDepartmentRule} className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand-green)] hover:underline">
                      <Plus className="h-3.5 w-3.5" /> Ajouter un département
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Volume rules */}
              <AccordionItem value="volume">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-500" />
                    Par volume m³ ({settings.smartPricingVolume.length} règle{settings.smartPricingVolume.length !== 1 ? "s" : ""})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {settings.smartPricingVolume.map((rule, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="number"
                          value={rule.minM3}
                          onChange={(e) => updateVolumeRule(i, "minM3", parseFloat(e.target.value) || 0)}
                          placeholder="Min"
                          className={`${smallInputCls} w-20`}
                        />
                        <span className="text-xs text-muted-foreground">à</span>
                        <input
                          type="number"
                          value={rule.maxM3}
                          onChange={(e) => updateVolumeRule(i, "maxM3", parseFloat(e.target.value) || 0)}
                          placeholder="Max"
                          className={`${smallInputCls} w-20`}
                        />
                        <span className="text-xs text-muted-foreground">m³ →</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={rule.percent}
                            onChange={(e) => updateVolumeRule(i, "percent", parseFloat(e.target.value) || 0)}
                            className={`${smallInputCls} w-20 text-right`}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <button type="button" onClick={() => removeVolumeRule(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addVolumeRule} className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand-green)] hover:underline">
                      <Plus className="h-3.5 w-3.5" /> Ajouter une tranche
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Season rules */}
              <AccordionItem value="seasons">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    Saisonnière ({settings.smartPricingSeasons.length} période{settings.smartPricingSeasons.length !== 1 ? "s" : ""})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {settings.smartPricingSeasons.map((rule, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="date"
                          value={rule.startDate}
                          onChange={(e) => updateSeasonRule(i, "startDate", e.target.value)}
                          className={`${smallInputCls} flex-1`}
                        />
                        <span className="text-xs text-muted-foreground">→</span>
                        <input
                          type="date"
                          value={rule.endDate}
                          onChange={(e) => updateSeasonRule(i, "endDate", e.target.value)}
                          className={`${smallInputCls} flex-1`}
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={rule.percent}
                            onChange={(e) => updateSeasonRule(i, "percent", parseFloat(e.target.value) || 0)}
                            className={`${smallInputCls} w-20 text-right`}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <button type="button" onClick={() => removeSeasonRule(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addSeasonRule} className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand-green)] hover:underline">
                      <Plus className="h-3.5 w-3.5" /> Ajouter une période
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Discount tiers */}
              <AccordionItem value="discounts">
                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    Paliers remise volume ({settings.volumeDiscountTiers.length} palier{settings.volumeDiscountTiers.length !== 1 ? "s" : ""})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Remise appliquée selon le nombre de leads achetés ce mois</p>
                    {settings.volumeDiscountTiers.map((tier, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="number"
                          value={tier.minLeads}
                          onChange={(e) => updateDiscountTier(i, "minLeads", parseInt(e.target.value) || 0)}
                          placeholder="Min"
                          className={`${smallInputCls} w-20`}
                        />
                        <span className="text-xs text-muted-foreground">à</span>
                        <input
                          type="number"
                          value={tier.maxLeads}
                          onChange={(e) => updateDiscountTier(i, "maxLeads", parseInt(e.target.value) || 0)}
                          placeholder="Max"
                          className={`${smallInputCls} w-20`}
                        />
                        <span className="text-xs text-muted-foreground">leads →</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tier.discountPercent}
                            onChange={(e) => updateDiscountTier(i, "discountPercent", parseFloat(e.target.value) || 0)}
                            className={`${smallInputCls} w-20 text-right`}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <button type="button" onClick={() => removeDiscountTier(i)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addDiscountTier} className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand-green)] hover:underline">
                      <Plus className="h-3.5 w-3.5" /> Ajouter un palier
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      )}

      {/* Promo codes */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <Ticket className="h-4 w-4 text-[var(--brand-green)]" /> Codes promo
            </h3>
            <button
              type="button"
              onClick={openNewPromo}
              className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>
        </div>
        <div className="p-5">
          {settings.promoCodes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun code promo configuré
            </p>
          ) : (
            <div className="space-y-2">
              {settings.promoCodes.map((promo) => (
                <div
                  key={promo.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    promo.active ? "bg-white" : "bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-sm font-bold">
                      {promo.code}
                    </code>
                    <span className="text-sm">
                      {promo.type === "percent" ? `${promo.value}%` : `${promo.value.toFixed(2)} EUR`}
                    </span>
                    {promo.expiresAt && (
                      <span className="text-xs text-muted-foreground">
                        Expire le {new Date(promo.expiresAt).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    {promo.maxUses > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {promo.usedCount}/{promo.maxUses} utilisations
                      </span>
                    )}
                    {promo.companyId && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                        Entreprise spécifique
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={promo.active}
                      onCheckedChange={() => togglePromo(promo.id)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPromo(promo);
                        setPromoDialogOpen(true);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => removePromo(promo.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Promo dialog */}
      <PromoDialog
        open={promoDialogOpen}
        onClose={() => { setPromoDialogOpen(false); setEditingPromo(null); }}
        promo={editingPromo}
        onSave={savePromo}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Promo Code Dialog                                                   */
/* ------------------------------------------------------------------ */
function PromoDialog({
  open,
  onClose,
  promo,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  promo: PromoCode | null;
  onSave: (p: PromoCode) => void;
}) {
  const [form, setForm] = useState<PromoCode | null>(null);

  // Sync when promo changes
  if (promo && (!form || form.id !== promo.id)) {
    setForm(promo);
  }

  if (!form) return null;

  function update<K extends keyof PromoCode>(field: K, value: PromoCode[K]) {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.code ? "Modifier le code promo" : "Nouveau code promo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Code</label>
            <input
              value={form.code}
              onChange={(e) => update("code", e.target.value.toUpperCase())}
              placeholder="BIENVENUE20"
              className={inputCls}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Type</label>
              <select
                value={form.type}
                onChange={(e) => update("type", e.target.value as "percent" | "fixed")}
                className={inputCls}
              >
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (EUR)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Valeur {form.type === "percent" ? "(%)" : "(EUR)"}
              </label>
              <input
                type="number"
                step={form.type === "percent" ? "1" : "0.50"}
                value={form.value}
                onChange={(e) => update("value", parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Date d&apos;expiration</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => update("expiresAt", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Utilisations max <span className="text-xs text-muted-foreground">(0 = illimité)</span>
              </label>
              <input
                type="number"
                value={form.maxUses}
                onChange={(e) => update("maxUses", parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Entreprise spécifique <span className="text-xs text-muted-foreground">(laisser vide = toutes)</span>
            </label>
            <input
              value={form.companyId}
              onChange={(e) => update("companyId", e.target.value)}
              placeholder="ID entreprise (optionnel)"
              className={inputCls}
            />
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <X className="h-4 w-4" /> Annuler
          </button>
          <button
            type="button"
            onClick={() => { if (form.code) onSave(form); }}
            disabled={!form.code}
            className="flex items-center gap-1.5 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-bold text-white shadow-md shadow-green-500/20 hover:brightness-110 disabled:opacity-50"
          >
            Enregistrer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
