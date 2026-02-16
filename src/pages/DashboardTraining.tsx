import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, ChevronLeft, ChevronRight, RefreshCw, Loader2, Play, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
} from "date-fns";

// ── YouTube helpers ──────────────────────────────────────────────────
const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v");
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
    return null;
  } catch { return null; }
};

const getYouTubeThumbnail = (url: string): string | null => {
  const id = getYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
};

// ── Exercise Tile ────────────────────────────────────────────────────
interface ExerciseTileProps {
  exerciseName: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  muscleGroup?: string | null;
  notes?: string | null;
  onSwap: () => void;
}

const ExerciseTile = ({ exerciseName, sets, reps, restSeconds, muscleGroup, notes, onSwap }: ExerciseTileProps) => {
  const [videoOpen, setVideoOpen] = useState(false);

  const { data: exercise } = useQuery({
    queryKey: ["exercise-tile", exerciseName],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("title, video_url, description, thumbnail_url")
        .ilike("title", exerciseName)
        .maybeSingle();
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });

  const thumbnail = exercise?.video_url ? getYouTubeThumbnail(exercise.video_url) : exercise?.thumbnail_url;
  const embedUrl = exercise?.video_url
    ? `https://www.youtube-nocookie.com/embed/${getYouTubeVideoId(exercise.video_url)}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1&iv_load_policy=3&fs=1`
    : null;

  return (
    <>
      <div className="card-apollo overflow-hidden group hover:border-apollo-gold/50 transition-all">
        <button
          onClick={() => exercise?.video_url && setVideoOpen(true)}
          className="relative w-full aspect-video bg-muted overflow-hidden"
          disabled={!exercise?.video_url}
        >
          {thumbnail ? (
            <img src={thumbnail} alt={exerciseName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Dumbbell className="w-10 h-10 text-muted-foreground/20" />
            </div>
          )}
          {exercise?.video_url && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-14 h-14 rounded-full bg-apollo-gold flex items-center justify-center">
                <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3">
            <p className="font-heading text-sm text-white text-left truncate">{exerciseName}</p>
          </div>
        </button>

        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{sets} sets × {reps}</span>
              {restSeconds && <span>· {restSeconds}s rest</span>}
            </div>
            <Button variant="ghost" size="sm" onClick={onSwap} title="Swap exercise" className="h-7 w-7 p-0">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
          {muscleGroup && <Badge variant="secondary" className="text-[10px]">{muscleGroup}</Badge>}
          {notes && <p className="text-xs text-muted-foreground italic line-clamp-2">{notes}</p>}
        </div>
      </div>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-border/30">
          <DialogHeader className="p-4 pb-2 bg-background">
            <DialogTitle className="font-heading text-base tracking-wide">{exercise?.title || exerciseName}</DialogTitle>
            {exercise?.description && <p className="text-xs text-muted-foreground mt-1">{exercise.description}</p>}
          </DialogHeader>
          <div className="aspect-video w-full bg-black">
            {embedUrl && videoOpen ? (
              <iframe src={embedUrl} className="w-full h-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen title={exerciseName} style={{ border: 0 }} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ── Main Page ────────────────────────────────────────────────────────
const DashboardTraining = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [swappingExercise, setSwappingExercise] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [loadingSwap, setLoadingSwap] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);

  const currentWeekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  // Fetch plan + days
  const { data: planData } = useQuery({
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

  // Determine which day's exercises to show
  const today = new Date();
  const displayDate = selectedDayDate || today;
  const todayWorkout = getWorkoutForDate(displayDate);
  const isShowingToday = !selectedDayDate || isSameDay(selectedDayDate, today);

  const handleSwapExercise = async (exercise: any) => {
    setSwappingExercise(exercise);
    setLoadingSwap(true);
    setAlternatives([]);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-exercise-swap", {
        body: { exerciseName: exercise.exercise_name, muscleGroup: exercise.muscle_group },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAlternatives(data.alternatives || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingSwap(false);
    }
  };

  const confirmSwap = async (alt: any) => {
    if (!swappingExercise) return;
    const { error } = await (supabase as any)
      .from("training_plan_exercises")
      .update({
        exercise_name: alt.exercise_name,
        muscle_group: alt.muscle_group,
        notes: `Swapped from: ${swappingExercise.exercise_name}. ${alt.reason}`,
      })
      .eq("id", swappingExercise.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Exercise swapped!" });
    setSwappingExercise(null);
    queryClient.invalidateQueries({ queryKey: ["my-training-plan-full"] });
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* ── Today's Workout ─────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="font-heading text-2xl md:text-3xl mb-1">
            {isShowingToday ? "Today's" : format(displayDate, "EEEE's")}{" "}
            <span className="text-primary">Workout</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(displayDate, "EEEE, MMMM d")}
            {!isShowingToday && (
              <button
                onClick={() => setSelectedDayDate(null)}
                className="ml-2 text-primary hover:underline"
              >
                Back to today
              </button>
            )}
          </p>
        </div>

        {!planData ? (
          <div className="card-apollo p-8 text-center mb-8">
            <Dumbbell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-heading text-lg mb-2">No Training Program Yet</h3>
            <p className="text-muted-foreground text-sm">
              Your program will be generated after completing the questionnaire.
            </p>
          </div>
        ) : todayWorkout ? (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-heading text-lg">
                {todayWorkout.day_label || `Day ${todayWorkout.day_number}`}
              </h2>
              {todayWorkout.focus && (
                <Badge variant="outline" className="text-primary border-primary/30">
                  {todayWorkout.focus}
                </Badge>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayWorkout.training_plan_exercises
                ?.sort((a: any, b: any) => a.sort_order - b.sort_order)
                .map((ex: any) => (
                  <ExerciseTile
                    key={ex.id}
                    exerciseName={ex.exercise_name}
                    sets={ex.sets}
                    reps={ex.reps}
                    restSeconds={ex.rest_seconds}
                    muscleGroup={ex.muscle_group}
                    notes={ex.notes}
                    onSwap={() => handleSwapExercise(ex)}
                  />
                ))}
            </div>
          </div>
        ) : (
          <div className="card-apollo p-8 text-center mb-8">
            <Check className="w-10 h-10 text-green-500/50 mx-auto mb-3" />
            <h3 className="font-heading text-lg mb-1">Rest Day</h3>
            <p className="text-muted-foreground text-sm">No workout scheduled. Recovery is part of the plan.</p>
          </div>
        )}

        {/* ── Weekly Calendar Strip ───────────────────────────── */}
        <div className="card-apollo p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => subWeeks(d, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="font-heading text-sm text-muted-foreground">
              {format(currentWeekStart, "MMM d")} — {format(addDays(currentWeekStart, 6), "MMM d")}
            </h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => addWeeks(d, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Desktop: horizontal strip */}
          <div className="hidden md:grid grid-cols-7 gap-2">
            {weekDates.map((date) => {
              const workout = getWorkoutForDate(date);
              const isTodayDate = isToday(date);
              const isSelected = selectedDayDate && isSameDay(date, selectedDayDate);

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDayDate(date)}
                  className={`rounded-lg border p-3 text-center transition-all hover:border-primary/50 ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : isTodayDate
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <p className={`text-[10px] uppercase tracking-wider mb-1 ${isTodayDate ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    {format(date, "EEE")}
                  </p>
                  <p className={`text-lg font-heading ${isTodayDate ? "text-primary" : ""}`}>
                    {format(date, "d")}
                  </p>
                  {workout ? (
                    <div className="mt-2">
                      <Dumbbell className="w-3.5 h-3.5 text-primary mx-auto" />
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {workout.focus || workout.day_label || `Day ${workout.day_number}`}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/50 mt-2">Rest</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile: horizontal scrollable strip */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {weekDates.map((date) => {
              const workout = getWorkoutForDate(date);
              const isTodayDate = isToday(date);
              const isSelected = selectedDayDate && isSameDay(date, selectedDayDate);

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDayDate(date)}
                  className={`flex-shrink-0 w-[72px] rounded-lg border p-2.5 text-center transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : isTodayDate
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <p className={`text-[10px] uppercase tracking-wider mb-0.5 ${isTodayDate ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    {format(date, "EEE")}
                  </p>
                  <p className={`text-base font-heading ${isTodayDate ? "text-primary" : ""}`}>
                    {format(date, "d")}
                  </p>
                  {workout ? (
                    <Dumbbell className="w-3 h-3 text-primary mx-auto mt-1" />
                  ) : (
                    <p className="text-[9px] text-muted-foreground/40 mt-1">—</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Exercise Swap Dialog ────────────────────────────── */}
        <Dialog open={!!swappingExercise} onOpenChange={(open) => !open && setSwappingExercise(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Swap Exercise</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              Replace <strong>{swappingExercise?.exercise_name}</strong> with an alternative:
            </p>
            {loadingSwap ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Finding alternatives...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {alternatives.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => confirmSwap(alt)}
                    className="w-full text-left p-4 rounded-lg border border-border hover:border-primary/50 transition-all"
                  >
                    <p className="font-medium text-sm">{alt.exercise_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{alt.muscle_group}</Badge>
                      <Badge variant="outline" className="text-[10px]">{alt.difficulty}</Badge>
                      <span className="text-[10px] text-muted-foreground">{alt.movement_pattern}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alt.reason}</p>
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default DashboardTraining;
