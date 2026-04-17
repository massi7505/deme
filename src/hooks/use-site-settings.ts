"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

export interface SiteSettings {
  siteName: string;
  siteUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
}

const DEFAULTS: SiteSettings = {
  siteName: BRAND.siteName,
  siteUrl: BRAND.siteUrl,
  contactEmail: BRAND.contactEmail,
  contactPhone: BRAND.contactPhone,
  contactAddress: "",
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
