"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SiteSettingsContext, useFetchSiteSettings } from "@/hooks/use-site-settings";

function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const settings = useFetchSiteSettings();
  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SiteSettingsProvider>{children}</SiteSettingsProvider>
    </QueryClientProvider>
  );
}
