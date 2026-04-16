"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  place_name: string;
  address: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (data: {
    address: string;
    city: string;
    postalCode: string;
    lat: number;
    lng: number;
  }) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  /** Search for full addresses (true) or cities only (false, default) */
  searchAddresses?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "ex: 12 Rue de la Paix, Paris",
  id,
  className,
  searchAddresses = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;

      try {
        const types = searchAddresses
          ? "address,place,locality,poi"
          : "place,locality";

        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=fr&types=${types}&language=fr&limit=5`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        const results: Suggestion[] = (data.features || []).map(
          (feature: {
            id: string;
            place_name: string;
            text: string;
            center: [number, number];
            context?: Array<{ id: string; text: string }>;
            properties?: { address?: string };
          }) => {
            const postcode = feature.context?.find((c) =>
              c.id.startsWith("postcode")
            );
            const place = feature.context?.find((c) =>
              c.id.startsWith("place")
            );

            // Build street address: "195 Rue de Paris" from place_name "195 Rue de Paris, 91120 Palaiseau, France"
            const parts = feature.place_name.split(",");
            const streetAddress = parts[0]?.trim() || feature.text;

            return {
              id: feature.id,
              place_name: feature.place_name,
              address: streetAddress,
              city: place?.text || feature.text,
              postalCode: postcode?.text || "",
              lat: feature.center[1],
              lng: feature.center[0],
            };
          }
        );

        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHighlightedIndex(-1);
      } catch {
        // Silently fail
      }
    },
    [searchAddresses]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSelect = (suggestion: Suggestion) => {
    onSelect({
      address: suggestion.address,
      city: suggestion.city,
      postalCode: suggestion.postalCode,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-green-50",
                highlightedIndex === index && "bg-green-50"
              )}
              onMouseDown={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <span className="font-medium">
                  {searchAddresses ? suggestion.place_name : suggestion.city}
                </span>
                {!searchAddresses && suggestion.postalCode && (
                  <span className="ml-1.5 text-muted-foreground">
                    ({suggestion.postalCode})
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
