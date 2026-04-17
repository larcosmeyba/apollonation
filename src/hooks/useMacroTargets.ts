import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { calculateMacros, inferGoal, normalizeActivity } from "@/lib/macroEngine";

export interface MacroTargets {
  calorie_target: number;
  protein_grams: number;
  carb_grams: number;
  fat_grams: number;
  bmr: number | null;
  tdee: number | null;
  source: string;
}

const DEFAULTS: MacroTargets = {
  calorie_target: 2500,
  protein_grams: 180,
  carb_grams: 300,
  fat_grams: 70,
  bmr: null,
  tdee: null,
  source: "default",
};

export const useMacroTargets = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: stored } = useQuery({
    queryKey: ["user-macro-targets", user?.id],
    queryFn: async (): Promise<MacroTargets | null> => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("user_macro_targets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: questionnaire } = useQuery({
    queryKey: ["questionnaire-for-macros", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("client_questionnaires")
        .select("sex, age, height_inches, weight_lbs, activity_level, goal_next_4_weeks")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Auto-compute & upsert if missing or questionnaire newer
  useEffect(() => {
    if (!user || !questionnaire) return;
    if (stored && stored.source === "manual") return; // don't overwrite manual

    const sex = (questionnaire.sex?.toLowerCase() === "female" ? "female" : "male") as
      | "male"
      | "female";
    const result = calculateMacros({
      sex,
      age: questionnaire.age,
      height_inches: questionnaire.height_inches,
      weight_lbs: Number(questionnaire.weight_lbs),
      activity_level: normalizeActivity(questionnaire.activity_level),
      goal: inferGoal(questionnaire.goal_next_4_weeks),
    });

    const needsUpdate =
      !stored ||
      stored.calorie_target !== result.calorie_target ||
      stored.protein_grams !== result.protein_grams;

    if (needsUpdate) {
      (supabase as any)
        .from("user_macro_targets")
        .upsert(
          { user_id: user.id, ...result, source: "auto", goal_type: inferGoal(questionnaire.goal_next_4_weeks) },
          { onConflict: "user_id" }
        )
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["user-macro-targets", user.id] });
        });
    }
  }, [user, questionnaire, stored, queryClient]);

  return stored ?? DEFAULTS;
};
