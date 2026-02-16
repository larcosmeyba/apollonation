import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dumbbell, ChevronLeft, ChevronRight, RefreshCw, Loader2,
  Play, Check, Trophy, Sparkles, StickyNote, ChevronDown, ChevronUp,
} from "lucide-react";
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

// ── Types ────────────────────────────────────────────────────────────
interface SetLog {
  set_number: number;
  weight: number | null;
  reps_completed: number | null;
}

interface ExerciseNote {
  note: string;
  is_completed: boolean;
}

// ── Exercise Tile with Logging ───────────────────────────────────────
interface ExerciseTileProps {
  exerciseName: string;
  exerciseId: string;
  dayId: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  muscleGroup?: string | null;
  notes?: string | null;
  logDate: string;
  userId: string;
  setLogs: SetLog[];
  exerciseNote: ExerciseNote | null;
  onSetLogChange: (exerciseId: string, setNumber: number, field: "weight" | "reps_completed", value: number | null) => void;
  onNoteChange: (exerciseId: string, note: string) => void;
  onToggleComplete: (exerciseId: string, completed: boolean) => void;
  onSwap: () => void;
}

const ExerciseTile = ({
  exerciseName, exerciseId, dayId, sets, reps, restSeconds, muscleGroup, notes,
  logDate, userId, setLogs, exerciseNote, onSetLogChange, onNoteChange, onToggleComplete, onSwap,
}: ExerciseTileProps) => {
  const [videoOpen, setVideoOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);

  const isCompleted = exerciseNote?.is_completed || false;
  const totalSets = sets || 3;

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

  const isStorage = exercise?.video_url?.startsWith("storage:");
  const embedUrl = exercise?.video_url && !isStorage
    ? `https://www.youtube-nocookie.com/embed/${getYouTubeVideoId(exercise.video_url)}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1&iv_load_policy=3&fs=1`
    : null;

  return (
    <>
      <div className={`card-apollo overflow-hidden transition-all ${isCompleted ? "border-green-500/40 bg-green-500/5 opacity-75" : ""}`}>
        {/* Compact header row */}
        <div className="flex items-center gap-3 p-3">
          <Checkbox
            id={`complete-${exerciseId}`}
            checked={isCompleted}
            onCheckedChange={(checked) => onToggleComplete(exerciseId, !!checked)}
            className="flex-shrink-0"
          />

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 min-w-0 text-left"
          >
            <p className={`font-heading text-sm leading-tight truncate ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
              {exerciseName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
              <span>{totalSets}×{reps}</span>
              {restSeconds ? <span>· {restSeconds}s rest</span> : null}
              {muscleGroup && <span>· <span className="capitalize">{muscleGroup}</span></span>}
            </div>
          </button>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            {exercise?.video_url && (
              <Button variant="ghost" size="sm" onClick={() => setVideoOpen(true)} className="h-7 w-7 p-0" title="Watch demo">
                <Play className="w-3.5 h-3.5 text-primary" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onSwap} title="Swap" className="h-7 w-7 p-0">
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-7 w-7 p-0">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Coach notes (always visible if present) */}
        {notes && !expanded && (
          <div className="px-3 pb-2">
            <p className="text-[11px] text-muted-foreground italic line-clamp-1">{notes}</p>
          </div>
        )}

        {/* Expandable section: set logging + notes */}
        {expanded && (
          <div className="px-3 pb-3 space-y-3 border-t border-border/40 pt-3">
            {notes && <p className="text-[11px] text-muted-foreground italic">{notes}</p>}

            {/* Set logging table */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-[28px_1fr_1fr] gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                <span></span>
                <span>lbs</span>
                <span>Reps</span>
              </div>
              {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNum) => {
                const log = setLogs.find(l => l.set_number === setNum);
                return (
                  <div key={setNum} className="grid grid-cols-[28px_1fr_1fr] gap-1.5 items-center">
                    <span className="text-[11px] font-heading text-muted-foreground text-center">{setNum}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="—"
                      className="h-8 text-xs text-center px-1"
                      value={log?.weight ?? ""}
                      onChange={(e) => onSetLogChange(exerciseId, setNum, "weight", e.target.value ? Number(e.target.value) : null)}
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder={reps || "—"}
                      className="h-8 text-xs text-center px-1"
                      value={log?.reps_completed ?? ""}
                      onChange={(e) => onSetLogChange(exerciseId, setNum, "reps_completed", e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Personal note */}
            <button
              onClick={() => setNoteExpanded(!noteExpanded)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <StickyNote className="w-3 h-3" />
              {exerciseNote?.note ? "View note" : "Add note"}
            </button>
            {noteExpanded && (
              <Textarea
                placeholder="Personal notes..."
                className="text-xs min-h-[50px] resize-none"
                value={exerciseNote?.note || ""}
                onChange={(e) => onNoteChange(exerciseId, e.target.value)}
                maxLength={500}
              />
            )}
          </div>
        )}
      </div>

      {/* Video Dialog */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black border-border/30">
          <DialogHeader className="p-4 pb-2 bg-background">
            <DialogTitle className="font-heading text-base tracking-wide">{exercise?.title || exerciseName}</DialogTitle>
            {exercise?.description && <p className="text-xs text-muted-foreground mt-1">{exercise.description}</p>}
          </DialogHeader>
          <div className="aspect-video w-full bg-black">
            {isStorage && videoOpen ? (
              <StorageVideoPlayer storagePath={exercise!.video_url!.replace("storage:", "")} />
            ) : embedUrl && videoOpen ? (
              <iframe src={embedUrl} className="w-full h-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen title={exerciseName} style={{ border: 0 }} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** Storage video player with signed URL */
const StorageVideoPlayer = ({ storagePath }: { storagePath: string }) => {
  const [bucket, ...pathParts] = storagePath.split("/");
  const filePath = pathParts.join("/");
  const { data: signedUrl } = useQuery({
    queryKey: ["signed-video", storagePath],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 1000 * 60 * 30,
  });
  if (!signedUrl) return <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  return <video src={signedUrl} controls autoPlay className="w-full h-full" />;
};

// ── Celebration Modal ────────────────────────────────────────────────
const WorkoutCompleteModal = ({ open, onClose, dayLabel }: { open: boolean; onClose: () => void; dayLabel: string }) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm text-center border-primary/30 overflow-hidden">
        <div className="relative py-6">
          {/* Animated background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 animate-pulse" />
          
          <div className="relative z-10 space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 animate-[bounce_1s_ease-in-out_2]">
              <Trophy className="w-10 h-10 text-primary-foreground" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="font-heading text-2xl tracking-wide">Great Job!</h2>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm">
                You just crushed <span className="text-foreground font-medium">{dayLabel}</span>!
              </p>
              <p className="text-xs text-muted-foreground/70">
                Every rep counts. Stay consistent and the results will follow.
              </p>
            </div>

            <div className="pt-2">
              <Button variant="apollo" onClick={onClose} className="px-8">
                Let's Go 💪
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const [showCelebration, setShowCelebration] = useState(false);

  // Local state for logging (batched saves)
  const [localSetLogs, setLocalSetLogs] = useState<Record<string, SetLog[]>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, ExerciseNote>>({});

  const today = new Date();
  const displayDate = selectedDayDate || today;
  const logDateStr = format(displayDate, "yyyy-MM-dd");
  const isShowingToday = !selectedDayDate || isSameDay(selectedDayDate, today);

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

  const todayWorkout = getWorkoutForDate(displayDate);
  const dayId = todayWorkout?.id;

  // Fetch existing logs for this day
  const { data: existingSetLogs } = useQuery({
    queryKey: ["exercise-set-logs", user?.id, dayId, logDateStr],
    queryFn: async () => {
      if (!user || !dayId) return [];
      const { data } = await (supabase as any)
        .from("exercise_set_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("log_date", logDateStr);
      return data || [];
    },
    enabled: !!user && !!dayId,
  });

  const { data: existingNotes } = useQuery({
    queryKey: ["exercise-user-notes", user?.id, dayId, logDateStr],
    queryFn: async () => {
      if (!user || !dayId) return [];
      const { data } = await (supabase as any)
        .from("exercise_user_notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("log_date", logDateStr);
      return data || [];
    },
    enabled: !!user && !!dayId,
  });

  const { data: sessionLog } = useQuery({
    queryKey: ["workout-session-log", user?.id, dayId, logDateStr],
    queryFn: async () => {
      if (!user || !dayId) return null;
      const { data } = await (supabase as any)
        .from("workout_session_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("log_date", logDateStr)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!dayId,
  });

  // Initialize local state from DB
  useEffect(() => {
    if (existingSetLogs) {
      const grouped: Record<string, SetLog[]> = {};
      existingSetLogs.forEach((log: any) => {
        if (!grouped[log.training_plan_exercise_id]) grouped[log.training_plan_exercise_id] = [];
        grouped[log.training_plan_exercise_id].push({
          set_number: log.set_number,
          weight: log.weight ? Number(log.weight) : null,
          reps_completed: log.reps_completed,
        });
      });
      setLocalSetLogs(grouped);
    }
  }, [existingSetLogs]);

  useEffect(() => {
    if (existingNotes) {
      const mapped: Record<string, ExerciseNote> = {};
      existingNotes.forEach((n: any) => {
        mapped[n.training_plan_exercise_id] = { note: n.note, is_completed: n.is_completed };
      });
      setLocalNotes(mapped);
    }
  }, [existingNotes]);

  // Save mutations
  const saveSetLogMutation = useMutation({
    mutationFn: async ({ exerciseId, setNumber, field, value }: { exerciseId: string; setNumber: number; field: string; value: number | null }) => {
      if (!user || !dayId) return;
      // Upsert: delete then insert for simplicity
      await (supabase as any)
        .from("exercise_set_logs")
        .delete()
        .eq("user_id", user.id)
        .eq("training_plan_exercise_id", exerciseId)
        .eq("set_number", setNumber)
        .eq("log_date", logDateStr);

      const currentLogs = localSetLogs[exerciseId] || [];
      const existing = currentLogs.find(l => l.set_number === setNumber);
      const newLog = { ...(existing || { set_number: setNumber, weight: null, reps_completed: null }), [field]: value };

      if (newLog.weight !== null || newLog.reps_completed !== null) {
        await (supabase as any)
          .from("exercise_set_logs")
          .insert({
            user_id: user.id,
            training_plan_exercise_id: exerciseId,
            day_id: dayId,
            set_number: setNumber,
            weight: newLog.weight,
            reps_completed: newLog.reps_completed,
            log_date: logDateStr,
          });
      }
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async ({ exerciseId, note, isCompleted }: { exerciseId: string; note: string; isCompleted: boolean }) => {
      if (!user || !dayId) return;
      await (supabase as any)
        .from("exercise_user_notes")
        .upsert({
          user_id: user.id,
          training_plan_exercise_id: exerciseId,
          day_id: dayId,
          log_date: logDateStr,
          note,
          is_completed: isCompleted,
        }, { onConflict: "user_id,training_plan_exercise_id,log_date" });
    },
  });

  const saveSessionMutation = useMutation({
    mutationFn: async () => {
      if (!user || !dayId) return;
      await (supabase as any)
        .from("workout_session_logs")
        .upsert({
          user_id: user.id,
          day_id: dayId,
          log_date: logDateStr,
          completed_at: new Date().toISOString(),
        }, { onConflict: "user_id,day_id,log_date" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-session-log"] });
    },
  });

  // Handlers
  const handleSetLogChange = useCallback((exerciseId: string, setNumber: number, field: "weight" | "reps_completed", value: number | null) => {
    setLocalSetLogs(prev => {
      const current = prev[exerciseId] || [];
      const existing = current.find(l => l.set_number === setNumber);
      if (existing) {
        return { ...prev, [exerciseId]: current.map(l => l.set_number === setNumber ? { ...l, [field]: value } : l) };
      }
      return { ...prev, [exerciseId]: [...current, { set_number: setNumber, weight: null, reps_completed: null, [field]: value }] };
    });
    saveSetLogMutation.mutate({ exerciseId, setNumber, field, value });
  }, [saveSetLogMutation]);

  const handleNoteChange = useCallback((exerciseId: string, note: string) => {
    setLocalNotes(prev => {
      const existing = prev[exerciseId] || { note: "", is_completed: false };
      return { ...prev, [exerciseId]: { ...existing, note } };
    });
    const isCompleted = localNotes[exerciseId]?.is_completed || false;
    saveNoteMutation.mutate({ exerciseId, note, isCompleted });
  }, [localNotes, saveNoteMutation]);

  const handleToggleComplete = useCallback((exerciseId: string, completed: boolean) => {
    setLocalNotes(prev => {
      const existing = prev[exerciseId] || { note: "", is_completed: false };
      return { ...prev, [exerciseId]: { ...existing, is_completed: completed } };
    });
    const note = localNotes[exerciseId]?.note || "";
    saveNoteMutation.mutate({ exerciseId, note, isCompleted: completed });

    // Check if all exercises are now complete
    if (completed && todayWorkout?.training_plan_exercises) {
      const exercises = todayWorkout.training_plan_exercises;
      const allDone = exercises.every((ex: any) => {
        if (ex.id === exerciseId) return true; // this one is being checked
        return localNotes[ex.id]?.is_completed || false;
      });
      if (allDone && !sessionLog?.completed_at) {
        saveSessionMutation.mutate();
        setTimeout(() => setShowCelebration(true), 300);
      }
    }
  }, [localNotes, todayWorkout, saveNoteMutation, saveSessionMutation, sessionLog]);

  // Swap logic
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

  // Progress indicator
  const totalExercises = todayWorkout?.training_plan_exercises?.length || 0;
  const completedExercises = todayWorkout?.training_plan_exercises?.filter(
    (ex: any) => localNotes[ex.id]?.is_completed
  ).length || 0;
  const progressPercent = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* ── Header ─────────────────────────────────── */}
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
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-heading text-lg">
                {todayWorkout.day_label || `Day ${todayWorkout.day_number}`}
              </h2>
              {todayWorkout.focus && (
                <Badge variant="outline" className="text-primary border-primary/30">
                  {todayWorkout.focus}
                </Badge>
              )}
            </div>

            {/* Progress bar */}
            {totalExercises > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">{completedExercises}/{totalExercises} exercises</span>
                  {sessionLog?.completed_at && (
                    <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">
                      <Check className="w-3 h-3 mr-1" /> Completed
                    </Badge>
                  )}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              {todayWorkout.training_plan_exercises
                ?.sort((a: any, b: any) => a.sort_order - b.sort_order)
                .map((ex: any) => (
                  <ExerciseTile
                    key={ex.id}
                    exerciseId={ex.id}
                    dayId={todayWorkout.id}
                    exerciseName={ex.exercise_name}
                    sets={ex.sets}
                    reps={ex.reps}
                    restSeconds={ex.rest_seconds}
                    muscleGroup={ex.muscle_group}
                    notes={ex.notes}
                    logDate={logDateStr}
                    userId={user?.id || ""}
                    setLogs={localSetLogs[ex.id] || []}
                    exerciseNote={localNotes[ex.id] || null}
                    onSetLogChange={handleSetLogChange}
                    onNoteChange={handleNoteChange}
                    onToggleComplete={handleToggleComplete}
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

          {/* Mobile: scrollable strip */}
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

        {/* ── Celebration Modal ───────────────────────────────── */}
        <WorkoutCompleteModal
          open={showCelebration}
          onClose={() => setShowCelebration(false)}
          dayLabel={todayWorkout?.day_label || todayWorkout?.focus || `Day ${todayWorkout?.day_number || ""}`}
        />
      </div>
    </DashboardLayout>
  );
};

export default DashboardTraining;
