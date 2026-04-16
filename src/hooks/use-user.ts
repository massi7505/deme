"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

const supabase = createClient();

async function fetchUser() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  return { user, profile: profile as Profile };
}

export function useUser() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["user-profile"],
    queryFn: fetchUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  return {
    user: data?.user ?? null,
    profile: data?.profile ?? null,
    isLoading,
    isError,
    error,
  };
}
