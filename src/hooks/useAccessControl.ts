// Centralized access control for free vs premium vs elite tiers.
// Reads entitlement from profile and per-user free_usage row.
//
// Tier semantics:
//   - apollo_premium / apollo_elite / is_subscribed=true => full premium access
//   - apollo_elite                                       => additional elite features (coach messaging)
//   - free                                                => up to 5 workouts and 1 recipe
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const FREE_WORKOUT_LIMIT = 5;

interface FreeUsageRow {
  user_id: string;
  free_workouts_used_count: number;
  free_recipe_used: boolean;
  last_updated_at: string;
}

export interface AccessControl {
  hasPremiumAccess: boolean;
  hasEliteAccess: boolean;
  freeWorkoutsUsed: number;
  freeWorkoutsRemaining: number;
  freeRecipeUsed: boolean;
  canAccessWorkout: () => boolean;
  canAccessRecipe: () => boolean;
  canAccessPrograms: boolean;
  canAccessAIGenerator: boolean;
  canAccessCoachMessaging: boolean;
  recordWorkoutUsage: () => Promise<void>;
  recordRecipeUsage: () => Promise<void>;
  loading: boolean;
}

export function useAccessControl(): AccessControl {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const entitlement = (profile as any)?.entitlement as
    | "apollo_premium"
    | "apollo_elite"
    | null
    | undefined;
  const isSubscribed = profile?.is_subscribed === true;
  const hasPremiumAccess =
    entitlement === "apollo_premium" || entitlement === "apollo_elite" || isSubscribed;
  const hasEliteAccess = entitlement === "apollo_elite";

  const { data: freeUsage, isLoading } = useQuery({
    queryKey: ["free_usage", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<FreeUsageRow | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("free_usage" as any)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("[useAccessControl] fetch failed", error.message);
        return null;
      }
      if (data) return data as unknown as FreeUsageRow;
      // Upsert default row if missing
      const { data: inserted, error: insertErr } = await (supabase as any)
        .from("free_usage")
        .upsert(
          { user_id: userId, free_workouts_used_count: 0, free_recipe_used: false },
          { onConflict: "user_id" }
        )
        .select()
        .maybeSingle();
      if (insertErr) {
        console.error("[useAccessControl] upsert failed", insertErr.message);
        return null;
      }
      return (inserted as unknown as FreeUsageRow) ?? null;
    },
  });

  const freeWorkoutsUsed = freeUsage?.free_workouts_used_count ?? 0;
  const freeWorkoutsRemaining = Math.max(0, FREE_WORKOUT_LIMIT - freeWorkoutsUsed);
  const freeRecipeUsed = freeUsage?.free_recipe_used ?? false;

  const canAccessWorkout = useCallback(
    () => hasPremiumAccess || freeWorkoutsUsed < FREE_WORKOUT_LIMIT,
    [hasPremiumAccess, freeWorkoutsUsed]
  );

  const canAccessRecipe = useCallback(
    () => hasPremiumAccess || !freeRecipeUsed,
    [hasPremiumAccess, freeRecipeUsed]
  );

  const recordWorkoutUsage = useCallback(async () => {
    if (hasPremiumAccess || !userId) return;
    const nextCount = freeWorkoutsUsed + 1;
    const { error } = await (supabase as any)
      .from("free_usage")
      .upsert(
        {
          user_id: userId,
          free_workouts_used_count: nextCount,
          free_recipe_used: freeRecipeUsed,
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (error) {
      console.error("[useAccessControl] recordWorkoutUsage failed", error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["free_usage", userId] });
  }, [hasPremiumAccess, userId, freeWorkoutsUsed, freeRecipeUsed, queryClient]);

  const recordRecipeUsage = useCallback(async () => {
    if (hasPremiumAccess || !userId) return;
    const { error } = await (supabase as any)
      .from("free_usage")
      .upsert(
        {
          user_id: userId,
          free_workouts_used_count: freeWorkoutsUsed,
          free_recipe_used: true,
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (error) {
      console.error("[useAccessControl] recordRecipeUsage failed", error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["free_usage", userId] });
  }, [hasPremiumAccess, userId, freeWorkoutsUsed, queryClient]);

  return {
    hasPremiumAccess,
    hasEliteAccess,
    freeWorkoutsUsed,
    freeWorkoutsRemaining,
    freeRecipeUsed,
    canAccessWorkout,
    canAccessRecipe,
    canAccessPrograms: hasPremiumAccess,
    canAccessAIGenerator: hasPremiumAccess,
    canAccessCoachMessaging: hasEliteAccess,
    recordWorkoutUsage,
    recordRecipeUsage,
    loading: !!userId && isLoading,
  };
}
