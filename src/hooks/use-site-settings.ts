"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface SiteSettings {
  siteName: string;
  siteUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
}

const DEFAULTS: SiteSettings = {
  siteName: "Demenagement24",
  siteUrl: "https://demenagement24.com",
  contactEmail: "contact@demenagement24.com",
  contactPhone: "01 23 45 67 89",
  contactAddress: "Paris, France",
};

export const SiteSettingsContext = createContext<SiteSettings>(DEFAULTS);

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

export function useFetchSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : DEFAULTS)
      .then(setSettings)
      .catch(() => {});
  }, []);

  return settings;
}
