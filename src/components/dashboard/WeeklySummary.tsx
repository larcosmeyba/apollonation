import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { Trophy, Dumbbell, Utensils, TrendingUp, X } from "lucide-react";
import { useState } from "react";

const WeeklySummary = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Only show on Sundays (or Monday before noon for catch-up)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const isShowDay = dayOfWeek === 0 || (dayOfWeek === 1 && now.getHours() < 12);
  
  const lastWeekStart = format(startOfWeek(subWeeks(now, dayOfWeek === 0 ? 0 : 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const lastWeekEnd = format(endOfWeek(subWeeks(now, dayOfWeek === 0 ? 0 : 1), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: workoutCount = 0 } = useQuery({
    queryKey: ["weekly-summary-workouts", user?.id, lastWeekStart],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("workout_session_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("log_date", lastWeekStart)
        .lte("log_date", lastWeekEnd);
      return count || 0;
    },
    enabled: !!user && isShowDay && !dismissed,
  });

  const { data: nutritionDays = 0 } = useQuery({
    queryKey: ["weekly-summary-nutrition", user?.id, lastWeekStart],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("macro_logs")
        .select("log_date")
        .eq("user_id", user.id)
        .gte("log_date", lastWeekStart)
        .lte("log_date", lastWeekEnd);
      const uniqueDays = new Set(data?.map((d) => d.log_date));
      return uniqueDays.size;
    },
    enabled: !!user && isShowDay && !dismissed,
  });

  const { data: planDays = 5 } = useQuery({
    queryKey: ["weekly-summary-plan-days", user?.id],
    queryFn: async () => {
      if (!user) return 5;
      const { data } = await supabase
        .from("client_training_plans")
        .select("workout_days_per_week")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data?.workout_days_per_week || 5;
    },
    enabled: !!user && isShowDay && !dismissed,
  });

  if (!isShowDay || dismissed) return null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-5 relative">
      <button onClick={() => setDismissed(true)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="font-heading text-sm uppercase tracking-wider">Your Week in Apollo</h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-lg bg-muted/20">
          <Dumbbell className="w-5 h-5 text-red-400 mx-auto mb-1" />
          <p className="font-heading text-xl">{workoutCount} / {planDays}</p>
          <p className="text-[9px] text-muted-foreground">Workouts</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/20">
          <Utensils className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <p className="font-heading text-xl">{nutritionDays} / 7</p>
          <p className="text-[9px] text-muted-foreground">Meals Logged</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/20">
          <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
          <p className="font-heading text-xl">
            {Math.round(((workoutCount / planDays + nutritionDays / 7) / 2) * 100)}%
          </p>
          <p className="text-[9px] text-muted-foreground">Compliance</p>
        </div>
      </div>
    </div>
  );
};

export default WeeklySummary;
