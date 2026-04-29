// Centralized access control for free vs premium vs elite tiers.
//
// Tier semantics:
//   - apollo_premium / apollo_elite / is_subscribed=true => full premium (Reborn) access
//   - apollo_elite                                       => additional elite features (coach messaging)
//   - free                                                => 10 workouts, 2 programs, 10 recipes
//
// Free tier does NOT include meal plan, grocery list, macro tracker, or AI generator.
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { withTimeout } from "@/lib/timeout";

const FREE_WORKOUT_LIMIT = 10;
const FREE_RECIPE_LIMIT = 10;
const FREE_PROGRAM_LIMIT = 2;

interface FreeUsageRow {
  user_id: string;
  free_workouts_used_count: number;
  free_recipes_viewed_count: number;
  free_programs_used_count: number;
  viewed_recipe_ids: string[] | null;
  // legacy
  free_recipe_used?: boolean;
  last_updated_at: string;
}

export interface AccessControl {
  hasPremiumAccess: boolean;
  hasEliteAccess: boolean;
  freeWorkoutsUsed: number;
  freeWorkoutsRemaining: number;
  freeRecipesViewed: number;
  freeRecipesRemaining: number;
  freeProgramsUsed: number;
  freeProgramsRemaining: number;
  viewedRecipeIds: string[];
  canAccessWorkout: () => boolean;
  canAccessRecipe: (recipeId?: string) => boolean;
  canAccessProgram: () => boolean;
  canAccessMealPlan: boolean;
  canAccessGroceryList: boolean;
  canAccessMacroTracker: boolean;
  canAccessAIGenerator: boolean;
  canAccessCoachMessaging: boolean;
  recordWorkoutUsage: () => Promise<void>;
  recordRecipeUsage: (recipeId?: string) => Promise<void>;
  recordProgramUsage: () => Promise<void>;
  loading: boolean;
  // Back-compat aliases (do not use in new code)
  canAccessPrograms: boolean;
  freeRecipeUsed: boolean;
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
      const { data, error } = await withTimeout<any>(
        supabase
          .from("free_usage" as any)
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        8_000,
        "Free usage load timed out"
      );
      if (error) {
        console.error("[useAccessControl] fetch failed", error.message);
        return null;
      }
      if (data) return data as unknown as FreeUsageRow;
      const { data: inserted, error: insertErr } = await withTimeout<any>(
        (supabase as any)
          .from("free_usage")
          .upsert(
            { user_id: userId },
            { onConflict: "user_id" }
          )
          .select()
          .maybeSingle(),
        8_000,
        "Free usage setup timed out"
      );
      if (insertErr) {
        console.error("[useAccessControl] upsert failed", insertErr.message);
        return null;
      }
      return (inserted as unknown as FreeUsageRow) ?? null;
    },
  });

  const freeWorkoutsUsed = freeUsage?.free_workouts_used_count ?? 0;
  const freeWorkoutsRemaining = Math.max(0, FREE_WORKOUT_LIMIT - freeWorkoutsUsed);
  const freeRecipesViewed = freeUsage?.free_recipes_viewed_count ?? 0;
  const freeRecipesRemaining = Math.max(0, FREE_RECIPE_LIMIT - freeRecipesViewed);
  const freeProgramsUsed = freeUsage?.free_programs_used_count ?? 0;
  const freeProgramsRemaining = Math.max(0, FREE_PROGRAM_LIMIT - freeProgramsUsed);
  const viewedRecipeIds = (freeUsage?.viewed_recipe_ids ?? []) as string[];

  const canAccessWorkout = useCallback(
    () => hasPremiumAccess || freeWorkoutsUsed < FREE_WORKOUT_LIMIT,
    [hasPremiumAccess, freeWorkoutsUsed]
  );

  const canAccessRecipe = useCallback(
    (recipeId?: string) => {
      if (hasPremiumAccess) return true;
      // Already-viewed recipes don't count against quota — let user re-open
      if (recipeId && viewedRecipeIds.includes(recipeId)) return true;
      return freeRecipesViewed < FREE_RECIPE_LIMIT;
    },
    [hasPremiumAccess, freeRecipesViewed, viewedRecipeIds]
  );

  const canAccessProgram = useCallback(
    () => hasPremiumAccess || freeProgramsUsed < FREE_PROGRAM_LIMIT,
    [hasPremiumAccess, freeProgramsUsed]
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
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (error) {
      console.error("[useAccessControl] recordWorkoutUsage failed", error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["free_usage", userId] });
  }, [hasPremiumAccess, userId, freeWorkoutsUsed, queryClient]);

  const recordRecipeUsage = useCallback(
    async (recipeId?: string) => {
      if (hasPremiumAccess || !userId) return;
      // De-dup on recipe id so re-opens don't double-count
      if (recipeId && viewedRecipeIds.includes(recipeId)) return;
      const nextIds = recipeId
        ? Array.from(new Set([...viewedRecipeIds, recipeId]))
        : viewedRecipeIds;
      const nextCount = recipeId ? nextIds.length : freeRecipesViewed + 1;
      const { error } = await (supabase as any)
        .from("free_usage")
        .upsert(
          {
            user_id: userId,
            free_recipes_viewed_count: nextCount,
            viewed_recipe_ids: nextIds,
            last_updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (error) {
        console.error("[useAccessControl] recordRecipeUsage failed", error.message);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["free_usage", userId] });
    },
    [hasPremiumAccess, userId, freeRecipesViewed, viewedRecipeIds, queryClient]
  );

  const recordProgramUsage = useCallback(async () => {
    if (hasPremiumAccess || !userId) return;
    const nextCount = freeProgramsUsed + 1;
    const { error } = await (supabase as any)
      .from("free_usage")
      .upsert(
        {
          user_id: userId,
          free_programs_used_count: nextCount,
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (error) {
      console.error("[useAccessControl] recordProgramUsage failed", error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["free_usage", userId] });
  }, [hasPremiumAccess, userId, freeProgramsUsed, queryClient]);

  return {
    hasPremiumAccess,
    hasEliteAccess,
    freeWorkoutsUsed,
    freeWorkoutsRemaining,
    freeRecipesViewed,
    freeRecipesRemaining,
    freeProgramsUsed,
    freeProgramsRemaining,
    viewedRecipeIds,
    canAccessWorkout,
    canAccessRecipe,
    canAccessProgram,
    canAccessMealPlan: hasPremiumAccess,
    canAccessGroceryList: hasPremiumAccess,
    canAccessMacroTracker: hasPremiumAccess,
    canAccessAIGenerator: hasPremiumAccess,
    canAccessCoachMessaging: hasEliteAccess,
    recordWorkoutUsage,
    recordRecipeUsage,
    recordProgramUsage,
    loading: !!userId && isLoading,
    // Back-compat aliases
    canAccessPrograms: hasPremiumAccess || freeProgramsUsed < FREE_PROGRAM_LIMIT,
    freeRecipeUsed: freeRecipesViewed > 0,
  };
}
