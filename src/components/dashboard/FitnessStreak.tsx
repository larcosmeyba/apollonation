import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { Flame, Trophy, Zap, TrendingUp } from "lucide-react";

const FitnessStreak = () => {
  const { user } = useAuth();

  // Fetch workout session logs for last 90 days
  const { data: sessionLogs = [] } = useQuery({
    queryKey: ["fitness-streak-sessions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const since = format(subDays(new Date(), 90), "yyyy-MM-dd");
      const { data } = await supabase
        .from("workout_session_logs")
        .select("log_date")
        .eq("user_id", user.id)
        .gte("log_date", since);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch macro logs for last 90 days
  const { data: macroLogs = [] } = useQuery({
    queryKey: ["fitness-streak-macros", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const since = format(subDays(new Date(), 90), "yyyy-MM-dd");
      const { data } = await supabase
        .from("macro_logs")
        .select("log_date")
        .eq("user_id", user.id)
        .gte("log_date", since);
      return data || [];
    },
    enabled: !!user,
  });

  const today = new Date();
  const workoutDates = new Set(sessionLogs.map((l) => l.log_date));
  const nutritionDates = new Set(macroLogs.map((l) => l.log_date));

  // Calculate workout streak (consecutive days with workouts, allowing rest days)
  // A "fitness day" = workout OR nutrition logged
  const activeDates = new Set([...workoutDates, ...nutritionDates]);

  let currentStreak = 0;
  for (let i = 0; i < 90; i++) {
    const d = format(subDays(today, i), "yyyy-MM-dd");
    if (i === 0 && !activeDates.has(d)) continue; // don't break on today if not yet logged
    if (activeDates.has(d)) {
      currentStreak++;
    } else if (i > 0) {
      break;
    }
  }

  // Best streak
  let bestStreak = 0;
  let tempStreak = 0;
  for (let i = 0; i < 90; i++) {
    const d = format(subDays(today, i), "yyyy-MM-dd");
    if (activeDates.has(d)) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Weekly stats
  const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), "yyyy-MM-dd"));
  const workoutsThisWeek = last7.filter((d) => workoutDates.has(d)).length;
  const nutritionThisWeek = last7.filter((d) => nutritionDates.has(d)).length;

  // Monthly total workouts
  const last30 = Array.from({ length: 30 }, (_, i) => format(subDays(today, i), "yyyy-MM-dd"));
  const totalWorkouts = last30.filter((d) => workoutDates.has(d)).length;

  // Streak flame color based on streak length
  const getFlameColor = () => {
    if (currentStreak >= 30) return "text-yellow-400";
    if (currentStreak >= 14) return "text-orange-400";
    if (currentStreak >= 7) return "text-orange-500";
    return "text-muted-foreground";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className={`w-5 h-5 ${getFlameColor()}`} />
          <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-medium">Fitness Streak</p>
        </div>
        {bestStreak > currentStreak && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Trophy className="w-3 h-3" /> Best: {bestStreak}
          </span>
        )}
      </div>

      {/* Big streak number */}
      <div className="text-center mb-4">
        <div className="relative inline-flex items-center justify-center">
          <div className={`text-5xl font-heading ${currentStreak > 0 ? "text-primary" : "text-muted-foreground"}`}>
            {currentStreak}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {currentStreak === 0 ? "Start your streak today!" : currentStreak === 1 ? "day active" : "days active"}
        </p>
      </div>

      {/* 7-day activity dots */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {last7.map((dateStr) => {
          const hasWorkout = workoutDates.has(dateStr);
          const hasNutrition = nutritionDates.has(dateStr);
          const hasBoth = hasWorkout && hasNutrition;
          const hasAny = hasWorkout || hasNutrition;
          const dayLabel = ["M", "T", "W", "T", "F", "S", "S"][
            new Date(dateStr + "T00:00:00").getDay() === 0 ? 6 : new Date(dateStr + "T00:00:00").getDay() - 1
          ];

          return (
            <div key={dateStr} className="flex flex-col items-center gap-1">
              <span className="text-[8px] text-muted-foreground">{dayLabel}</span>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium transition-all ${
                  hasBoth
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : hasWorkout
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                    : hasNutrition
                    ? "bg-green-500/15 text-green-400 border border-green-500/30"
                    : "bg-muted/30 text-muted-foreground"
                }`}
              >
                {hasBoth ? "★" : hasAny ? "✔" : "·"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly stats bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/20 p-2.5 text-center">
          <Zap className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
          <p className="font-heading text-sm">{workoutsThisWeek}/7</p>
          <p className="text-[8px] text-muted-foreground">Workouts</p>
        </div>
        <div className="rounded-lg bg-muted/20 p-2.5 text-center">
          <Flame className="w-3.5 h-3.5 text-green-400 mx-auto mb-0.5" />
          <p className="font-heading text-sm">{nutritionThisWeek}/7</p>
          <p className="text-[8px] text-muted-foreground">Meals Logged</p>
        </div>
        <div className="rounded-lg bg-muted/20 p-2.5 text-center">
          <TrendingUp className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
          <p className="font-heading text-sm">{totalWorkouts}</p>
          <p className="text-[8px] text-muted-foreground">30d Workouts</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/30" /> Both</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/30" /> Workout</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500/30" /> Nutrition</span>
      </div>
    </div>
  );
};

export default FitnessStreak;
