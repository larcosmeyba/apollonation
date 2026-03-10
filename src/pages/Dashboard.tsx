import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Dumbbell, ChevronRight, Plus, MessageSquare, User, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardStepTracker from "@/components/dashboard/DashboardStepTracker";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { useMessages } from "@/hooks/useMessages";
import { useProfileLookup } from "@/hooks/useProfileLookup";

const Dashboard = () => {
  const { user, profile, subscription } = useAuth();
  const { toast } = useToast();
  const { conversations, unreadCount } = useMessages();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const todayDate = format(new Date(), "EEEE, MMMM d");

  // Weekly calendar strip
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Fetch today's workout
  const { data: todayWorkout } = useQuery({
    queryKey: ["today-workout", user?.id, format(selectedDate, "yyyy-MM-dd")],
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
      const target = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
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
  const todayDOW = selectedDate.getDay();
  const planDayOfWeek = todayDOW === 0 ? 7 : todayDOW;
  const todayDayNumber = (() => {
    if (!nutritionPlan?.start_date) return planDayOfWeek;
    const start = new Date(nutritionPlan.start_date + "T00:00:00");
    const target = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const diffDays = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 1;
    const totalDays = (nutritionPlan.duration_weeks || 4) * 7;
    return (diffDays % totalDays) + 1;
  })();

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
  const todayStr = format(selectedDate, "yyyy-MM-dd");
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

  const calPct = Math.min(Math.round((loggedTotals.calories / targets.calories) * 100), 100);

  // Coach message preview
  const latestConv = conversations[0];
  const partnerIds = latestConv ? [latestConv.partnerId] : [];
  const { data: msgProfiles } = useProfileLookup(partnerIds);

  const isRestDay = !todayWorkout;
  const isViewingToday = isSameDay(selectedDate, new Date());

  const MEAL_LABELS: Record<string, string> = {
    breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack",
  };

  const MacroBar = ({ current, target, bgColor, label }: { current: number; target: number; bgColor: string; label: string }) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold w-3 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--apollo-divider))] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${bgColor}`}
          style={{ width: `${Math.min((current / target) * 100, 100)}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground w-10 text-right">{current}g</span>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Section 1 — Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] mb-1">{todayDate}</p>
            <h1 className="font-heading text-2xl md:text-3xl tracking-wide">
              Hello, {profile?.display_name || "Warrior"}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                {profile?.subscription_tier || "Basic"} Member
              </Badge>
              {!subscription?.subscribed && (
                <Link to="/#pricing">
                  <Button variant="link" size="sm" className="text-primary text-[10px] h-5 px-0">Upgrade</Button>
                </Link>
              )}
            </div>
          </div>
          <Link to="/dashboard/profile">
            <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center border border-primary/20 hover:border-primary/40 transition-colors">
              <User className="w-5 h-5 text-primary" />
            </div>
          </Link>
        </div>

        {/* Section 2 — Weekly Calendar Strip */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {weekDates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center min-w-[44px] py-2 px-1 rounded-xl transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isTodayDate
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="text-[10px] font-medium uppercase">{format(date, "EEE")}</span>
                <span className={`text-base font-heading ${isSelected ? "text-primary-foreground" : ""}`}>
                  {format(date, "d")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Section 3 — Hero Workout Card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-medium">
                {isViewingToday ? "Today's Workout" : format(selectedDate, "EEEE")}
              </p>
              <Link to="/dashboard/training">
                <Button variant="ghost" size="sm" className="text-muted-foreground text-[10px] h-6 px-2">
                  <Plus className="w-3 h-3 mr-1" /> Log Activity
                </Button>
              </Link>
            </div>

            {isRestDay ? (
              <div className="text-center py-8">
                <p className="font-heading text-xl mb-2">Rest Day</p>
                <p className="text-sm text-muted-foreground">Recovery is part of the process. Come back stronger.</p>
              </div>
            ) : (
              <>
                <h2 className="font-heading text-xl mb-1">
                  {todayWorkout?.day_label || `Day ${todayWorkout?.day_number}`}
                </h2>
                {todayWorkout?.focus && (
                  <p className="text-xs text-muted-foreground mb-4">{todayWorkout.focus}</p>
                )}

                {/* Exercise preview */}
                <div className="space-y-2 mb-4">
                  {todayWorkout?.exercises.slice(0, 4).map((ex: any, i: number) => (
                    <div key={ex.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ex.exercise_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {ex.sets} × {ex.reps}{ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {(todayWorkout?.exercises.length || 0) > 4 && (
                  <p className="text-[11px] text-muted-foreground text-center mb-4">
                    +{todayWorkout!.exercises.length - 4} more exercises
                  </p>
                )}

                <Link to="/dashboard/training" className="block">
                  <Button variant="apollo" className="w-full">
                    <Dumbbell className="w-4 h-4 mr-2" /> Start Workout
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Section 4 — Nutrition Today Card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] text-primary uppercase tracking-[0.2em] font-medium">Nutrition Today</p>
            <Link to="/dashboard/nutrition">
              <Button variant="ghost" size="sm" className="text-muted-foreground text-[10px] h-6 px-2">
                Open <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Calories + Macros */}
          <div className="flex items-center gap-4 mb-4">
            {/* Circular progress */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray={`${calPct}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-heading">{loggedTotals.calories}</span>
                <span className="text-[8px] text-muted-foreground">/ {targets.calories}</span>
              </div>
            </div>

            {/* Macro bars */}
            <div className="flex-1 space-y-2">
              <MacroBar current={loggedTotals.protein} target={targets.protein} color="text-blue-400" label="P" />
              <MacroBar current={loggedTotals.carbs} target={targets.carbs} color="text-amber-400" label="C" />
              <MacroBar current={loggedTotals.fat} target={targets.fat} color="text-rose-400" label="F" />
            </div>
          </div>

          {/* Meal preview */}
          {todayMeals.length > 0 && (
            <div className="space-y-1.5">
              {todayMeals.slice(0, 3).map((meal) => (
                <div key={meal.id} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{meal.meal_name}</p>
                    <p className="text-[10px] text-muted-foreground">{MEAL_LABELS[meal.meal_type] || meal.meal_type}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">{meal.calories} cal</span>
                </div>
              ))}
              {todayMeals.length > 3 && (
                <Link to="/dashboard/nutrition">
                  <p className="text-[10px] text-primary text-center pt-1 hover:underline">+{todayMeals.length - 3} more meals</p>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Section 5 — Steps (compact) */}
        <DashboardStepTracker />

        {/* Section 7 — Coach Message Preview */}
        {latestConv && latestConv.unreadCount > 0 && (
          <Link to="/dashboard/messages" className="block">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">New message from Coach</p>
                  <p className="text-[11px] text-muted-foreground truncate">{latestConv.lastMessage.content}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-primary flex-shrink-0" />
              </div>
            </div>
          </Link>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
