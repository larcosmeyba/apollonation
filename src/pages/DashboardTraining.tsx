import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dumbbell, ChevronRight, Play, Plus, Flame,
  ChevronLeft, Loader2, Sparkles, ArrowLeftRight, Check,
} from "lucide-react";
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

  const { data: exerciseLibrary = [] } = useQuery({
    queryKey: ["exercise-library-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("title, video_url, thumbnail_url");
      return data || [];
    },
    staleTime: 1000 * 60 * 30,
  });

  const getExerciseVideo = (exerciseName: string) => {
    return exerciseLibrary.find(
      (e: any) => e.title?.toLowerCase() === exerciseName?.toLowerCase()
    );
  };

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


  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-display-md">Programs</h1>
            <p className="text-xs text-foreground/30 mt-0.5">Structured training programs</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-border/30 text-foreground/50 text-xs"
            onClick={() => setShowAddActivity(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Log Activity
          </Button>
        </div>

        {/* Browse Programs — Hero Section */}
        <TrainingProgramCards />

        {/* Weekly Calendar */}
        {planData && (
          <div className="rounded-xl border border-border/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/30" onClick={() => setCurrentDate(d => subWeeks(d, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-[10px] text-foreground/30 tracking-wider">
                {format(currentWeekStart, "MMM d")} — {format(addDays(currentWeekStart, 6), "MMM d")}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground/30" onClick={() => setCurrentDate(d => addWeeks(d, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              {weekDates.map((date) => {
                const workout = getWorkoutForDate(date);
                const isTodayDate = isToday(date);
                const dateStr = format(date, "yyyy-MM-dd");
                const isCompleted = completedSessions.some((s: any) => s.log_date === dateStr);

                return (
                  <Link
                    key={date.toISOString()}
                    to={workout ? `/dashboard/training/workout?day=${workout.id}&date=${dateStr}` : "#"}
                    onClick={(e) => !workout && e.preventDefault()}
                    className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-all ${
                      isTodayDate
                        ? "bg-foreground text-background"
                        : "text-foreground/30 hover:bg-foreground/5"
                    } ${!workout ? "opacity-30" : ""}`}
                  >
                    <span className="text-[10px] uppercase tracking-wider">{format(date, "EEE")}</span>
                    <span className="text-sm font-heading">{format(date, "d")}</span>
                    {isCompleted && <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-0.5" />}
                    {workout && !isCompleted && <div className="w-1.5 h-1.5 rounded-full bg-foreground/20 mt-0.5" />}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Workout */}
        {!planData ? (
          <div className="rounded-xl border border-border/20 p-8 text-center">
            <Dumbbell className="w-10 h-10 text-foreground/10 mx-auto mb-3" />
            <h3 className="font-heading text-base mb-1.5 text-foreground/70">No Active Program</h3>
            <p className="text-xs text-foreground/30 mb-4">
              Choose a program above to get started with structured training.
            </p>
          </div>
        ) : todayWorkout ? (
          <div className="rounded-xl border border-border/20 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-eyebrow uppercase text-foreground/25 mb-0.5">Today's Workout</p>
                <h2 className="font-heading text-lg text-foreground/80">
                  {todayWorkout.day_label || `Day ${todayWorkout.day_number}`}
                </h2>
                {todayWorkout.focus && (
                  <p className="text-[11px] text-foreground/30 font-light mt-0.5">{todayWorkout.focus}</p>
                )}
              </div>
              <Link to={`/dashboard/training/workout?day=${todayWorkout.id}&date=${logDateStr}`}>
                <Button variant="apollo" size="sm" className="gap-1.5 text-xs">
                  <Play className="w-3 h-3" /> Start
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border/20 overflow-hidden">
            <div className="relative h-28 overflow-hidden">
              <img src={stockBack} alt="Rest day" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
            </div>
            <div className="text-center py-5 px-4 -mt-4 relative z-10">
              <p className="font-heading text-base mb-1 text-foreground/70">Rest Day</p>
              <p className="text-xs text-foreground/30">Recovery is part of the process — pick one below.</p>
            </div>

            {/* Curated recovery activities */}
            <div className="px-4 pb-4 space-y-2">
              {[
                { name: "Foam Roll Flow", time: "10 min", desc: "Roll quads, glutes, lats, upper back. 30 sec each side." },
                { name: "Mobility Routine", time: "12 min", desc: "Hip openers, thoracic rotations, ankle circles, scap CARs." },
                { name: "Easy Walk", time: "20–30 min", desc: "Zone 2 walk outside or on the treadmill at 3.0 mph." },
                { name: "Box Breathing", time: "5 min", desc: "4-second inhale, 4 hold, 4 exhale, 4 hold. Reset your nervous system." },
                { name: "Full-Body Stretch", time: "10 min", desc: "Hold each stretch 30–45 sec. Focus on tight areas." },
                { name: "Sauna or Hot Shower", time: "15 min", desc: "Boost circulation and recovery. Hydrate after." },
              ].map((act) => (
                <div key={act.name} className="rounded-lg border border-border/20 p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-foreground/[0.04] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-foreground/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground/80">{act.name}</p>
                      <span className="text-[10px] text-foreground/40 uppercase tracking-wider">{act.time}</span>
                    </div>
                    <p className="text-[11px] text-foreground/50 mt-0.5 leading-relaxed">{act.desc}</p>
                  </div>
                </div>
              ))}
              <Link to="/dashboard/workouts?category=stretch" className="block pt-2">
                <Button variant="apollo-outline" size="sm" className="w-full gap-1.5 text-xs">
                  <Sparkles className="w-3 h-3" />
                  Browse guided recovery sessions
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* This Week's Workouts */}
        {planData && weekWorkouts.length > 0 && (
          <div className="rounded-xl border border-border/20 overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div>
                <p className="text-eyebrow uppercase text-foreground/25 mb-0.5">This Week</p>
                <h3 className="font-heading text-base text-foreground/80">Upcoming Workouts</h3>
              </div>
              <span className="text-[10px] text-foreground/30 uppercase tracking-wider">Tap ⇄ to swap</span>
            </div>
            <div className="divide-y divide-border/15">
              {weekWorkouts.map(({ date, day }) => {
                const dStr = format(date, "yyyy-MM-dd");
                const completed = completedSessions.some((s: any) => s.log_date === dStr);
                const isTodayRow = isToday(date);
                const muscles = muscleSummary(day);
                return (
                  <div
                    key={day.id}
                    className={`flex items-center gap-3 px-4 py-3 ${isTodayRow ? "bg-foreground/[0.03]" : ""}`}
                  >
                    <div className="w-10 text-center flex-shrink-0">
                      <p className="text-[9px] uppercase tracking-wider text-foreground/40">{format(date, "EEE")}</p>
                      <p className="font-heading text-base text-foreground/80 leading-tight">{format(date, "d")}</p>
                    </div>
                    <Link
                      to={`/dashboard/training/workout?day=${day.id}&date=${dStr}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground/85 truncate">
                          {day.day_label || `Day ${day.day_number}`}
                        </p>
                        {completed && <Check className="w-3 h-3 text-green-500 flex-shrink-0" />}
                      </div>
                      {(muscles || day.focus) && (
                        <p className="text-[11px] text-foreground/40 truncate mt-0.5">
                          {muscles || day.focus}
                        </p>
                      )}
                    </Link>
                    <button
                      onClick={() => setSwapSource({ day, date })}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground/80 hover:bg-foreground/5 transition-colors flex-shrink-0"
                      aria-label="Swap workout day"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
