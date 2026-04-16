"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Company } from "@/types";
import { useUser } from "./use-user";

const supabase = createClient();

async function fetchCompany(profileId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("profile_id", profileId)
    .single();

  if (error) {
    // PGRST116 = no rows found — not an error for this use case
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(error.message);
  }

  return data as Company;
}

export function useCompany() {
  const { profile } = useUser();
  const profileId = profile?.id ?? null;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["company", profileId],
    queryFn: () => fetchCompany(profileId!),
    enabled: !!profileId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  return {
    company: data ?? null,
    isLoading,
    isError,
    error,
  };
}
