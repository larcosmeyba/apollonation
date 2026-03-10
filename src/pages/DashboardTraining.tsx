import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dumbbell, ChevronRight, Clock, Check, Target,
  ChevronLeft, Plus, Flame, Calendar, Play,
} from "lucide-react";
import TrainingScheduleAdjust from "@/components/dashboard/TrainingScheduleAdjust";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v");
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
    if (url.includes("/shorts/")) {
      const m = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      return m ? m[1] : null;
    }
    return null;
  } catch { return null; }
};

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

  // Fetch plan + days
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

  // Fetch completed sessions this week
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

  // Custom activities
  const { data: customActivities = [] } = useQuery({
    queryKey: ["custom-activities", user?.id, logDateStr],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("custom_activity_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", logDateStr)
        .order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch exercise library for video lookups
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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl tracking-wide">Train</h1>
            <p className="text-sm text-muted-foreground mt-1">Your training program</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowAddActivity(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Log Activity
          </Button>
        </div>

        {/* Schedule Adjustment */}
        <TrainingScheduleAdjust />

        {/* Horizontal Calendar Strip */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentDate(d => subWeeks(d, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {format(currentWeekStart, "MMM d")} — {format(addDays(currentWeekStart, 6), "MMM d")}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentDate(d => addWeeks(d, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {weekDates.map((date) => {
              const workout = getWorkoutForDate(date);
              const isTodayDate = isToday(date);
              const dateStr = format(date, "yyyy-MM-dd");
              const isCompleted = completedSessions.some((s: any) => s.log_date === dateStr);
              const isSelected = isSameDay(date, today);

              return (
                <Link
                  key={date.toISOString()}
                  to={workout ? `/dashboard/training/workout?day=${workout.id}&date=${dateStr}` : "#"}
                  onClick={(e) => !workout && e.preventDefault()}
                  className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isTodayDate
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50"
                  } ${!workout ? "opacity-40" : ""}`}
                >
                  <span className="text-[10px] uppercase tracking-wider">{format(date, "EEE")}</span>
                  <span className="text-sm font-heading">{format(date, "d")}</span>
                  {isCompleted && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-0.5" />
                  )}
                  {workout && !isCompleted && (
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 mt-0.5" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* No plan state */}
        {!planData ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Dumbbell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-heading text-lg mb-2">No Training Program Yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Complete your questionnaire to get a personalized program.
            </p>
            <Link to="/questionnaire">
              <Button variant="apollo" size="sm">Complete Questionnaire</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Today's Workout — Exercise List with Videos */}
            {todayWorkout ? (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="section-label mb-1">Today's Workout</p>
                      <h2 className="font-heading text-xl tracking-wide">
                        {todayWorkout.day_label || `Day ${todayWorkout.day_number}`}
                      </h2>
                      {todayWorkout.focus && (
                        <Badge variant="outline" className="mt-1.5 text-foreground/70 border-border text-[10px]">
                          {todayWorkout.focus}
                        </Badge>
                      )}
                    </div>
                    <Link to={`/dashboard/training/workout?day=${todayWorkout.id}&date=${logDateStr}`}>
                      <Button variant="apollo" size="sm" className="gap-1.5">
                        <Dumbbell className="w-3.5 h-3.5" /> Start
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Exercise List */}
                <div className="divide-y divide-border/30">
                  {exercises.map((ex: any, i: number) => {
                    const exData = getExerciseVideo(ex.exercise_name);
                    const videoId = exData?.video_url ? getYouTubeVideoId(exData.video_url) : null;
                    const thumbnail = videoId
                      ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                      : exData?.thumbnail_url;

                    return (
                      <div key={ex.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary flex-shrink-0">
                          {i + 1}
                        </span>

                        {/* Video thumbnail */}
                        {thumbnail ? (
                          <div className="relative w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                            <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Play className="w-3 h-3 text-white" fill="currentColor" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-14 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                            <Dumbbell className="w-3.5 h-3.5 text-muted-foreground/40" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ex.exercise_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {ex.sets} × {ex.reps}{ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Start Workout CTA */}
                <div className="p-4 pt-2">
                  <Link to={`/dashboard/training/workout?day=${todayWorkout.id}&date=${logDateStr}`} className="block">
                    <Button variant="apollo" className="w-full">
                      <Dumbbell className="w-4 h-4 mr-2" /> Start Full Workout
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="font-heading text-lg mb-2">Rest Day</p>
                <p className="text-sm text-muted-foreground">Recovery is part of the process. Come back stronger.</p>
              </div>
            )}
          </>
        )}

        {/* Extra Activities */}
        {customActivities.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="section-label mb-3">Today's Activities</h3>
            <div className="space-y-2">
              {customActivities.map((activity: any) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-foreground/5 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.activity_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {activity.duration_minutes && <span>{activity.duration_minutes} min</span>}
                      {activity.calories_burned && <span>· {activity.calories_burned} cal</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 gap-3">
          <Link to="/dashboard/workouts">
            <div className="rounded-xl border border-border bg-card p-4 hover:border-foreground/20 transition-all text-center">
              <Dumbbell className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs font-medium">On Demand</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Add Activity Dialog */}
      <Dialog open={showAddActivity} onOpenChange={setShowAddActivity}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Activity Name *</Label>
              <Input
                placeholder="e.g., Yoga, Pilates, Hiking..."
                value={activityForm.name}
                onChange={(e) => setActivityForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (min)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="60"
                  value={activityForm.duration}
                  onChange={(e) => setActivityForm(p => ({ ...p, duration: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Calories</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="300"
                  value={activityForm.calories}
                  onChange={(e) => setActivityForm(p => ({ ...p, calories: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                placeholder="How did it feel?"
                className="min-h-[60px] resize-none text-sm"
                value={activityForm.notes}
                onChange={(e) => setActivityForm(p => ({ ...p, notes: e.target.value }))}
                maxLength={500}
              />
            </div>
            <Button
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
