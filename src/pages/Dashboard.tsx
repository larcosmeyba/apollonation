import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ChevronRight, Droplets, Footprints, Utensils, Play, Flame, Zap, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import stockBack from "@/assets/stock-back.png";
import stockArms from "@/assets/stock-arms.png";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
import marcosAction6 from "@/assets/marcos-action-6.jpg";
import marcosAction7 from "@/assets/marcos-action-7.jpg";

const WORKOUT_IMAGES = [stockBack, stockArms, marcosAction1, marcosAction6, marcosAction7];

const getWorkoutImage = (dateStr: string) => {
  const hash = dateStr.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return WORKOUT_IMAGES[hash % WORKOUT_IMAGES.length];
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack",
};

const Dashboard = () => {
  const { user, profile } = useAuth();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Fetch today's workout
  const { data: todayWorkout } = useQuery({
    queryKey: ["today-workout", user?.id, todayStr],
    queryFn: async () => {
      if (!user) return null;
      const { data: plans } = await (supabase as any)
        .from("client_training_plans")
        .select("*, client_questionnaires!client_training_plans_questionnaire_id_fkey(cycle_start_date)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);

      const plan = plans?.[0];
      if (!plan) return null;

      const cycleStartStr = plan.client_questionnaires?.cycle_start_date || plan.created_at.slice(0, 10);
      const cycleStart = new Date(cycleStartStr + "T00:00:00");
      const target = new Date();
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((target.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
      const dayNumber = (diffDays % (plan.duration_weeks * 7)) + 1;

      const { data: days } = await (supabase as any)
        .from("training_plan_days")
        .select("*, training_plan_exercises(*)")
        .eq("plan_id", plan.id)
        .eq("day_number", dayNumber)
        .limit(1);

      if (!days?.[0]) return null;
      return {
        ...days[0],
        planTitle: plan.title,
        exercises: days[0].training_plan_exercises?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [],
      };
    },
    enabled: !!user,
  });

  // Fetch nutrition plan summary
  const { data: nutritionPlan } = useQuery({
    queryKey: ["nutrition-plan-today-summary", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("nutrition_plans")
        .select("id, title, daily_calories, protein_grams, carbs_grams, fat_grams, duration_weeks, start_date")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch today's meals
  const todayDayNumber = useMemo(() => {
    if (!nutritionPlan?.start_date) return new Date().getDay() === 0 ? 7 : new Date().getDay();
    const start = new Date(nutritionPlan.start_date + "T00:00:00");
    const target = new Date(); target.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 1;
    const totalDays = (nutritionPlan.duration_weeks || 4) * 7;
    return (diffDays % totalDays) + 1;
  }, [nutritionPlan]);

  const { data: todayMeals = [] } = useQuery({
    queryKey: ["nutrition-today-preview", nutritionPlan?.id, todayDayNumber],
    queryFn: async () => {
      if (!nutritionPlan) return [];
      const { data } = await supabase
        .from("nutrition_plan_meals")
        .select("id, meal_name, meal_type, calories, protein_grams, carbs_grams, fat_grams")
        .eq("plan_id", nutritionPlan.id)
        .eq("day_number", todayDayNumber)
        .order("sort_order");
      return data || [];
    },
    enabled: !!nutritionPlan,
  });

  // Fetch today's macro logs
  const { data: macroLogs = [] } = useQuery({
    queryKey: ["macro-logs-summary", user?.id, todayStr],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("macro_logs")
        .select("calories, protein_grams, carbs_grams, fat_grams")
        .eq("user_id", user.id)
        .eq("log_date", todayStr);
      return data || [];
    },
    enabled: !!user,
  });

  // Steps
  const { data: stepLog } = useQuery({
    queryKey: ["home-steps", user?.id, todayStr],
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

  // Streak data
  const { data: streakData } = useQuery({
    queryKey: ["home-streak", user?.id],
    queryFn: async () => {
      if (!user) return { current: 0, best: 0, workoutsWeek: 0, mealsWeek: 0 };
      const since = format(subDays(new Date(), 90), "yyyy-MM-dd");
      const [sessions, macros] = await Promise.all([
        supabase.from("workout_session_logs").select("log_date").eq("user_id", user.id).gte("log_date", since),
        supabase.from("macro_logs").select("log_date").eq("user_id", user.id).gte("log_date", since),
      ]);
      const workoutDates = new Set((sessions.data || []).map((d: any) => d.log_date));
      const nutritionDates = new Set((macros.data || []).map((d: any) => d.log_date));
      const activeDates = new Set([...workoutDates, ...nutritionDates]);
      
      let current = 0;
      let best = 0;
      let temp = 0;
      const today = new Date();
      for (let i = 0; i < 90; i++) {
        const d = format(subDays(today, i), "yyyy-MM-dd");
        if (i === 0 && !activeDates.has(d)) continue;
        if (activeDates.has(d)) { current++; temp++; best = Math.max(best, temp); }
        else if (i > 0) break;
      }
      // reset temp for full best calc
      temp = 0;
      for (let i = 0; i < 90; i++) {
        const d = format(subDays(today, i), "yyyy-MM-dd");
        if (activeDates.has(d)) { temp++; best = Math.max(best, temp); }
        else temp = 0;
      }

      const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), "yyyy-MM-dd"));
      return {
        current,
        best,
        workoutsWeek: last7.filter(d => workoutDates.has(d)).length,
        mealsWeek: last7.filter(d => nutritionDates.has(d)).length,
      };
    },
    enabled: !!user,
  });

  // Featured on-demand workout
  const { data: featuredWorkout } = useQuery({
    queryKey: ["featured-workout"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts")
        .select("id, title, category, duration_minutes, calories_estimate, thumbnail_url, video_url")
        .eq("is_featured", true)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const loggedTotals = macroLogs.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein_grams || 0),
      carbs: acc.carbs + (e.carbs_grams || 0),
      fat: acc.fat + (e.fat_grams || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const targets = {
    calories: nutritionPlan?.daily_calories || 2500,
    protein: nutritionPlan?.protein_grams || 180,
    carbs: nutritionPlan?.carbs_grams || 300,
    fat: nutritionPlan?.fat_grams || 70,
  };

  const remaining = {
    calories: Math.max(0, targets.calories - loggedTotals.calories),
    protein: Math.max(0, targets.protein - loggedTotals.protein),
    carbs: Math.max(0, targets.carbs - loggedTotals.carbs),
    fat: Math.max(0, targets.fat - loggedTotals.fat),
  };

  const calPct = Math.min(Math.round((loggedTotals.calories / targets.calories) * 100), 100);

  const isRestDay = !todayWorkout;

  const MacroBar = ({ current, target, label }: { current: number; target: number; label: string }) => {
    const pct = Math.min(Math.round((current / target) * 100), 100);
    const rem = Math.max(0, target - current);
    return (
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-foreground/50 font-medium">{label}</span>
          <span className="text-[10px] text-foreground/40">{rem}g left</span>
        </div>
        <div className="w-full h-1 rounded-full bg-foreground/5 overflow-hidden">
          <div className="h-full rounded-full bg-foreground/40 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-4">

        {/* 1. Welcome Header */}
        <div>
          <p className="text-[10px] text-foreground/30 uppercase tracking-[0.2em] mb-0.5">{format(new Date(), "EEEE, MMMM d")}</p>
          <h1 className="font-heading text-xl tracking-wide text-foreground/90">
            {greeting}, {profile?.display_name || "Warrior"}
          </h1>
        </div>

        {/* 2. Primary Action Card */}
        <div className="rounded-xl overflow-hidden border border-border/20">
          <div className="relative h-36">
            <img
              src={getWorkoutImage(todayStr)}
              alt="Today's training"
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <p className="text-[9px] text-foreground/40 uppercase tracking-[0.25em] font-light mb-0.5">
                {isRestDay ? "Recovery Day" : "Today's Training"}
              </p>
              <h2 className="font-heading text-lg text-foreground/90">
                {isRestDay
                  ? "Recovery & Mobility"
                  : todayWorkout?.day_label || `Day ${todayWorkout?.day_number}`
                }
              </h2>
              {!isRestDay && todayWorkout?.focus && (
                <p className="text-[11px] text-foreground/40 font-light">{todayWorkout.focus}</p>
              )}
            </div>
          </div>

          <div className="p-4 pt-2 space-y-2.5">
            {!isRestDay && todayWorkout?.exercises.slice(0, 3).map((ex: any, i: number) => (
              <div key={ex.id} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-foreground/5 flex items-center justify-center text-[9px] text-foreground/30 flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-[12px] text-foreground/70 flex-1 truncate">{ex.exercise_name}</p>
                <p className="text-[10px] text-foreground/25">{ex.sets}×{ex.reps}</p>
              </div>
            ))}
            {!isRestDay && (todayWorkout?.exercises.length || 0) > 3 && (
              <p className="text-[10px] text-foreground/20 text-center">+{todayWorkout!.exercises.length - 3} more</p>
            )}

            <div className="flex gap-2 pt-1">
              <Link to={isRestDay ? "/dashboard/recovery" : `/dashboard/training/workout?day=${todayWorkout?.id}&date=${todayStr}`} className="flex-1">
                <Button variant="apollo" size="sm" className="w-full text-xs">
                  {isRestDay ? "Start Recovery" : "Start Workout"}
                </Button>
              </Link>
              <Link to="/dashboard/workouts">
                <Button variant="outline" size="sm" className="text-xs border-border/30 text-foreground/50">
                  Browse
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 3. Nutrition Snapshot */}
        <div className="rounded-xl border border-border/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] text-foreground/25 uppercase tracking-[0.25em] font-light">Nutrition</p>
            <Link to="/dashboard/nutrition">
              <Button variant="ghost" size="sm" className="text-foreground/30 text-[10px] h-5 px-1.5 hover:text-foreground/60">
                View Plan <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-4 mb-3">
            {/* Big calorie ring */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--foreground) / 0.05)" strokeWidth="2.5" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="2.5" strokeDasharray={`${calPct}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-heading text-foreground/80">{remaining.calories}</span>
                <span className="text-[7px] text-foreground/25 font-light">cal left</span>
              </div>
            </div>

            {/* Macro bars */}
            <div className="flex-1 space-y-2">
              <MacroBar current={loggedTotals.protein} target={targets.protein} label="Protein" />
              <MacroBar current={loggedTotals.carbs} target={targets.carbs} label="Carbs" />
              <MacroBar current={loggedTotals.fat} target={targets.fat} label="Fat" />
            </div>
          </div>
        </div>

        {/* 4. Today's Fuel */}
        {todayMeals.length > 0 && (
          <div className="rounded-xl border border-border/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Utensils className="w-3.5 h-3.5 text-foreground/30" />
                <p className="text-[9px] text-foreground/25 uppercase tracking-[0.25em] font-light">Today's Fuel</p>
              </div>
              <Link to="/dashboard/nutrition">
                <Button variant="ghost" size="sm" className="text-foreground/30 text-[10px] h-5 px-1.5 hover:text-foreground/60">
                  Full Plan <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              </Link>
            </div>
            <div className="space-y-1">
              {todayMeals.slice(0, 4).map((meal) => (
                <div key={meal.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground/70 truncate">{meal.meal_name}</p>
                    <p className="text-[10px] text-foreground/25">{MEAL_LABELS[meal.meal_type] || meal.meal_type}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2 space-y-0.5">
                    <span className="text-[10px] text-foreground/40">{meal.calories} cal</span>
                    <p className="text-[8px] text-foreground/20">P{meal.protein_grams} · C{meal.carbs_grams} · F{meal.fat_grams}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Fitness Streak */}
        <div className="rounded-xl border border-border/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className={`w-4 h-4 ${(streakData?.current || 0) >= 7 ? "text-orange-400" : "text-foreground/30"}`} />
              <p className="text-[9px] text-foreground/25 uppercase tracking-[0.25em] font-light">Streak</p>
            </div>
            {(streakData?.best || 0) > (streakData?.current || 0) && (
              <span className="text-[9px] text-foreground/20 flex items-center gap-1">
                <Trophy className="w-3 h-3" /> Best: {streakData?.best}
              </span>
            )}
          </div>

          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-3xl font-heading text-foreground/80">{streakData?.current || 0}</p>
              <p className="text-[9px] text-foreground/25">days active</p>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-foreground/[0.03] p-2 text-center">
                <Zap className="w-3 h-3 text-foreground/25 mx-auto mb-0.5" />
                <p className="text-sm font-heading text-foreground/60">{streakData?.workoutsWeek || 0}/7</p>
                <p className="text-[8px] text-foreground/20">Workouts</p>
              </div>
              <div className="rounded-lg bg-foreground/[0.03] p-2 text-center">
                <TrendingUp className="w-3 h-3 text-foreground/25 mx-auto mb-0.5" />
                <p className="text-sm font-heading text-foreground/60">{streakData?.mealsWeek || 0}/7</p>
                <p className="text-[8px] text-foreground/20">Meals Logged</p>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Movement & Recovery */}
        <div className="rounded-xl border border-border/20 p-4">
          <p className="text-[9px] text-foreground/25 uppercase tracking-[0.25em] font-light mb-3">Movement Today</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <Footprints className="w-4 h-4 text-foreground/25 mx-auto mb-1" />
              <p className="text-sm font-heading text-foreground/70">{(stepLog?.steps || 0).toLocaleString()}</p>
              <p className="text-[8px] text-foreground/20">steps</p>
            </div>
            <div className="text-center">
              <Zap className="w-4 h-4 text-foreground/25 mx-auto mb-1" />
              <p className="text-sm font-heading text-foreground/70">—</p>
              <p className="text-[8px] text-foreground/20">active min</p>
            </div>
            <div className="text-center">
              <Droplets className="w-4 h-4 text-foreground/25 mx-auto mb-1" />
              <p className="text-sm font-heading text-foreground/70">—</p>
              <p className="text-[8px] text-foreground/20">water (L)</p>
            </div>
          </div>
        </div>

        {/* 7. Featured On-Demand Workout */}
        {featuredWorkout && (
          <Link to="/dashboard/workouts" className="block">
            <div className="rounded-xl border border-border/20 overflow-hidden group">
              <div className="relative h-28">
                {featuredWorkout.thumbnail_url ? (
                  <img src={featuredWorkout.thumbnail_url} alt={featuredWorkout.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-foreground/5 flex items-center justify-center">
                    <Play className="w-8 h-8 text-foreground/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-[9px] text-foreground/30 uppercase tracking-[0.2em] mb-0.5">Featured Workout</p>
                  <p className="font-heading text-sm text-foreground/80">{featuredWorkout.title}</p>
                  <p className="text-[10px] text-foreground/30">{featuredWorkout.duration_minutes} min · {featuredWorkout.category}</p>
                </div>
              </div>
            </div>
          </Link>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
