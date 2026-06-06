// Single source of truth for all user fitness/nutrition/coaching answers.
// Backed by public.user_fitness_profile (auto-created on signup, kept in sync
// with legacy client_questionnaires / client_nutrition_questionnaires via DB trigger).
import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FitnessProfile {
  user_id: string;
  height_inches: number | null;
  weight_lbs: number | null;
  age: number | null;
  sex: "male" | "female" | null;
  goal_weight_lbs: number | null;
  primary_goal: string | null;
  activity_level: string | null;
  training_experience: string | null;
  training_days_per_week: number | null;
  preferred_training_days: string[] | null;
  workout_duration_minutes: number | null;
  equipment_available: string[] | null;
  workout_environment: string | null;
  dietary_preferences: string[] | null;
  allergies: string[] | null;
  disliked_foods: string[] | null;
  meals_per_day: number | null;
  nutrition_goal: string | null;
  calorie_target: number | null;
  protein_target_g: number | null;
  carb_target_g: number | null;
  fat_target_g: number | null;
  weekly_food_budget: number | null;
  grocery_store: string | null;
  injuries: string | null;
  coach_notes: string | null;
  progress_photo_urls: string[] | null;
  onboarding_completed: boolean;
  nutrition_completed: boolean;
  coaching_intake_completed: boolean;
}

export function useFitnessProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["fitness_profile", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<FitnessProfile | null> => {
      if (!userId) return null;
      const { data, error } = await (supabase as any)
        .from("user_fitness_profile")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("[useFitnessProfile] load failed", error.message);
        return null;
      }
      if (data) return data as FitnessProfile;

      // Backstop: create row if signup trigger didn't (e.g. legacy account).
      const { data: created } = await (supabase as any)
        .from("user_fitness_profile")
        .upsert({ user_id: userId }, { onConflict: "user_id" })
        .select("*")
        .maybeSingle();
      return (created as FitnessProfile) ?? null;
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<FitnessProfile>) => {
      if (!userId) throw new Error("not_authenticated");
      const { data, error } = await (supabase as any)
        .from("user_fitness_profile")
        .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw error;
      return data as FitnessProfile;
    },
    onSuccess: (data) => {
      qc.setQueryData(["fitness_profile", userId], data);
      qc.invalidateQueries({ queryKey: ["fitness_profile", userId] });
    },
  });

  const saveAsync = useCallback(
    async (patch: Partial<FitnessProfile>) => save.mutateAsync(patch),
    [save]
  );

  return {
    profile: profile ?? null,
    loading: !!userId && isLoading,
    saving: save.isPending,
    save: saveAsync,
  };
}
