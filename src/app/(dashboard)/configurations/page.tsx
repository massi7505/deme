"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Settings2, Info, Pencil } from "lucide-react";
import { CoverageMap } from "@/components/dashboard/CoverageMap";
import { RegionEditModal } from "@/components/dashboard/RegionEditModal";
import { DEPARTMENTS } from "@/lib/utils";
import { motion } from "framer-motion";

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

const CATEGORY_COLORS: Record<string, string> = {
  national: "bg-green-100 text-green-800 border-green-200",
  entreprise: "bg-blue-100 text-blue-800 border-blue-200",
  international: "bg-purple-100 text-purple-800 border-purple-200",
};

export default function ConfigurationsPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [radiusRules, setRadiusRules] = useState<RadiusRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyCity, setCompanyCity] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchRegions = useCallback(() => {
    fetch("/api/dashboard/regions")
      .then((r) => r.ok ? r.json() : { regions: [], radiusRules: [] })
      .then((data) => {
        // Support both old format (array) and new format (object with regions + radiusRules)
        if (Array.isArray(data)) {
          setRegions(data);
        } else {
          setRegions(data.regions || []);
          setRadiusRules(data.radiusRules || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/dashboard/overview")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.company) {
          setCompanyCity(data.company.city);
        }
      });

    fetchRegions();
  }, [fetchRegions]);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold tracking-tight">Régions ciblées et catégories</h2>
        <p className="text-sm text-muted-foreground">
          Configurez vos zones d&apos;intervention et les types de déménagements que vous acceptez.
        </p>
      </motion.div>

      {/* Regions table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-[var(--brand-green)]" /> Régions configurées
          </CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditModalOpen(true)}><Pencil className="h-3.5 w-3.5" /> Modifier</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : regions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucune région configurée</p>
          ) : (
            <div className="rounded-lg border">
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
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-[var(--brand-green)]" /> Zone de couverture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CoverageMap markers={companyCity ? [{ lat: 48.8566, lng: 2.3522, label: companyCity, radiusKm: 30 }] : []} />
        </CardContent>
      </Card>

      {/* Trial info */}
      <Card className="border-amber-100 bg-amber-50/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">Limitations de la période d&apos;essai</p>
            <ul className="mt-2 space-y-1 text-xs text-amber-800">
              <li>Maximum <strong>2 départements</strong> sélectionnables</li>
              <li>Rayon maximum de <strong>30 km</strong></li>
              <li>Passez à un abonnement pour débloquer toutes les zones</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Region edit modal */}
      <RegionEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        regions={regions}
        radiusRules={radiusRules}
        onSaved={fetchRegions}
      />
    </div>
  );
}
