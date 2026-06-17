import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dumbbell, ChevronRight, Play, Plus, Flame, Clock, Activity,
  ChevronLeft, Loader2, Sparkles, ArrowLeftRight, Check,
  CalendarDays, Waves,
} from "lucide-react";
import { useSwipe } from "@/hooks/useSwipe";
import TrainingProgramCards from "@/components/dashboard/TrainingProgramCards";
import { Link } from "react-router-dom";
import {
  format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, differenceInCalendarDays,
} from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import stockBack from "@/assets/stock-back.webp";

import { getYouTubeVideoId } from "@/utils/youtube";

const DashboardTraining = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({ name: "", duration: "", calories: "", notes: "" });
  const [swapSource, setSwapSource] = useState<{ day: any; date: Date } | null>(null);

  const today = new Date();
  const logDateStr = format(today, "yyyy-MM-dd");

  const currentWeekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const { data: planData, isLoading: planLoading } = useQuery({
    queryKey: ["my-training-plan-full", user?.id],
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

      const { data: days } = await (supabase as any)
        .from("training_plan_days")
        .select("*, training_plan_exercises(*)")
        .eq("plan_id", plan.id)
        .order("day_number");

      return { plan, days: days || [] };
    },
    enabled: !!user,
  });

  const { data: completedSessions = [] } = useQuery({
    queryKey: ["completed-sessions-week", user?.id, format(currentWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];
      const weekEnd = addDays(currentWeekStart, 6);
      const { data } = await (supabase as any)
        .from("workout_session_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", format(currentWeekStart, "yyyy-MM-dd"))
        .lte("log_date", format(weekEnd, "yyyy-MM-dd"))
        .not("completed_at", "is", null);
      return data || [];
    },
    enabled: !!user,
  });

  // Total completed workouts across the full active program (for progress card)
  const { data: completedAllTime = [] } = useQuery({
    queryKey: ["completed-sessions-all", user?.id, planData?.plan?.id],
    enabled: !!user && !!planData?.plan,
    queryFn: async () => {
      const cycleStart = planData?.plan?.client_questionnaires?.cycle_start_date
        ?? planData?.plan?.created_at;
      const { data } = await (supabase as any)
        .from("workout_session_logs")
        .select("log_date")
        .eq("user_id", user!.id)
        .gte("log_date", format(new Date(cycleStart), "yyyy-MM-dd"))
        .not("completed_at", "is", null);
      return data || [];
    },
  });


  const addActivityMutation = useMutation({
    mutationFn: async (activity: { name: string; duration: number | null; calories: number | null; notes: string }) => {
      if (!user) return;
      const { error } = await (supabase as any)
        .from("custom_activity_logs")
        .insert({
          user_id: user.id,
          log_date: logDateStr,
          activity_name: activity.name,
          duration_minutes: activity.duration,
          calories_burned: activity.calories,
          notes: activity.notes || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-activities"] });
      setShowAddActivity(false);
      setActivityForm({ name: "", duration: "", calories: "", notes: "" });
      toast({ title: "Activity added! 🎉" });
    },
  });

  const getWorkoutForDate = useCallback((date: Date) => {
    if (!planData) return null;
    const { plan, days } = planData;
    const cycleStart = plan.client_questionnaires?.cycle_start_date
      ? new Date(plan.client_questionnaires.cycle_start_date)
      : new Date(plan.created_at);

    const diffDays = differenceInCalendarDays(date, cycleStart);
    if (diffDays < 0) return null;

    const totalDays = plan.duration_weeks * 7;
    const dayNumber = (diffDays % totalDays) + 1;

    const rescheduled = days.find((d: any) =>
      d.scheduled_date && isSameDay(new Date(d.scheduled_date), date)
    );
    if (rescheduled) return rescheduled;

    return days.find((d: any) => !d.scheduled_date && d.day_number === dayNumber) || null;
  }, [planData]);

  const todayWorkout = getWorkoutForDate(today);
  const exercises = todayWorkout?.training_plan_exercises?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [];

  // Program progress derivation
  const programProgress = useMemo(() => {
    if (!planData?.plan) return null;
    const { plan, days } = planData;
    const daysPerCycle = days.length || 7;
    const totalWorkouts = (plan.duration_weeks || 1) * daysPerCycle;
    const completed = Math.min(completedAllTime.length, totalWorkouts);
    const percent = totalWorkouts > 0 ? Math.round((completed / totalWorkouts) * 100) : 0;
    const cycleStart = plan.client_questionnaires?.cycle_start_date
      ? new Date(plan.client_questionnaires.cycle_start_date)
      : new Date(plan.created_at);
    const diffDays = Math.max(0, differenceInCalendarDays(today, cycleStart));
    const currentWeek = Math.min(plan.duration_weeks || 1, Math.floor(diffDays / 7) + 1);
    return {
      title: plan.title || "Training Program",
      currentWeek,
      totalWeeks: plan.duration_weeks || 1,
      completed,
      totalWorkouts,
      percent,
    };
  }, [planData, completedAllTime, today]);

  // Today's workout metadata
  const todayMeta = useMemo(() => {
    if (!todayWorkout) return null;
    const exCount = (todayWorkout.training_plan_exercises || []).length;
    const estDuration = todayWorkout.duration_minutes
      || (exCount > 0 ? Math.max(20, exCount * 4) : 30);
    const type = todayWorkout.session_type || todayWorkout.focus_type || "Strength";
    return { duration: estDuration, type };
  }, [todayWorkout]);

  const swapMutation = useMutation({
    mutationFn: async ({ sourceDay, sourceDate, targetDate }: { sourceDay: any; sourceDate: Date; targetDate: Date }) => {
      const targetDay = getWorkoutForDate(targetDate);
      const sourceDateStr = format(sourceDate, "yyyy-MM-dd");
      const targetDateStr = format(targetDate, "yyyy-MM-dd");
      // Move source workout to target date
      await (supabase as any)
        .from("training_plan_days")
        .update({ scheduled_date: targetDateStr })
        .eq("id", sourceDay.id);
      // If target had a workout, move it to source date (true swap); else just leave source date open
      if (targetDay) {
        await (supabase as any)
          .from("training_plan_days")
          .update({ scheduled_date: sourceDateStr })
          .eq("id", targetDay.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-training-plan-full"] });
      setSwapSource(null);
      toast({ title: "Workouts swapped ✓" });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't swap", description: err.message, variant: "destructive" });
    },
  });

  // Build week list of workouts (only days that have a workout, ordered by date)
  const weekWorkouts = useMemo(() => {
    return weekDates
      .map((date) => ({ date, day: getWorkoutForDate(date) }))
      .filter((w) => !!w.day);
  }, [weekDates, getWorkoutForDate]);

  const muscleSummary = (day: any): string => {
    const groups = new Set<string>();
    (day?.training_plan_exercises || []).forEach((ex: any) => {
      const g = ex.muscle_group;
      if (g && g !== "warmup" && g !== "cooldown") groups.add(g);
    });
    return Array.from(groups).slice(0, 4).join(" · ");
  };


  const programFocus = useMemo(() => {
    const t = (planData?.plan?.title || "").toLowerCase();
    if (t.includes("fat") || t.includes("lose") || t.includes("cut")) return "Fat Loss";
    if (t.includes("muscle") || t.includes("bulk") || t.includes("gain")) return "Muscle Gain";
    if (t.includes("recomp")) return "Recomposition";
    if (t.includes("endur")) return "Endurance";
    if (t.includes("strength")) return "Strength";
    return "Performance";
  }, [planData]);

  const avgSessionMin = useMemo(() => {
    const days = planData?.days || [];
    const durations = days.map((d: any) => d.duration_minutes).filter(Boolean) as number[];
    if (!durations.length) return "45–60";
    const lo = Math.min(...durations);
    const hi = Math.max(...durations);
    return lo === hi ? `${lo}` : `${lo}–${hi}`;
  }, [planData]);

  const weekSwipe = useSwipe({
    onSwipeLeft: () => setCurrentDate(d => addWeeks(d, 1)),
    onSwipeRight: () => setCurrentDate(d => subWeeks(d, 1)),
  });

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-display-md leading-none">Programs</h1>
            <p className="text-xs text-foreground/40 mt-1">Structured training programs</p>
          </div>
          <Button
            variant="apollo"
            size="sm"
            className="gap-1.5 text-xs rounded-full px-4 shadow-[0_4px_18px_-2px_hsl(var(--primary)/0.45)]"
            onClick={() => setShowAddActivity(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Log Activity
          </Button>
        </div>

        {/* 1) TODAY'S WORKOUT — HERO */}
        {planData && todayWorkout ? (
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-2">
              Today's Workout
            </p>
            <Link
              to={`/dashboard/training/workout?day=${todayWorkout.id}&date=${logDateStr}`}
              className="group block rounded-2xl border border-border/30 overflow-hidden bg-gradient-to-br from-foreground/[0.04] to-transparent hover:border-primary/40 transition-colors"
            >
              <div className="flex items-stretch">
                <div className="relative w-32 sm:w-44 flex-shrink-0 overflow-hidden">
                  <img
                    src={stockBack}
                    alt={todayWorkout.day_label || `Day ${todayWorkout.day_number}`}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/40" />
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <h2 className="font-heading text-xl sm:text-2xl text-foreground leading-tight truncate">
                      {todayWorkout.day_label || todayWorkout.focus || `Day ${todayWorkout.day_number}`}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-foreground/60">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {todayMeta?.duration ?? 45} min
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Dumbbell className="w-3.5 h-3.5" /> {exercises.length} Exercises
                      </span>
                    </div>
                    {programProgress && (
                      <p className="text-[11px] text-foreground/40 mt-1.5">
                        Week {programProgress.currentWeek} · Day {todayWorkout.day_number}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <Button variant="apollo" size="sm" className="rounded-full px-5 gap-1.5">
                      <Play className="w-3.5 h-3.5 fill-current" /> Start
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ) : planData ? (
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-2">
              Today
            </p>
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] p-6 bg-gradient-to-br from-primary/[0.18] via-[#1a1a1a] to-[#0d0d0d] shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.4)]">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <p className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-bold mb-2">Rest & Recover</p>
                <h2 className="font-heading text-3xl text-foreground tracking-tight">Rest Day</h2>
                <p className="text-sm text-foreground/70 mt-2 max-w-sm leading-relaxed">
                  {completedSessions.length > 0
                    ? `You crushed ${completedSessions.length} workout${completedSessions.length === 1 ? "" : "s"} this week. Let the body adapt.`
                    : "Recovery is where the gains happen. Stretch, sleep, fuel up."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/20 p-8 text-center">
            <Dumbbell className="w-10 h-10 text-foreground/10 mx-auto mb-3" />
            <h3 className="font-heading text-base mb-1.5 text-foreground/70">No Active Program</h3>
            <p className="text-xs text-foreground/40 mb-4">
              Choose a program below to get started with structured training.
            </p>
          </div>
        )}

        {/* 2) WEEKLY CALENDAR */}
        {planData && (
          <div>
            {programProgress && (
              <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-2 px-1">
                Week {programProgress.currentWeek}
              </p>
            )}
            <div
              className="rounded-2xl border border-white/[0.05] p-3 bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d]"
              onTouchStart={weekSwipe.onTouchStart}
              onTouchEnd={weekSwipe.onTouchEnd}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/50" onClick={() => setCurrentDate(d => subWeeks(d, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-[11px] text-foreground/60 tracking-wider font-medium">
                  {format(currentWeekStart, "MMM d")} — {format(addDays(currentWeekStart, 6), "MMM d")}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/50" onClick={() => setCurrentDate(d => addWeeks(d, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1">
                {weekDates.map((date) => {
                  const workout = getWorkoutForDate(date);
                  const isTodayDate = isToday(date);
                  const dateStr = format(date, "yyyy-MM-dd");
                  const isCompleted = completedSessions.some((s: any) => s.log_date === dateStr);
                  const isPast = date < new Date(format(today, "yyyy-MM-dd"));
                  const missed = isPast && workout && !isCompleted;

                  return (
                    <Link
                      key={date.toISOString()}
                      to={workout ? `/dashboard/training/workout?day=${workout.id}&date=${dateStr}` : "#"}
                      onClick={(e) => !workout && e.preventDefault()}
                      className={`flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all min-h-[68px] justify-center active:scale-[0.96] ${
                        isTodayDate
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-[#0d0d0d] bg-primary/10 text-primary shadow-[0_0_20px_-4px_hsl(var(--primary)/0.6)]"
                          : workout
                            ? "text-foreground/80 hover:bg-foreground/5"
                            : "text-foreground/30"
                      }`}
                    >
                      <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{format(date, "EEE")}</span>
                      <span className={`text-base font-heading mt-0.5 ${isTodayDate ? "font-bold" : ""}`}>{format(date, "d")}</span>
                      <div className="h-1.5 mt-1 flex items-center justify-center">
                        {isCompleted ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                        ) : missed ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-destructive/70" />
                        ) : workout ? (
                          <div className={`w-1 h-1 rounded-full ${isTodayDate ? "bg-primary/70" : "bg-foreground/30"}`} />
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3) PROGRAM PROGRESS — HERO */}
        {programProgress && (() => {
          const r = 56;
          const c = 2 * Math.PI * r;
          const dash = (programProgress.percent / 100) * c;
          const sessionsPerWeek = Math.max(1, Math.round(programProgress.totalWorkouts / programProgress.totalWeeks));
          return (
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] p-6 bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] shadow-[0_10px_40px_-20px_hsl(var(--primary)/0.3)]">
              <div className="absolute -top-16 -left-16 w-56 h-56 bg-primary/[0.08] rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex items-center gap-5">
                {/* Circular progress ring */}
                <div className="relative flex-shrink-0 w-32 h-32">
                  <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r={r} fill="none" stroke="hsl(var(--foreground) / 0.08)" strokeWidth="6" />
                    <circle
                      cx="64" cy="64" r={r} fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${dash} ${c}`}
                      className="transition-all duration-700 drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-heading text-5xl text-foreground tracking-tight tabular-nums leading-none">
                      {programProgress.percent}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-primary font-bold mt-0.5">Percent</span>
                  </div>
                </div>
                {/* Meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/50 font-semibold mb-1.5 truncate">
                    {programProgress.title}
                  </p>
                  <h3 className="font-heading text-2xl text-foreground leading-tight tracking-tight">
                    Week {programProgress.currentWeek}
                    <span className="text-foreground/30 font-normal"> / {programProgress.totalWeeks}</span>
                  </h3>
                  <p className="text-xs text-foreground/55 mt-1.5 tabular-nums">
                    {programProgress.completed} of {programProgress.totalWorkouts} workouts
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-foreground/40 mt-2">
                    {programProgress.totalWeeks} wk · ~{sessionsPerWeek} sessions/wk
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 4) PROGRAM OVERVIEW */}
        {planData && programProgress && (
          <div className="rounded-2xl border border-border/25 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-4">
              Program Overview
            </p>
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {[
                { icon: CalendarDays, label: "Weeks", value: String(programProgress.totalWeeks) },
                { icon: Dumbbell, label: "Workouts", value: String(programProgress.totalWorkouts) },
                { icon: Clock, label: "Min / Workout", value: avgSessionMin },
                { icon: Flame, label: "Focus", value: programFocus },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center text-center px-1 py-2 border-l border-border/15 first:border-l-0">
                  <m.icon className="w-5 h-5 text-primary mb-2" strokeWidth={1.5} />
                  <p className="font-heading text-base sm:text-lg text-foreground leading-none">{m.value}</p>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-foreground/50 mt-1.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5) 7-DAY RECOVERY RESET */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
              Recovery & Mobility
            </p>
            <Link to="/dashboard/recovery-program" className="text-[11px] text-foreground/60 hover:text-primary uppercase tracking-wider font-semibold">
              Open Program
            </Link>
          </div>
          <Link to="/dashboard/recovery-program" className="block rounded-2xl border border-border/25 overflow-hidden hover:border-primary/40 transition-colors">
            <div className="relative h-32 overflow-hidden">
              <img src={stockBack} alt="Recovery" className="w-full h-full object-cover opacity-60" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="font-heading text-xl text-foreground leading-tight">7-Day Recovery Reset</h3>
                <p className="text-[11px] text-foreground/60 mt-0.5">
                  Off-day flow — foam roll, mobilize, stretch, breathe. Built from in-house video.
                </p>
              </div>
            </div>
            <div className="p-3 grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <div
                  key={n}
                  className="aspect-square rounded-lg border border-border/20 flex flex-col items-center justify-center"
                >
                  <p className="text-[8px] uppercase tracking-wider text-foreground/40">Day</p>
                  <p className="font-heading text-sm text-foreground">{n}</p>
                </div>
              ))}
            </div>
          </Link>
        </div>

        {/* Upcoming Workouts list removed — users see the week schedule on the calendar above. */}


        {/* Browse other programs */}
        <TrainingProgramCards />
      </div>


      {/* Swap Workout Dialog */}
      <Dialog open={!!swapSource} onOpenChange={(o) => !o && setSwapSource(null)}>
        <DialogContent className="max-w-sm bg-background border-border/30">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Move workout to…</DialogTitle>
          </DialogHeader>
          {swapSource && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-foreground/50">
                Moving <span className="text-foreground/80 font-medium">
                  {swapSource.day.day_label || `Day ${swapSource.day.day_number}`}
                </span> from {format(swapSource.date, "EEE MMM d")}. If the target day already has a workout, they'll swap.
              </p>
              <div className="grid grid-cols-1 gap-1.5 pt-2">
                {weekDates
                  .filter((d) => !isSameDay(d, swapSource.date))
                  .map((d) => {
                    const target = getWorkoutForDate(d);
                    return (
                      <button
                        key={d.toISOString()}
                        disabled={swapMutation.isPending}
                        onClick={() => swapMutation.mutate({
                          sourceDay: swapSource.day,
                          sourceDate: swapSource.date,
                          targetDate: d,
                        })}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/20 hover:border-foreground/30 hover:bg-foreground/5 transition-colors text-left disabled:opacity-50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground/80">
                            {format(d, "EEE, MMM d")}
                          </p>
                          <p className="text-[11px] text-foreground/40 truncate">
                            {target ? (target.day_label || `Day ${target.day_number}`) : "Rest day (will move here)"}
                          </p>
                        </div>
                        <ArrowLeftRight className="w-3.5 h-3.5 text-foreground/30 flex-shrink-0 ml-2" />
                      </button>
                    );
                  })}
              </div>
              {swapMutation.isPending && (
                <div className="flex items-center justify-center pt-2">
                  <Loader2 className="w-4 h-4 animate-spin text-foreground/40" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
        <DialogContent className="max-w-sm bg-background border-border/30">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground/50">Activity Name *</Label>
              <Input
                placeholder="e.g., Yoga, Pilates, Hiking..."
                value={activityForm.name}
                onChange={(e) => setActivityForm(p => ({ ...p, name: e.target.value }))}
                className="bg-foreground/[0.03] border-border/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground/50">Duration (min)</Label>
                <Input type="number" inputMode="numeric" placeholder="60" value={activityForm.duration} onChange={(e) => setActivityForm(p => ({ ...p, duration: e.target.value }))} className="bg-foreground/[0.03] border-border/20" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground/50">Calories</Label>
                <Input type="number" inputMode="numeric" placeholder="300" value={activityForm.calories} onChange={(e) => setActivityForm(p => ({ ...p, calories: e.target.value }))} className="bg-foreground/[0.03] border-border/20" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground/50">Notes</Label>
              <Textarea placeholder="How did it feel?" className="min-h-[60px] resize-none text-sm bg-foreground/[0.03] border-border/20" value={activityForm.notes} onChange={(e) => setActivityForm(p => ({ ...p, notes: e.target.value }))} maxLength={500} />
            </div>
            <Button
              variant="apollo"
              className="w-full"
              disabled={!activityForm.name.trim() || addActivityMutation.isPending}
              onClick={() => addActivityMutation.mutate({
                name: activityForm.name.trim(),
                duration: activityForm.duration ? parseInt(activityForm.duration) : null,
                calories: activityForm.calories ? parseInt(activityForm.calories) : null,
                notes: activityForm.notes,
              })}
            >
              {addActivityMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Activity
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardTraining;
