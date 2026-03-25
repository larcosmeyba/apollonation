import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Target, Droplets, Footprints, TrendingUp, ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import stockStatue from "@/assets/stock-apollo-statue.png";

const PHASE_INFO: Record<string, { focus: string; goals: string[]; tips: string }> = {
  default: {
    focus: "Build a strong foundation through progressive overload and consistent training.",
    goals: ["Master proper form", "Increase training volume", "Build mind-muscle connection"],
    tips: "Focus on controlled movements and full range of motion.",
  },
  strength: {
    focus: "Maximize force production through heavy compound movements and low-rep training.",
    goals: ["Increase 1RM on key lifts", "Develop neuromuscular efficiency", "Build raw power"],
    tips: "Prioritize rest between sets (2-3 min) and eat in a surplus for recovery.",
  },
  hypertrophy: {
    focus: "Maximize muscle growth through volume, time under tension, and metabolic stress.",
    goals: ["Increase muscle size", "Improve symmetry", "Progressive overload with moderate loads"],
    tips: "Focus on 8-12 rep ranges with controlled eccentrics and short rest periods.",
  },
  conditioning: {
    focus: "Improve cardiovascular fitness and metabolic capacity while maintaining muscle.",
    goals: ["Boost endurance", "Improve work capacity", "Enhance recovery between sets"],
    tips: "Keep heart rate elevated and minimize rest periods between exercises.",
  },
  recovery: {
    focus: "Active recovery and deload to prevent overtraining and promote adaptation.",
    goals: ["Reduce accumulated fatigue", "Allow supercompensation", "Address mobility limitations"],
    tips: "Prioritize sleep, hydration, and mobility work during this phase.",
  },
  muscle: {
    focus: "Targeted muscle building through isolation and compound work.",
    goals: ["Maximize hypertrophy", "Improve weak points", "Build dense, quality muscle tissue"],
    tips: "Use a variety of rep ranges and focus on the mind-muscle connection.",
  },
};

const getPhaseInfo = (title: string) => {
  const lower = title.toLowerCase();
  for (const key of Object.keys(PHASE_INFO)) {
    if (key !== "default" && lower.includes(key)) return PHASE_INFO[key];
  }
  return PHASE_INFO.default;
};

const TodaysFocus = () => {
  const { user } = useAuth();
  const [showPhaseDetail, setShowPhaseDetail] = useState(false);

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
  const phaseInfo = activePlan ? getPhaseInfo(activePlan.title) : null;

  return (
    <>
      <div className="card-apollo p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="font-heading text-sm uppercase tracking-wider">Today's Focus</h2>
        </div>

        {/* Current Phase — clickable */}
        {activePlan && (
          <button
            onClick={() => setShowPhaseDetail(true)}
            className="w-full mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 hover:border-primary/40 transition-all text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-primary uppercase tracking-[0.2em] mb-1">Current Phase</p>
                <p className="font-heading text-base">{activePlan.title}</p>
                <p className="text-[10px] text-muted-foreground">Cycle {activePlan.cycle_number} · {activePlan.duration_weeks} weeks</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </button>
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

      {/* Phase Detail Dialog */}
      <Dialog open={showPhaseDetail} onOpenChange={setShowPhaseDetail}>
        <DialogContent className="max-w-sm p-0 overflow-hidden bg-card border-border">
          {/* Phase hero image */}
          <div className="relative h-40 overflow-hidden">
            <img
              src={stockStatue}
              alt="Training phase"
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5">
              <p className="text-[10px] text-primary uppercase tracking-[0.2em] mb-1">Current Phase</p>
              <h3 className="font-heading text-xl text-foreground">{activePlan?.title}</h3>
              <p className="text-[10px] text-muted-foreground">
                Cycle {activePlan?.cycle_number} · {activePlan?.duration_weeks} weeks
              </p>
            </div>
          </div>

          {phaseInfo && (
            <div className="p-5 space-y-5">
              {/* Focus */}
              <div>
                <p className="text-[10px] text-primary uppercase tracking-[0.2em] mb-2 font-medium">Phase Focus</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{phaseInfo.focus}</p>
              </div>

              {/* Goals */}
              <div>
                <p className="text-[10px] text-primary uppercase tracking-[0.2em] mb-2 font-medium">What to Focus On</p>
                <div className="space-y-2">
                  {phaseInfo.goals.map((goal, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[9px] font-medium text-primary">{i + 1}</span>
                      </div>
                      <p className="text-xs text-foreground/70">{goal}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coach Tip */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-[10px] text-primary uppercase tracking-[0.15em] mb-1 font-medium">💡 Coach Tip</p>
                <p className="text-xs text-foreground/70 leading-relaxed">{phaseInfo.tips}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TodaysFocus;
