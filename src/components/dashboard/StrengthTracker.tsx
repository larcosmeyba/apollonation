import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Trophy, Dumbbell } from "lucide-react";

interface PR {
  exercise_name: string;
  weight: number;
  reps: number;
  log_date: string;
}

const StrengthTracker = () => {
  const { user } = useAuth();

  // Get all exercise set logs with exercise names
  const { data: prData = [] } = useQuery({
    queryKey: ["strength-prs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: logs } = await supabase
        .from("exercise_set_logs")
        .select("weight, reps_completed, log_date, training_plan_exercise_id")
        .eq("user_id", user.id)
        .not("weight", "is", null)
        .gt("weight", 0)
        .order("log_date", { ascending: false })
        .limit(500);

      if (!logs || logs.length === 0) return [];

      // Get exercise names
      const exerciseIds = [...new Set(logs.map((l: any) => l.training_plan_exercise_id))];
      const { data: exercises } = await supabase
        .from("training_plan_exercises")
        .select("id, exercise_name")
        .in("id", exerciseIds);

      const nameMap = new Map((exercises || []).map((e: any) => [e.id, e.exercise_name]));

      // Find PRs per exercise (highest weight)
      const prMap = new Map<string, PR>();
      for (const log of logs) {
        const name = nameMap.get(log.training_plan_exercise_id);
        if (!name || !log.weight) continue;
        const existing = prMap.get(name);
        if (!existing || log.weight > existing.weight) {
          prMap.set(name, {
            exercise_name: name,
            weight: Number(log.weight),
            reps: log.reps_completed || 0,
            log_date: log.log_date,
          });
        }
      }

      return Array.from(prMap.values())
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 6);
    },
    enabled: !!user,
  });

  if (prData.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-medium">Personal Records</p>
      </div>

      <div className="space-y-2">
        {prData.map((pr, i) => (
          <div key={pr.exercise_name} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 border border-border/50">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              i === 0 ? "bg-yellow-500/15 text-yellow-400" :
              i === 1 ? "bg-gray-400/15 text-gray-400" :
              i === 2 ? "bg-orange-600/15 text-orange-500" :
              "bg-muted/30 text-muted-foreground"
            }`}>
              {i < 3 ? <Trophy className="w-3.5 h-3.5" /> : <Dumbbell className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{pr.exercise_name}</p>
              <p className="text-[10px] text-muted-foreground">{pr.reps} reps · {pr.log_date}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-heading text-sm text-primary">{pr.weight} lbs</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrengthTracker;
