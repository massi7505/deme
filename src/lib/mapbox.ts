const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface GeocodingResult {
  placeName: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
  department: string;
}

export async function geocodeAddress(
  query: string
): Promise<GeocodingResult[]> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN ?? "");
  url.searchParams.set("country", "FR");
  url.searchParams.set("types", "address,place,postcode");
  url.searchParams.set("language", "fr");
  url.searchParams.set("limit", "5");

  const response = await fetch(url.toString());
  if (!response.ok) return [];

  const data = await response.json();

  return (data.features ?? []).map((feature: Record<string, unknown>) => {
    const context = (feature.context as Array<Record<string, unknown>>) ?? [];
    const postcode = context.find((c: Record<string, unknown>) =>
      (c.id as string)?.startsWith("postcode")
    );
    const place = context.find((c: Record<string, unknown>) => (c.id as string)?.startsWith("place"));
    const department = context.find((c: Record<string, unknown>) =>
      (c.id as string)?.startsWith("district")
    );

    return {
      placeName: feature.place_name as string,
      city: (place?.text as string) ?? (feature.text as string) ?? "",
      postalCode: (postcode?.text as string) ?? "",
      lat: (feature.center as number[])[1],
      lng: (feature.center as number[])[0],
      department: (department?.text as string) ?? "",
    };
  });
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export const FRANCE_CENTER = {
  latitude: 46.603354,
  longitude: 1.888334,
  zoom: 5,
} as const;

export const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";
