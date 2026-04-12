"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "./auth";

export type Profile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  budgetMin: number;
  budgetMax: number;
  location: string;
  smoking?: string;
  drinking?: string;
  cleanliness?: string;
  sleepSchedule?: string;
  workSchedule?: string;
  pets?: string;
  foodPreference?: string;
};

export function useProfile() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile = null, isLoading: loading } = useQuery<Profile | null>({
    queryKey: ["profile"],
    queryFn: async () => {
      try {
        return await api.getProfile();
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
  });

  const setProfile = (p: Profile | null) => {
    queryClient.setQueryData(["profile"], p);
  };

  const clearProfile = () => {
    queryClient.removeQueries({ queryKey: ["profile"] });
  };

  return {
    profile,
    loading,
    hasProfile: !!profile,
    setProfile,
    clearProfile,
  };
}
