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
  Dumbbell, ChevronLeft, RefreshCw, Loader2,
  Play, Check, Trophy, Sparkles, StickyNote,
  Clock, ArrowLeft, Upload, Watch, Image as ImageIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { format } from "date-fns";

// ── YouTube helpers ──────────────────────────────────────────────────
const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v");
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
    return null;
  } catch { return null; }
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

// ── Exercise Row ─────────────────────────────────────────────────────
interface ExerciseRowProps {
  exercise: any;
  dayId: string;
  logDate: string;
  userId: string;
  setLogs: SetLog[];
  previousSetLogs: SetLog[];
  exerciseNote: ExerciseNote | null;
  onSetLogChange: (exerciseId: string, setNumber: number, field: "weight" | "reps_completed", value: number | null) => void;
  onNoteChange: (exerciseId: string, note: string) => void;
  onToggleComplete: (exerciseId: string, completed: boolean) => void;
  onSwap: () => void;
}

const ExerciseRow = ({
  exercise, dayId, logDate, userId, setLogs, previousSetLogs,
  exerciseNote, onSetLogChange, onNoteChange, onToggleComplete, onSwap,
}: ExerciseRowProps) => {
  const [videoOpen, setVideoOpen] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);

  const isCompleted = exerciseNote?.is_completed || false;
  const totalSets = exercise.sets || 3;

  const { data: exerciseData } = useQuery({
    queryKey: ["exercise-tile", exercise.exercise_name],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("title, video_url, description, thumbnail_url")
        .ilike("title", exercise.exercise_name)
        .maybeSingle();
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });

  const isStorage = exerciseData?.video_url?.startsWith("storage:");
  const videoId = exerciseData?.video_url && !isStorage ? getYouTubeVideoId(exerciseData.video_url) : null;
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : exerciseData?.thumbnail_url;
  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1&iv_load_policy=3&fs=1`
    : null;

  return (
    <>
      <div className={`rounded-xl border bg-card overflow-hidden transition-all ${isCompleted ? "border-green-500/30 opacity-70" : "border-border"}`}>
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-2">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={(checked) => onToggleComplete(exercise.id, !!checked)}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className={`font-heading text-sm tracking-wide ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
              {exercise.exercise_name}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{totalSets} × {exercise.reps}</span>
              {exercise.rest_seconds ? <span>· {exercise.rest_seconds}s rest</span> : null}
              {exercise.muscle_group && <span>· <span className="capitalize">{exercise.muscle_group}</span></span>}
            </div>
          </div>
          {exerciseData?.video_url ? (
            <button
              onClick={() => setVideoOpen(true)}
              className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-border hover:border-foreground/30 transition-colors"
            >
              {thumbnail ? (
                <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Play className="w-4 h-4 text-foreground ml-0.5" fill="currentColor" />
              </div>
            </button>
          ) : (
            <Button variant="ghost" size="icon" onClick={onSwap} className="h-8 w-8">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {exercise.notes && (
          <div className="px-4 pb-1">
            <p className="text-[11px] text-muted-foreground italic">{exercise.notes}</p>
          </div>
        )}

        {/* Set Logging */}
        <div className="px-4 pb-3 pt-1">
          <div className="space-y-1.5">
            <div className="grid grid-cols-[28px_1fr_1fr] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              <span></span>
              <span>Weight</span>
              <span>Reps</span>
            </div>
            {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNum) => {
              const log = setLogs.find(l => l.set_number === setNum);
              const prevLog = previousSetLogs.find(l => l.set_number === setNum);
              return (
                <div key={setNum} className="grid grid-cols-[28px_1fr_1fr] gap-2 items-center">
                  <span className="text-xs font-heading text-muted-foreground text-center">{setNum}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder={prevLog?.weight ? String(prevLog.weight) : "—"}
                    className="h-8 text-xs text-center px-1"
                    value={log?.weight ?? ""}
                    onChange={(e) => onSetLogChange(exercise.id, setNum, "weight", e.target.value ? Number(e.target.value) : null)}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder={prevLog?.reps_completed ? String(prevLog.reps_completed) : (exercise.reps || "—")}
                    className="h-8 text-xs text-center px-1"
                    value={log?.reps_completed ?? ""}
                    onChange={(e) => onSetLogChange(exercise.id, setNum, "reps_completed", e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
              );
            })}
            {previousSetLogs.length > 0 && (
              <p className="text-[9px] text-muted-foreground/50 text-right pt-0.5">Placeholders = last session</p>
            )}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <button
            onClick={() => setNoteExpanded(!noteExpanded)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <StickyNote className="w-3 h-3" />
            {exerciseNote?.note ? "Edit note" : "Add note"}
          </button>
          {exerciseData?.video_url && (
            <Button variant="ghost" size="icon" onClick={onSwap} className="h-7 w-7">
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
        </div>

        {noteExpanded && (
          <div className="px-4 pb-4">
            <Textarea
              placeholder="Personal notes..."
              className="text-xs min-h-[40px] resize-none"
              value={exerciseNote?.note || ""}
              onChange={(e) => onNoteChange(exercise.id, e.target.value)}
              maxLength={500}
            />
          </div>
        )}
      </div>

      {/* Video Dialog */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border/30">
          <DialogHeader className="p-3 pb-2">
            <DialogTitle className="font-heading text-sm tracking-wide">{exerciseData?.title || exercise.exercise_name}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full bg-black">
            {isStorage && videoOpen ? (
              <StorageVideoPlayer storagePath={exerciseData!.video_url!.replace("storage:", "")} />
            ) : embedUrl && videoOpen ? (
              <iframe src={embedUrl} className="w-full h-full" allow="autoplay; encrypted-media; fullscreen" allowFullScreen title={exercise.exercise_name} style={{ border: 0 }} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ── Main Workout Detail Page ─────────────────────────────────────────
const DashboardWorkoutDetail = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dayId = searchParams.get("day");
  const dateParam = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const [localSetLogs, setLocalSetLogs] = useState<Record<string, SetLog[]>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, ExerciseNote>>({});
  const [swappingExercise, setSwappingExercise] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [loadingSwap, setLoadingSwap] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [watchScreenshot, setWatchScreenshot] = useState<File | null>(null);
  const [watchPreviewUrl, setWatchPreviewUrl] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  // Fetch day with exercises
  const { data: dayData } = useQuery({
    queryKey: ["training-day-detail", dayId],
    queryFn: async () => {
      if (!dayId) return null;
      const { data } = await (supabase as any)
        .from("training_plan_days")
        .select("*, training_plan_exercises(*), client_training_plans!training_plan_days_plan_id_fkey(title)")
        .eq("id", dayId)
        .single();
      return data;
    },
    enabled: !!dayId,
  });

  // Existing logs
  const { data: existingSetLogs } = useQuery({
    queryKey: ["exercise-set-logs", user?.id, dayId, dateParam],
    queryFn: async () => {
      if (!user || !dayId) return [];
      const { data } = await (supabase as any)
        .from("exercise_set_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("log_date", dateParam);
      return data || [];
    },
    enabled: !!user && !!dayId,
  });

  const { data: existingNotes } = useQuery({
    queryKey: ["exercise-user-notes", user?.id, dayId, dateParam],
    queryFn: async () => {
      if (!user || !dayId) return [];
      const { data } = await (supabase as any)
        .from("exercise_user_notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("log_date", dateParam);
      return data || [];
    },
    enabled: !!user && !!dayId,
  });

  // Previous session logs
  const { data: previousSetLogsRaw } = useQuery({
    queryKey: ["previous-set-logs", user?.id, dayId, dateParam],
    queryFn: async () => {
      if (!user || !dayId) return [];
      const { data } = await (supabase as any)
        .from("exercise_set_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .neq("log_date", dateParam)
        .order("log_date", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user && !!dayId,
    staleTime: 1000 * 60 * 30,
  });

  const previousSetLogs = useMemo(() => {
    if (!previousSetLogsRaw || previousSetLogsRaw.length === 0) return {};
    const latestDate = previousSetLogsRaw[0]?.log_date;
    const latestOnly = previousSetLogsRaw.filter((l: any) => l.log_date === latestDate);
    const grouped: Record<string, SetLog[]> = {};
    latestOnly.forEach((log: any) => {
      if (!grouped[log.training_plan_exercise_id]) grouped[log.training_plan_exercise_id] = [];
      grouped[log.training_plan_exercise_id].push({
        set_number: log.set_number,
        weight: log.weight ? Number(log.weight) : null,
        reps_completed: log.reps_completed,
      });
    });
    return grouped;
  }, [previousSetLogsRaw]);

  const { data: sessionLog } = useQuery({
    queryKey: ["workout-session-log", user?.id, dayId, dateParam],
    queryFn: async () => {
      if (!user || !dayId) return null;
      const { data } = await (supabase as any)
        .from("workout_session_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("log_date", dateParam)
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
      await (supabase as any)
        .from("exercise_set_logs")
        .delete()
        .eq("user_id", user.id)
        .eq("training_plan_exercise_id", exerciseId)
        .eq("set_number", setNumber)
        .eq("log_date", dateParam);

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
            log_date: dateParam,
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
          log_date: dateParam,
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
          log_date: dateParam,
          completed_at: new Date().toISOString(),
        }, { onConflict: "user_id,day_id,log_date" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-session-log"] });
      queryClient.invalidateQueries({ queryKey: ["completed-sessions-week"] });
    },
  });

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

    if (completed && dayData?.training_plan_exercises) {
      const exercises = dayData.training_plan_exercises;
      const allDone = exercises.every((ex: any) => {
        if (ex.id === exerciseId) return true;
        return localNotes[ex.id]?.is_completed || false;
      });
      if (allDone && !sessionLog?.completed_at) {
        saveSessionMutation.mutate();
        setTimeout(() => setShowComplete(true), 300);
      }
    }
  }, [localNotes, dayData, saveNoteMutation, saveSessionMutation, sessionLog]);

  // Swap
  const handleSwapExercise = async (exercise: any) => {
    setSwappingExercise(exercise);
    setLoadingSwap(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-exercise-swap", {
        body: { exerciseName: exercise.exercise_name, muscleGroup: exercise.muscle_group },
      });
      if (error) throw error;
      setAlternatives(data?.alternatives || []);
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
    queryClient.invalidateQueries({ queryKey: ["training-day-detail"] });
  };

  const exercises = dayData?.training_plan_exercises?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [];
  const totalExercises = exercises.length;
  const completedExercises = exercises.filter((ex: any) => localNotes[ex.id]?.is_completed).length;
  const progressPercent = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Back nav */}
        <Link
          to="/dashboard/training"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Train
        </Link>

        {!dayId ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Dumbbell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-heading text-lg mb-2">No Workout Selected</h3>
            <p className="text-muted-foreground text-sm">Go back and select a workout day to begin.</p>
          </div>
        ) : !dayData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : exercises.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Dumbbell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-heading text-lg mb-2">No Exercises Found</h3>
            <p className="text-muted-foreground text-sm">This workout day doesn't have exercises assigned yet. Your coach will update it soon.</p>
          </div>
        ) : null}

        {/* Day header */}
        {dayData && exercises.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="section-label mb-1">{dayData.client_training_plans?.title}</p>
                <h1 className="font-heading text-2xl tracking-wide">
                  {dayData.day_label || `Day ${dayData.day_number}`}
                </h1>
                {dayData.focus && (
                  <Badge variant="outline" className="mt-2 text-foreground/70 border-border">
                    {dayData.focus}
                  </Badge>
                )}
              </div>
              {sessionLog?.completed_at && (
                <div className="flex items-center gap-1.5 text-green-500 text-sm">
                  <Check className="w-4 h-4" /> Done
                </div>
              )}
            </div>

            {/* Progress */}
            {totalExercises > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">{completedExercises}/{totalExercises} exercises</span>
                  <span className="text-xs text-muted-foreground">{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Exercises */}
        {dayData && exercises.length > 0 && <div className="space-y-3">
          {exercises.map((ex: any) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              dayId={dayId || ""}
              logDate={dateParam}
              userId={user?.id || ""}
              setLogs={localSetLogs[ex.id] || []}
              previousSetLogs={previousSetLogs[ex.id] || []}
              exerciseNote={localNotes[ex.id] || null}
              onSetLogChange={handleSetLogChange}
              onNoteChange={handleNoteChange}
              onToggleComplete={handleToggleComplete}
              onSwap={() => handleSwapExercise(ex)}
            />
          ))}
        </div>}

        {/* Finish Workout Button */}
        {totalExercises > 0 && !sessionLog?.completed_at && (
          <Button
            variant="apollo"
            className="w-full gap-2 h-12"
            onClick={() => {
              saveSessionMutation.mutate();
              setTimeout(() => setShowComplete(true), 300);
            }}
            disabled={saveSessionMutation.isPending}
          >
            {saveSessionMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Finish Workout
          </Button>
        )}

        {sessionLog?.completed_at && !showComplete && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
            <p className="text-sm font-medium text-green-500 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" /> Workout Completed! 💪
            </p>
          </div>
        )}
      </div>

      {/* Workout Complete Dialog */}
      <Dialog open={showComplete} onOpenChange={setShowComplete}>
        <DialogContent className="max-w-sm text-center border-border overflow-hidden">
          <div className="py-8 space-y-5">
            <div className="mx-auto w-20 h-20 rounded-full bg-foreground flex items-center justify-center animate-[bounce_1s_ease-in-out_2]">
              <Trophy className="w-10 h-10 text-background" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-foreground" />
                <h2 className="font-heading text-2xl tracking-wide">Great Job!</h2>
                <Sparkles className="w-4 h-4 text-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                You just crushed <span className="text-foreground font-medium">{dayData?.day_label || `Day ${dayData?.day_number}`}</span>!
              </p>
              <p className="text-xs text-muted-foreground/70">
                Every rep counts. Stay consistent.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="apollo" onClick={() => { setShowComplete(false); navigate("/dashboard/training"); }}>
                Back to Train
              </Button>
              <Button variant="outline" onClick={() => { setShowComplete(false); navigate("/dashboard"); }}>
                Go Home
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Swap Dialog */}
      <Dialog open={!!swappingExercise} onOpenChange={(open) => !open && setSwappingExercise(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Swap Exercise</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Replace <strong>{swappingExercise?.exercise_name}</strong>:
          </p>
          {loadingSwap ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {alternatives.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => confirmSwap(alt)}
                  className="w-full text-left p-4 rounded-lg border border-border hover:border-foreground/30 transition-all"
                >
                  <p className="font-medium text-sm">{alt.exercise_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{alt.muscle_group}</Badge>
                  </div>
                  {alt.reason && <p className="text-xs text-muted-foreground mt-1">{alt.reason}</p>}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardWorkoutDetail;
