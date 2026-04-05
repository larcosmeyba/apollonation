import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { Trophy, Dumbbell, Flame, Zap, Star, Target, Award, Heart, Shield, Medal } from "lucide-react";

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  check: (stats: Stats) => boolean;
}

interface Stats {
  totalWorkouts: number;
  currentStreak: number;
  totalMealsLogged: number;
  hasPR: boolean;
}

const ACHIEVEMENTS: AchievementDef[] = [
  // Workout milestones
  { id: "first-workout", title: "First Rep", description: "Complete your first workout", icon: Dumbbell, check: (s) => s.totalWorkouts >= 1 },
  { id: "five-workouts", title: "Getting Started", description: "Complete 5 workouts", icon: Zap, check: (s) => s.totalWorkouts >= 5 },
  { id: "ten-workouts", title: "Double Digits", description: "Complete 10 workouts", icon: Shield, check: (s) => s.totalWorkouts >= 10 },
  { id: "twentyfive-workouts", title: "Quarter Century", description: "Complete 25 workouts", icon: Star, check: (s) => s.totalWorkouts >= 25 },
  { id: "thirty-workouts", title: "Iron Will", description: "Complete 30 workouts", icon: Star, check: (s) => s.totalWorkouts >= 30 },
  { id: "fifty-workouts", title: "Half Century", description: "Complete 50 workouts", icon: Medal, check: (s) => s.totalWorkouts >= 50 },
  { id: "seventyfive-workouts", title: "Beast Mode", description: "Complete 75 workouts", icon: Flame, check: (s) => s.totalWorkouts >= 75 },
  { id: "hundred-workouts", title: "Centurion", description: "Complete 100 workouts", icon: Trophy, check: (s) => s.totalWorkouts >= 100 },
  { id: "one-fifty-workouts", title: "Elite Athlete", description: "Complete 150 workouts", icon: Award, check: (s) => s.totalWorkouts >= 150 },
  { id: "two-hundred-workouts", title: "Unstoppable", description: "Complete 200 workouts", icon: Award, check: (s) => s.totalWorkouts >= 200 },
  { id: "three-hundred-workouts", title: "Spartan", description: "Complete 300 workouts", icon: Shield, check: (s) => s.totalWorkouts >= 300 },
  { id: "five-hundred-workouts", title: "Legend", description: "Complete 500 workouts", icon: Trophy, check: (s) => s.totalWorkouts >= 500 },
  // Streak milestones
  { id: "streak-3", title: "3 Day Streak", description: "Stay active 3 consecutive days", icon: Flame, check: (s) => s.currentStreak >= 3 },
  { id: "streak-5", title: "5 Day Streak", description: "Stay active 5 consecutive days", icon: Flame, check: (s) => s.currentStreak >= 5 },
  { id: "streak-7", title: "7 Day Streak", description: "Stay active for 7 consecutive days", icon: Flame, check: (s) => s.currentStreak >= 7 },
  { id: "streak-14", title: "2 Week Streak", description: "14 consecutive active days", icon: Heart, check: (s) => s.currentStreak >= 14 },
  { id: "streak-21", title: "3 Week Streak", description: "21 consecutive active days", icon: Heart, check: (s) => s.currentStreak >= 21 },
  { id: "streak-30", title: "30 Day Streak", description: "30 consecutive active days", icon: Award, check: (s) => s.currentStreak >= 30 },
  { id: "streak-60", title: "60 Day Streak", description: "60 consecutive active days", icon: Trophy, check: (s) => s.currentStreak >= 60 },
  { id: "streak-90", title: "90 Day Streak", description: "90 consecutive active days — true dedication", icon: Trophy, check: (s) => s.currentStreak >= 90 },
  // Nutrition milestones
  { id: "fuel-1", title: "First Fuel", description: "Log your first meal", icon: Target, check: (s) => s.totalMealsLogged >= 1 },
  { id: "fuel-10", title: "Fuel Up", description: "Log 10 meals", icon: Target, check: (s) => s.totalMealsLogged >= 10 },
  { id: "fuel-25", title: "Tracking Pro", description: "Log 25 meals", icon: Target, check: (s) => s.totalMealsLogged >= 25 },
  { id: "fuel-master", title: "Fuel Master", description: "Log 50 meals", icon: Star, check: (s) => s.totalMealsLogged >= 50 },
  { id: "fuel-legend", title: "Nutrition Pro", description: "Log 100 meals", icon: Star, check: (s) => s.totalMealsLogged >= 100 },
  { id: "fuel-elite", title: "Nutrition Elite", description: "Log 250 meals", icon: Medal, check: (s) => s.totalMealsLogged >= 250 },
  { id: "fuel-god", title: "Macro God", description: "Log 500 meals", icon: Trophy, check: (s) => s.totalMealsLogged >= 500 },
  // PR
  { id: "new-pr", title: "New PR!", description: "Set a new personal record", icon: Trophy, check: (s) => s.hasPR },
];

const Achievements = () => {
  const { user } = useAuth();

  const { data: totalWorkouts = 0 } = useQuery({
    queryKey: ["achievement-workouts", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("workout_session_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: totalMealsLogged = 0 } = useQuery({
    queryKey: ["achievement-meals", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("macro_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  // Calculate streak
  const { data: streakDates = [] } = useQuery({
    queryKey: ["achievement-streak", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const since = format(subDays(new Date(), 90), "yyyy-MM-dd");
      const [sessions, macros] = await Promise.all([
        supabase.from("workout_session_logs").select("log_date").eq("user_id", user.id).gte("log_date", since),
        supabase.from("macro_logs").select("log_date").eq("user_id", user.id).gte("log_date", since),
      ]);
      const dates = new Set([
        ...(sessions.data || []).map((d: any) => d.log_date),
        ...(macros.data || []).map((d: any) => d.log_date),
      ]);
      return Array.from(dates);
    },
    enabled: !!user,
  });

  let currentStreak = 0;
  const dateSet = new Set(streakDates);
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = format(subDays(today, i), "yyyy-MM-dd");
    if (i === 0 && !dateSet.has(d)) continue;
    if (dateSet.has(d)) currentStreak++;
    else if (i > 0) break;
  }

  const stats: Stats = {
    totalWorkouts,
    currentStreak,
    totalMealsLogged,
    hasPR: false, // Will be enhanced with strength tracking
  };

  const earned = ACHIEVEMENTS.filter((a) => a.check(stats));
  const locked = ACHIEVEMENTS.filter((a) => !a.check(stats));

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-medium">Achievements</p>
        </div>
        <span className="text-[10px] text-muted-foreground">{earned.length}/{ACHIEVEMENTS.length} unlocked</span>
      </div>

      {/* Earned */}
      {earned.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {earned.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.id} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-primary/5 border border-primary/20">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[8px] text-center font-medium leading-tight">{a.title}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {locked.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.id} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/10 border border-border/30 opacity-40">
                <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-[8px] text-center text-muted-foreground leading-tight">{a.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Achievements;
