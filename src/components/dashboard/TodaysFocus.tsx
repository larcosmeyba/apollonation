import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, Droplets, Footprints, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const TodaysFocus = () => {
  const { user } = useAuth();

  // Fetch active training plan
  const { data: activePlan } = useQuery({
    queryKey: ["today-focus-plan", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("client_training_plans")
        .select("title, cycle_number, duration_weeks")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch nutrition targets
  const { data: nutritionPlan } = useQuery({
    queryKey: ["today-focus-nutrition", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("nutrition_plans")
        .select("protein_grams, daily_calories")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch today's step count
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { data: stepLog } = useQuery({
    queryKey: ["today-focus-steps", user?.id, todayStr],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("step_logs")
        .select("steps")
        .eq("user_id", user.id)
        .eq("log_date", todayStr)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch questionnaire for weekly objective
  const { data: questionnaire } = useQuery({
    queryKey: ["today-focus-quest", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("client_questionnaires")
        .select("goal_next_4_weeks")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const proteinTarget = nutritionPlan?.protein_grams || 180;
  const stepsTarget = 8000;
  const currentSteps = stepLog?.steps || 0;

  return (
    <div className="card-apollo p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-primary" />
        <h2 className="font-heading text-sm uppercase tracking-wider">Today's Focus</h2>
      </div>

      {/* Current Phase */}
      {activePlan && (
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-[10px] text-primary uppercase tracking-[0.2em] mb-1">Current Phase</p>
          <p className="font-heading text-base">{activePlan.title}</p>
          <p className="text-[10px] text-muted-foreground">Cycle {activePlan.cycle_number} · {activePlan.duration_weeks} weeks</p>
        </div>
      )}

      {/* Daily Targets */}
      <div className="space-y-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Daily Targets</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/30 p-3 text-center">
            <Target className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="font-heading text-sm">{proteinTarget}g</p>
            <p className="text-[9px] text-muted-foreground">Protein</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 text-center">
            <Droplets className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <p className="font-heading text-sm">3L</p>
            <p className="text-[9px] text-muted-foreground">Water</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 text-center">
            <Footprints className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <p className="font-heading text-sm">{currentSteps.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">/ {stepsTarget.toLocaleString()} steps</p>
          </div>
        </div>
      </div>

      {/* Weekly Objective */}
      {questionnaire?.goal_next_4_weeks && (
        <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <p className="text-[10px] text-primary uppercase tracking-wider">Weekly Objective</p>
          </div>
          <p className="text-xs text-foreground">{questionnaire.goal_next_4_weeks}</p>
        </div>
      )}
    </div>
  );
};

export default TodaysFocus;
