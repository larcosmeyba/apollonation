import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dumbbell, ChevronRight, Play, Plus, Flame,
  ChevronLeft, Loader2,
} from "lucide-react";
import TrainingProgramCards from "@/components/dashboard/TrainingProgramCards";
import { Link } from "react-router-dom";
import {
  format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday,
} from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import stockBack from "@/assets/stock-back.png";

import { getYouTubeVideoId } from "@/utils/youtube";

const DashboardTraining = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({ name: "", duration: "", calories: "", notes: "" });

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

    const diffDays = Math.floor((date.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
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

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl tracking-wide">Programs</h1>
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
            <div className="p-4 pb-2 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-foreground/25 uppercase tracking-[0.25em] mb-0.5">Today's Workout</p>
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

            <div className="divide-y divide-border/10">
              {exercises.map((ex: any, i: number) => {
                const exData = getExerciseVideo(ex.exercise_name);
                const videoId = exData?.video_url ? getYouTubeVideoId(exData.video_url) : null;
                const thumbnail = videoId
                  ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                  : exData?.thumbnail_url;

                return (
                  <div key={ex.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-5 h-5 rounded-full bg-foreground/5 flex items-center justify-center text-[9px] text-foreground/30 flex-shrink-0">
                      {i + 1}
                    </span>

                    {thumbnail ? (
                      <div className="relative w-12 h-8 rounded-md overflow-hidden flex-shrink-0 border border-border/20">
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-2.5 h-2.5 text-white" fill="currentColor" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-8 rounded-md bg-foreground/[0.03] flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-3 h-3 text-foreground/15" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium truncate text-foreground/70">{ex.exercise_name}</p>
                      <p className="text-[10px] text-foreground/25">
                        {ex.sets} × {ex.reps}{ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 pt-2">
              <Link to={`/dashboard/training/workout?day=${todayWorkout.id}&date=${logDateStr}`} className="block">
                <Button variant="apollo" className="w-full text-xs">
                  Start Full Workout
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
              <p className="text-xs text-foreground/30">Recovery is part of the process.</p>
            </div>
          </div>
        )}
      </div>

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
