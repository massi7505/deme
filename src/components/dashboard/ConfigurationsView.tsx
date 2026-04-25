"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Settings2, Pencil, Target, Trash2 } from "lucide-react";
import { CoverageMap } from "@/components/dashboard/CoverageMap";
import { RegionEditModal } from "@/components/dashboard/RegionEditModal";
import { DEPARTMENTS } from "@/lib/utils";
import toast from "react-hot-toast";
import type { ConfigConflict } from "@/lib/config-conflicts";
import { ConflictBanner } from "@/components/dashboard/ConflictBanner";

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

interface Props {
  regions: Region[];
  radiusRules: RadiusRule[];
  impactCount: number;
  conflicts: ConfigConflict[];
}

const CATEGORY_COLORS: Record<string, string> = {
  national: "bg-green-100 text-green-800 border-green-200",
  entreprise: "bg-blue-100 text-blue-800 border-blue-200",
  international: "bg-purple-100 text-purple-800 border-purple-200",
};

export function ConfigurationsView({ regions, radiusRules, impactCount, conflicts }: Props) {
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);

  async function deleteRadius(id: string, label: string) {
    if (!confirm(`Supprimer la zone autour de ${label} ?`)) return;
    const res = await fetch("/api/dashboard/regions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_radius", id }),
    });
    if (res.ok) {
      toast.success("Zone supprimée");
      router.refresh();
    } else {
      toast.error("Erreur de suppression");
    }
  }

  const mapMarkers = radiusRules.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    label: r.departure_city,
    radiusKm: r.radius_km,
    categories: r.move_types,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Régions ciblées et catégories</h2>
        <p className="text-sm text-muted-foreground">
          Configurez vos zones d&apos;intervention et les types de déménagements que vous acceptez.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{regions.length}</span> département{regions.length !== 1 ? "s" : ""}
          {" + "}
          <span className="font-semibold text-foreground">{radiusRules.length}</span> zone{radiusRules.length !== 1 ? "s" : ""} par rayon
          {" · "}
          <span className="font-semibold text-foreground">~{impactCount}</span> lead{impactCount !== 1 ? "s" : ""} reçu{impactCount !== 1 ? "s" : ""} sur 30 jours
        </p>
      </div>

      <ConflictBanner conflicts={conflicts} />

      {/* Régions par département */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-[var(--brand-green)]" /> Départements ciblés
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditModalOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        </CardHeader>
        <CardContent>
          {regions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <MapPin className="h-6 w-6 text-[var(--brand-green)]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Aucun département ciblé</p>
                <p className="text-sm text-muted-foreground">
                  Ajoutez les départements où vous souhaitez recevoir des leads.
                </p>
              </div>
              <Button size="sm" onClick={() => setEditModalOpen(true)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Configurer mes départements
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden rounded-lg border sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Département</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Catégories</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regions.map((region) => (
                      <TableRow key={region.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50">
                              <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
                            </div>
                            <span className="text-sm font-medium">
                              {DEPARTMENTS[region.department_code] || region.department_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">{region.department_code}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {region.categories.map((cat) => (
                              <Badge key={cat} variant="outline" className={`text-[11px] capitalize ${CATEGORY_COLORS[cat] ?? ""}`}>
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 sm:hidden">
                {regions.map((region) => (
                  <div key={region.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-green-50">
                      <MapPin className="h-4 w-4 text-[var(--brand-green)]" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">
                          {DEPARTMENTS[region.department_code] || region.department_name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{region.department_code}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {region.categories.map((cat) => (
                          <Badge key={cat} variant="outline" className={`text-[10px] capitalize ${CATEGORY_COLORS[cat] ?? ""}`}>
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Zones par rayon */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-[var(--brand-green)]" /> Zones par rayon
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditModalOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
        </CardHeader>
        <CardContent>
          {radiusRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <Target className="h-6 w-6 text-[var(--brand-green)]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Aucune zone par rayon</p>
                <p className="text-sm text-muted-foreground">
                  Définissez un rayon autour d&apos;une ville pour cibler une zone précise.
                </p>
              </div>
              <Button size="sm" onClick={() => setEditModalOpen(true)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Ajouter une zone par rayon
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden rounded-lg border sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ville de départ</TableHead>
                      <TableHead>Rayon</TableHead>
                      <TableHead>Catégories</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {radiusRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50">
                              <Target className="h-4 w-4 text-[var(--brand-green)]" />
                            </div>
                            <span className="text-sm font-medium">{rule.departure_city}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm tabular-nums">{rule.radius_km} km</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {rule.move_types.map((cat) => (
                              <Badge key={cat} variant="outline" className={`text-[11px] capitalize ${CATEGORY_COLORS[cat] ?? ""}`}>
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                            onClick={() => deleteRadius(rule.id, rule.departure_city)}
                            aria-label={`Supprimer la zone ${rule.departure_city}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 sm:hidden">
                {radiusRules.map((rule) => (
                  <div key={rule.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-green-50">
                      <Target className="h-4 w-4 text-[var(--brand-green)]" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{rule.departure_city}</span>
                        <span className="text-sm tabular-nums text-muted-foreground">{rule.radius_km} km</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rule.move_types.map((cat) => (
                          <Badge key={cat} variant="outline" className={`text-[10px] capitalize ${CATEGORY_COLORS[cat] ?? ""}`}>
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 flex-shrink-0 p-0 text-muted-foreground hover:text-red-600"
                      onClick={() => deleteRadius(rule.id, rule.departure_city)}
                      aria-label={`Supprimer la zone ${rule.departure_city}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Coverage map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-[var(--brand-green)]" /> Carte de couverture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CoverageMap markers={mapMarkers} />
        </CardContent>
      </Card>

      {/* Region edit modal (existing component) */}
      <RegionEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        regions={regions}
        radiusRules={radiusRules}
        onSaved={() => {
          setEditModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
