"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const DEFAULT_CENTER: [number, number] = [2.3522, 46.6034];
const DEFAULT_ZOOM = 5;

const CATEGORY_FILL: Record<string, { fill: string; line: string }> = {
  national: { fill: "#22c55e", line: "#16a34a" },
  entreprise: { fill: "#3b82f6", line: "#2563eb" },
  international: { fill: "#a855f7", line: "#9333ea" },
};

interface Marker {
  lat: number;
  lng: number;
  label?: string;
  radiusKm?: number;
  categories?: string[];
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

export function CoverageMap({
  markers = [],
  className = "",
}: {
  markers?: Marker[];
  className?: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      setError("Token Mapbox non configuré");
      return;
    }

    if (!mapContainer.current || mapRef.current) return;

    let map: mapboxgl.Map;

    async function initMap() {
      const mapboxgl = (await import("mapbox-gl")).default;
      // @ts-expect-error — CSS import for mapbox styles
      await import("mapbox-gl/dist/mapbox-gl.css").catch(() => {});

      const center: [number, number] =
        markers.length > 0 ? [markers[0].lng, markers[0].lat] : DEFAULT_CENTER;
      const zoom = markers.length > 0 ? 8 : DEFAULT_ZOOM;

      map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center,
        zoom,
        accessToken: MAPBOX_TOKEN!,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", () => {
        setLoaded(true);
        mapRef.current = map;

        const bounds = new mapboxgl.LngLatBounds();

        markers.forEach((m, idx) => {
          const primaryCat = m.categories?.[0] ?? "national";
          const colors = CATEGORY_FILL[primaryCat] ?? CATEGORY_FILL.national;

          const safeLabel = escapeHtml(m.label ?? "Zone");
          const safeRadius = m.radiusKm ? escapeHtml(String(m.radiusKm)) : "";
          const safeCategories = m.categories?.length
            ? escapeHtml(m.categories.join(", "))
            : "";
          const popupHtml = `
            <div style="font-family:system-ui;font-size:12px;line-height:1.4;max-width:240px">
              <strong>${safeLabel}</strong>
              ${safeRadius ? `<br/>Rayon ${safeRadius} km` : ""}
              ${safeCategories ? `<br/>Catégories : ${safeCategories}` : ""}
            </div>
          `;

          new mapboxgl.Marker({ color: colors.line })
            .setLngLat([m.lng, m.lat])
            .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(popupHtml))
            .addTo(map);

          bounds.extend([m.lng, m.lat]);

          if (m.radiusKm) {
            const points = 64;
            const km = m.radiusKm;
            const coords: [number, number][] = [];
            for (let i = 0; i < points; i++) {
              const angle = (i / points) * 2 * Math.PI;
              const dx = km / (111.32 * Math.cos((m.lat * Math.PI) / 180));
              const dy = km / 110.574;
              coords.push([
                m.lng + dx * Math.cos(angle),
                m.lat + dy * Math.sin(angle),
              ]);
              bounds.extend([
                m.lng + dx * Math.cos(angle),
                m.lat + dy * Math.sin(angle),
              ]);
            }
            coords.push(coords[0]);

            const sourceId = `radius-${idx}-${m.lat}-${m.lng}`;
            map.addSource(sourceId, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "Polygon", coordinates: [coords] },
              },
            });

            map.addLayer({
              id: `${sourceId}-fill`,
              type: "fill",
              source: sourceId,
              paint: { "fill-color": colors.fill, "fill-opacity": 0.12 },
            });

            map.addLayer({
              id: `${sourceId}-border`,
              type: "line",
              source: sourceId,
              paint: { "line-color": colors.line, "line-width": 2 },
            });
          }
        });

        if (markers.length > 1) {
          map.fitBounds(bounds, { padding: 40, maxZoom: 11 });
        } else if (markers.length === 1 && markers[0].radiusKm) {
          map.fitBounds(bounds, { padding: 40, maxZoom: 11 });
        }
      });
    }

    initMap().catch((err) => {
      console.error("Map init error:", err);
      setError("Erreur de chargement de la carte");
    });

    return () => {
      map?.remove();
      mapRef.current = null;
    };
  }, [markers]);

  if (!MAPBOX_TOKEN || error) {
    return (
      <div
        className={`flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-muted/30 ${className}`}
      >
        <div className="text-center">
          <MapPin className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            {error || "Ajoutez NEXT_PUBLIC_MAPBOX_TOKEN dans .env.local"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      )}
      <div ref={mapContainer} className="h-64 w-full" />
    </div>
  );
}
