import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { useAccessControl } from "@/hooks/useAccessControl";
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
import DifficultyRating from "@/components/dashboard/DifficultyRating";
import { useAppleHealth } from "@/hooks/useAppleHealth";
import MuxVideo from "@/components/video/MuxVideo";



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

const DEFAULT_WARMUP_MOVES = [
  "Light walk or bike",
  "Arm circles + band pull-aparts",
  "Hip openers + leg swings",
  "Glute bridges + bodyweight squats",
];

const QuickWarmupCard = ({ complete, onComplete }: { complete: boolean; onComplete: () => void }) => (
  <div className={`rounded-xl border bg-card p-4 transition-all ${complete ? "border-green-500/30 opacity-80" : "border-border"}`}>
    <div className="flex items-start gap-3">
      <Checkbox checked={complete} onCheckedChange={() => onComplete()} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className={`font-heading text-sm tracking-wide ${complete ? "line-through text-muted-foreground" : ""}`}>
          5-Minute Dynamic Warm-Up
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Raise your temperature, open the joints, and activate today’s muscles before loading weight.
        </p>
        <div className="grid grid-cols-1 gap-2 mt-3">
          {DEFAULT_WARMUP_MOVES.map((move) => (
            <div key={move} className="flex items-center gap-2 text-xs text-foreground/80">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {move}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="w-3 h-3" /> 5 min
      </div>
    </div>
  </div>
);

// Format reps target — explicitly call out failure & ranges
const formatRepsTarget = (reps: any): string => {
  if (reps === null || reps === undefined || reps === "") return "AMRAP — to failure";
  const s = String(reps).trim();
  const lower = s.toLowerCase();
  if (
    lower.includes("fail") ||
    lower === "amrap" ||
    lower === "max" ||
    lower.includes("to failure")
  ) {
    return "To failure";
  }
  // Pure number → suggest a range (±2)
  const n = Number(s);
  if (!isNaN(n) && /^\d+$/.test(s)) {
    const low = Math.max(1, n - 2);
    return `${low}–${n + 2} reps`;
  }
  // Already a range like "8-12" or descriptive (e.g. "30 sec")
  if (/^\d+\s*[-–]\s*\d+$/.test(s)) return `${s.replace(/\s/g, "")} reps`;
  return s;
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
  // Muted + playsInline so the workout demo never hijacks the iOS/Android
  // audio session — users can keep their own music playing in the background.
  return <video src={signedUrl} controls autoPlay muted playsInline className="w-full h-full" />;
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
  dayLabel?: string;
  onSetLogChange: (exerciseId: string, setNumber: number, field: "weight" | "reps_completed", value: number | null) => void;
  onNoteChange: (exerciseId: string, note: string) => void;
  onToggleComplete: (exerciseId: string, completed: boolean) => void;
  onSwap: () => void;
}

// ── Inline Rest Timer ──────────────────────────────────────────────
const InlineRestTimer = ({ seconds }: { seconds: number }) => {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((p) => (p <= 1 ? 0 : p - 1));
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, timeLeft]);

  useEffect(() => { setTimeLeft(seconds); setRunning(true); }, [seconds]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const pct = ((seconds - timeLeft) / seconds) * 100;

  return (
    <div className="flex items-center gap-2 mt-1.5 px-1">
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${timeLeft === 0 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-[10px] font-mono font-medium ${timeLeft === 0 ? "text-green-500" : "text-muted-foreground"}`}>
        {timeLeft === 0 ? "GO!" : fmt(timeLeft)}
      </span>
      <button onClick={() => setRunning(!running)} className="text-[10px] text-muted-foreground hover:text-foreground">
        {running ? "⏸" : "▶"}
      </button>
    </div>
  );
};

const ExerciseRow = ({
  exercise, dayId, logDate, userId, setLogs, previousSetLogs,
  exerciseNote, dayLabel, onSetLogChange, onNoteChange, onToggleComplete, onSwap,
}: ExerciseRowProps) => {
  const { toast } = useToast();
  const [videoOpen, setVideoOpen] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [sendingQuestion, setSendingQuestion] = useState(false);

  const isCompleted = exerciseNote?.is_completed || false;
  const totalSets = exercise.sets || 3;

  useEffect(() => {
    if (isCompleted) {
      setJustCompleted(true);
      const t = setTimeout(() => setJustCompleted(false), 800);
      return () => clearTimeout(t);
    }
  }, [isCompleted]);

  const previousMaxWeight = Math.max(0, ...previousSetLogs.map((l) => l.weight ?? 0));
  const isPR = (weight: number | null) =>
    weight !== null && weight > previousMaxWeight && previousMaxWeight > 0;

  const { data: exerciseData } = useQuery({
    queryKey: ["exercise-tile", exercise.exercise_id || exercise.exercise_name],
    queryFn: async () => {
      // Prefer admin_exercises (canonical Mux library). Match by id first, then name.
      if (exercise.exercise_id) {
        const { data } = await supabase
          .from("admin_exercises")
          .select("name, coaching_notes, thumbnail_url, mux_playback_id")
          .eq("id", exercise.exercise_id)
          .maybeSingle();
        if (data) {
          return {
            title: data.name,
            video_url: null as string | null,
            description: data.coaching_notes,
            thumbnail_url: data.thumbnail_url,
            mux_playback_id: data.mux_playback_id,
          };
        }
      }
      // Exact name match first
      const { data: adminByName } = await supabase
        .from("admin_exercises")
        .select("name, coaching_notes, thumbnail_url, mux_playback_id")
        .ilike("name", exercise.exercise_name)
        .maybeSingle();
      if (adminByName) {
        return {
          title: adminByName.name,
          video_url: null as string | null,
          description: adminByName.coaching_notes,
          thumbnail_url: adminByName.thumbnail_url,
          mux_playback_id: adminByName.mux_playback_id,
        };
      }
      // Fuzzy fallback — strip equipment prefixes and match partial names
      const norm = (s: string) => s.toLowerCase()
        .replace(/^(barbell|dumbbell|cable|machine|smith)\s+/i, "")
        .replace(/\s+(press|fly|curl|raise|extension|row|pull|squat|lunge|deadlift)$/i, "");
      const fuzzyName = norm(exercise.exercise_name);
      const { data: fuzzyMatch } = await supabase
        .from("admin_exercises")
        .select("name, coaching_notes, thumbnail_url, mux_playback_id")
        .ilike("name", `%${fuzzyName}%`)
        .maybeSingle();
      if (fuzzyMatch) {
        return {
          title: fuzzyMatch.name,
          video_url: null as string | null,
          description: fuzzyMatch.coaching_notes,
          thumbnail_url: fuzzyMatch.thumbnail_url,
          mux_playback_id: fuzzyMatch.mux_playback_id,
        };
      }
      return null;
    },
    staleTime: 1000 * 60 * 30,
  });

  // Prefer the playback id already stored on the training_plan_exercises row
  // (set by the v2 generator). Fall back to the lookup result.
  const resolvedPlaybackId: string | null =
    (exercise.mux_playback_id as string | null) || (exerciseData?.mux_playback_id ?? null);
  const resolvedVideoUrl: string | null =
    (exercise.video_url as string | null) || (exerciseData?.video_url ?? null);

  const hasMux = !!resolvedPlaybackId;
  const isStorage = !hasMux && !!resolvedVideoUrl?.startsWith("storage:");
  const videoId = !hasMux && resolvedVideoUrl && !isStorage ? getYouTubeVideoId(resolvedVideoUrl) : null;
  const muxPoster = hasMux ? `https://image.mux.com/${resolvedPlaybackId}/thumbnail.jpg?width=320&fit_mode=preserve` : null;
  const thumbnail = exerciseData?.thumbnail_url || muxPoster || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null);
  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1&iv_load_policy=3&fs=1`
    : null;
  const hasAnyVideo = hasMux || !!resolvedVideoUrl;

  // Per-set coaching
  const targetMin = (exercise.target_reps_min as number | null) ?? null;
  const targetMax = (exercise.target_reps_max as number | null) ?? null;
  const progressionCue = (exercise.progression_cue as string | null) ?? null;
  const repsTargetLabel = formatRepsTarget(exercise.reps);
  const isToFailure = repsTargetLabel.toLowerCase().includes("failure");

  const getSetCue = (setNum: number, totalSets: number): string => {
    if (progressionCue) return progressionCue;
    if (targetMin && targetMax) {
      if (setNum === 1) return `Warm-up set — ${targetMin}–${targetMax} reps`;
      if (setNum === totalSets) return `Max effort — ${targetMin}–${targetMax} reps, push hard`;
      return `Working set — ${targetMin}–${targetMax} reps`;
    }
    if (isToFailure) return "To failure — as many reps as possible";
    return `Set ${setNum}/${totalSets}`;
  };

  const isSetLogged = (setNum: number) => {
    const log = setLogs.find((l) => l.set_number === setNum);
    return !!log && log.weight !== null && log.reps_completed !== null;
  };

  const sendQuestion = async () => {
    const note = (exerciseNote?.note || "").trim();
    if (!note) {
      toast({ title: "Type your question first" });
      return;
    }
    setSendingQuestion(true);
    try {
      const { error } = await supabase.functions.invoke("notify-coach-question", {
        body: {
          exerciseName: exercise.exercise_name,
          question: note,
          workoutLabel: dayLabel || "",
        },
      });
      if (error) throw error;
      toast({ title: "Question sent to coach", description: "Marcos will get back to you soon." });
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e.message, variant: "destructive" });
    } finally {
      setSendingQuestion(false);
    }
  };

  return (
    <>
      <div className={`rounded-2xl border overflow-hidden transition-all bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] active:scale-[0.99] ${isCompleted ? "border-primary/25" : "border-white/[0.05]"} ${justCompleted ? "ring-2 ring-primary/40 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.5)]" : ""}`}>
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-2">
          {/* Thumbnail with check overlay */}
          <button
            type="button"
            onClick={() => hasAnyVideo && setVideoOpen(true)}
            disabled={!hasAnyVideo}
            className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-white/[0.06] bg-[#0a0a0a] disabled:cursor-default"
            aria-label={hasAnyVideo ? "Play demo video" : "No video"}
          >
            {hasMux ? (
              <img
                src={`https://image.mux.com/${resolvedPlaybackId}/animated.gif?width=240&fps=12`}
                alt=""
                loading="lazy"
                className={`w-full h-full object-cover ${isCompleted ? "opacity-40" : ""}`}
                onError={(e) => {
                  // Fallback to static thumbnail if animated GIF fails
                  if (muxPoster) (e.currentTarget as HTMLImageElement).src = muxPoster;
                }}
              />
            ) : thumbnail ? (
              <img src={thumbnail} alt="" className={`w-full h-full object-cover ${isCompleted ? "opacity-40" : ""}`} loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-foreground/20" />
              </div>
            )}
            {hasAnyVideo && !isCompleted && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                <Play className="w-4 h-4 text-foreground ml-0.5" fill="currentColor" />
              </div>
            )}
            {isCompleted && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-[0_0_12px_hsl(var(--primary)/0.7)]">
                  <Check className="w-4 h-4 text-background" strokeWidth={3} />
                </div>
              </div>
            )}
          </button>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={isCompleted}
                onCheckedChange={(checked) => onToggleComplete(exercise.id, !!checked)}
                className="mt-1 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className={`font-heading text-sm tracking-tight leading-snug ${isCompleted ? "text-foreground/60" : "text-foreground"}`}>
                  {exercise.exercise_name}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] uppercase tracking-wider text-foreground/50 font-semibold flex-wrap">
                  <span className="tabular-nums">{totalSets} sets</span>
                  <span className="text-foreground/20">·</span>
                  <span className={isToFailure ? "text-primary" : "text-foreground/70"}>
                    {repsTargetLabel}
                  </span>
                  {isCompleted && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-bold tracking-wider">
                      COMPLETED
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right action icons */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={() => setNoteExpanded(!noteExpanded)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                exerciseNote?.note || noteExpanded
                  ? "bg-primary/15 text-primary"
                  : "bg-white/[0.03] border border-white/[0.06] text-foreground/50 hover:text-foreground"
              }`}
              aria-label="Question for coach"
            >
              <StickyNote className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onSwap}
              className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
              aria-label="Substitute exercise"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Coaching Cues */}
        {(exercise.notes || progressionCue) && (
          <div className="px-4 pb-1">
            <p className="text-[10px] text-primary/80 uppercase tracking-wider mb-0.5 font-bold">Coaching Cues</p>
            {progressionCue && (
              <p className="text-[11px] text-primary/70 italic leading-relaxed mb-1">{progressionCue}</p>
            )}
            {exercise.notes && (
              <p className="text-[11px] text-foreground/60 italic leading-relaxed">{exercise.notes}</p>
            )}
          </div>
        )}

        {/* Set Logging */}
        <div className="px-4 pb-3 pt-2">
          <div className="space-y-1.5">
            <div className="grid grid-cols-[20px_1fr_1fr_40px_22px] gap-1.5 text-[9px] uppercase tracking-[0.12em] text-foreground/40 font-semibold">
              <span></span>
              <span>Weight</span>
              <span>Reps</span>
              <span className="text-center">Rest</span>
              <span></span>
            </div>
            {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNum) => {
              const log = setLogs.find(l => l.set_number === setNum);
              const prevLog = previousSetLogs.find(l => l.set_number === setNum);
              const logged = isSetLogged(setNum);
              const setCue = getSetCue(setNum, totalSets);
              const repPlaceholder = isToFailure
                ? "AMRAP"
                : (targetMin && targetMax)
                  ? `${targetMin}–${targetMax}`
                  : (prevLog?.reps_completed ? String(prevLog.reps_completed) : "reps");
              return (
                <div key={setNum} className="relative">
                  {/* Per-set coaching cue */}
                  <div className="text-[9px] text-primary/70 uppercase tracking-wider mb-0.5 font-semibold">
                    Set {setNum}/{totalSets} · {setCue}
                  </div>
                  <div className="grid grid-cols-[20px_1fr_1fr_40px_22px] gap-1.5 items-center">
                    <span className="text-xs font-heading text-foreground/40 text-center tabular-nums">{setNum}</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder={prevLog?.weight ? String(prevLog.weight) : "lbs"}
                      className="h-9 text-xs text-center px-1 bg-white/[0.04] border-white/[0.08] rounded-lg focus-visible:ring-primary/40 focus-visible:border-primary/40"
                      value={log?.weight ?? ""}
                      onChange={(e) => onSetLogChange(exercise.id, setNum, "weight", e.target.value ? Number(e.target.value) : null)}
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder={repPlaceholder}
                      className="h-9 text-xs text-center px-1 bg-white/[0.04] border-white/[0.08] rounded-lg focus-visible:ring-primary/40 focus-visible:border-primary/40"
                      value={log?.reps_completed ?? ""}
                      onChange={(e) => {
                        onSetLogChange(exercise.id, setNum, "reps_completed", e.target.value ? Number(e.target.value) : null);
                        if (e.target.value) setShowTimer(true);
                      }}
                    />
                    <span className="text-[10px] text-foreground/40 text-center font-mono tabular-nums">
                      {exercise.rest_seconds ? `${exercise.rest_seconds}s` : "—"}
                    </span>
                    <div className="flex items-center justify-center">
                      {logged ? (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center transition-all animate-in zoom-in duration-200 shadow-[0_0_8px_hsl(var(--primary)/0.5)]">
                          <Check className="w-3 h-3 text-background" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/10" />
                      )}
                    </div>
                    {isPR(log?.weight ?? null) && (
                      <span className="absolute -right-1 -top-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider bg-primary text-background shadow-[0_0_8px_hsl(var(--primary)/0.6)]">
                        PR
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {showTimer && exercise.rest_seconds && (
              <InlineRestTimer seconds={exercise.rest_seconds} />
            )}
            {previousSetLogs.length > 0 && (
              <p className="text-[9px] text-foreground/30 text-right pt-0.5 uppercase tracking-wider">Placeholders = last session</p>
            )}
          </div>
        </div>

        {noteExpanded && (
          <div className="px-4 pb-4 pt-1 space-y-2 border-t border-white/[0.04] mt-1">
            <Textarea
              placeholder="Ask Marcos anything about this exercise — form, weight, alternatives..."
              className="text-xs min-h-[60px] resize-none bg-white/[0.04] border-white/[0.08] rounded-lg"
              value={exerciseNote?.note || ""}
              onChange={(e) => onNoteChange(exercise.id, e.target.value)}
              maxLength={500}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="apollo"
                className="h-7 text-[11px] gap-1.5 rounded-full px-4"
                disabled={sendingQuestion || !(exerciseNote?.note || "").trim()}
                onClick={sendQuestion}
              >
                {sendingQuestion ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Send to Coach
              </Button>
            </div>
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
            {hasMux && videoOpen ? (
              <MuxVideo
                playbackId={resolvedPlaybackId!}
                title={exerciseData?.title || exercise.exercise_name}
                videoId={exercise.id}
                autoPlay
                muted
                playsInline
                controls
              />
            ) : isStorage && videoOpen ? (
              <StorageVideoPlayer storagePath={resolvedVideoUrl!.replace("storage:", "")} />
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
  const { canAccessWorkout, recordWorkoutUsage, hasPremiumAccess, freeWorkoutsRemaining, loading: accessLoading } = useAccessControl();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { sync: syncAppleHealth, available: healthAvailable, connected: healthConnected, writeWorkout: writeAppleHealthWorkout } = useAppleHealth();

  const [searchParams] = useSearchParams();
  const dayId = searchParams.get("day");
  const dateParam = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  // Gate: free users beyond their workout quota redirect to /subscribe
  useEffect(() => {
    if (accessLoading) return;
    if (!canAccessWorkout()) {
      navigate("/subscribe?reason=workouts", { replace: true });
    }
  }, [accessLoading, canAccessWorkout, navigate]);

  const [localSetLogs, setLocalSetLogs] = useState<Record<string, SetLog[]>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, ExerciseNote>>({});
  const [swappingExercise, setSwappingExercise] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [loadingSwap, setLoadingSwap] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [watchScreenshot, setWatchScreenshot] = useState<File | null>(null);
  const [watchPreviewUrl, setWatchPreviewUrl] = useState<string | null>(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [savingDifficulty, setSavingDifficulty] = useState(false);
  const [quickWarmupComplete, setQuickWarmupComplete] = useState(false);

  const quickWarmupKey = `apollo:quick-warmup:${dayId || "none"}:${dateParam}`;

  useEffect(() => {
    setQuickWarmupComplete(localStorage.getItem(quickWarmupKey) === "true");
  }, [quickWarmupKey]);

  const toggleQuickWarmup = () => {
    setQuickWarmupComplete((prev) => {
      const next = !prev;
      localStorage.setItem(quickWarmupKey, String(next));
      return next;
    });
  };

  const saveDifficultyAndRecommend = async (rating: number) => {
    if (!user || !dayId) return;
    setSavingDifficulty(true);
    try {
      await (supabase as any)
        .from("workout_session_logs")
        .update({ difficulty_rating: rating })
        .eq("user_id", user.id)
        .eq("day_id", dayId)
        .eq("log_date", dateParam);

      // Generate a smart recommendation
      const focus = dayData?.focus || dayData?.day_label || "training";
      let reason = "";
      let recommended = "";
      if (rating <= 4) {
        reason = `Last ${focus} session felt too easy (${rating}/10). Push heavier weights or add a set next time.`;
        recommended = `Progressive Overload: ${focus}`;
      } else if (rating >= 8) {
        reason = `Last ${focus} session was brutal (${rating}/10). Drop intensity 10% or focus on recovery.`;
        recommended = `Recovery & Mobility`;
      } else {
        reason = `${focus} effort was dialed in (${rating}/10). Keep this load and add reps next time.`;
        recommended = `Maintain & Build: ${focus}`;
      }
      await (supabase as any).from("workout_recommendations").insert({
        user_id: user.id,
        recommended_workout: recommended,
        reason,
        category: focus,
        source_session_id: null,
      });
      toast({ title: "Saved!", description: "Smart Coach updated your next plan." });
    } catch (e: any) {
      toast({ title: "Couldn't save rating", description: e.message, variant: "destructive" });
    } finally {
      setSavingDifficulty(false);
    }
  };

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
    mutationFn: async ({ exerciseId, setNumber, weight, reps }: { exerciseId: string; setNumber: number; weight: number | null; reps: number | null }) => {
      if (!user || !dayId) return;
      if (weight === null && reps === null) {
        await (supabase as any)
          .from("exercise_set_logs")
          .delete()
          .eq("user_id", user.id)
          .eq("training_plan_exercise_id", exerciseId)
          .eq("set_number", setNumber)
          .eq("log_date", dateParam);
        return;
      }
      await (supabase as any)
        .from("exercise_set_logs")
        .upsert({
          user_id: user.id,
          training_plan_exercise_id: exerciseId,
          day_id: dayId,
          set_number: setNumber,
          weight,
          reps_completed: reps,
          log_date: dateParam,
        }, { onConflict: "user_id,training_plan_exercise_id,log_date,set_number" });
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

  const [logging, setLogging] = useState(false);
  const saveSessionMutation = useMutation({
    mutationFn: async () => {
      if (!user || !dayId) return;
      const startedAtIso = new Date().toISOString();
      await (supabase as any)
        .from("workout_session_logs")
        .upsert({
          user_id: user.id,
          day_id: dayId,
          log_date: dateParam,
          completed_at: startedAtIso,
        }, { onConflict: "user_id,day_id,log_date" });

      // If this day maps to a scheduled program workout, close it out via RPC.
      try {
        const { data: upw } = await (supabase as any)
          .from("user_program_workouts")
          .select("id")
          .eq("user_id", user.id)
          .eq("scheduled_date", dateParam)
          .neq("status", "completed")
          .order("scheduled_date", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (upw?.id) {
          const exCount = (dayData?.training_plan_exercises || []).length;
          const estDuration = dayData?.duration_minutes || (exCount > 0 ? Math.max(20, exCount * 4) : 30);
          await (supabase as any).rpc("complete_program_workout", {
            p_user_program_workout_id: upw.id,
            p_duration: estDuration,
            p_calories: null,
          });
          queryClient.invalidateQueries({ queryKey: ["user-program-progress"] });
        }
      } catch (err) {
        console.warn("[program] complete_program_workout skipped", err);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-session-log"] });
      queryClient.invalidateQueries({ queryKey: ["completed-sessions-week"] });
      queryClient.invalidateQueries({ queryKey: ["completed-sessions-all"] });
      // Increment free-tier counter (no-op for premium users).
      void recordWorkoutUsage();
      // Pull the latest workout/HR/calories from Apple Health so this session
      // picks up Apple Watch data without a manual refresh.
      if (healthAvailable && healthConnected) {
        void syncAppleHealth({ silent: true });
        // Best-effort: write this completed Apollo session to Apple Health.
        // No-ops gracefully on plugin versions without writeWorkout support.
        const exCount = (dayData?.training_plan_exercises || []).length;
        const estMinutes = dayData?.duration_minutes || (exCount > 0 ? Math.max(20, exCount * 4) : 30);
        const end = new Date();
        const start = new Date(end.getTime() - estMinutes * 60_000);
        void writeAppleHealthWorkout({
          startDate: start,
          endDate: end,
          calories: Math.round(estMinutes * 6),
          activityType: "functional-strength-training",
        });
      }
    },
    onSettled: () => {
      setLogging(false);
    },
  });


  // Per-(exerciseId,setNumber) debounce timers so rapid typing only fires the final upsert.
  const setLogTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleSetLogChange = useCallback((exerciseId: string, setNumber: number, field: "weight" | "reps_completed", value: number | null) => {
    let nextWeight: number | null = null;
    let nextReps: number | null = null;
    setLocalSetLogs(prev => {
      const current = prev[exerciseId] || [];
      const existing = current.find(l => l.set_number === setNumber);
      const merged = existing
        ? { ...existing, [field]: value }
        : { set_number: setNumber, weight: null, reps_completed: null, [field]: value };
      nextWeight = (merged as any).weight ?? null;
      nextReps = (merged as any).reps_completed ?? null;
      if (existing) {
        return { ...prev, [exerciseId]: current.map(l => l.set_number === setNumber ? merged : l) };
      }
      return { ...prev, [exerciseId]: [...current, merged] };
    });

    const key = `${exerciseId}:${setNumber}`;
    if (setLogTimersRef.current[key]) clearTimeout(setLogTimersRef.current[key]);
    setLogTimersRef.current[key] = setTimeout(() => {
      saveSetLogMutation.mutate({ exerciseId, setNumber, weight: nextWeight, reps: nextReps });
      delete setLogTimersRef.current[key];
    }, 400);
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
      const next = { ...prev, [exerciseId]: { ...existing, is_completed: completed } };
      saveNoteMutation.mutate({ exerciseId, note: existing.note, isCompleted: completed });
      if (completed && dayData?.training_plan_exercises && !sessionLog?.completed_at) {
        const allDone = dayData.training_plan_exercises.every((ex: any) => next[ex.id]?.is_completed);
        if (allDone) {
          saveSessionMutation.mutate();
          setTimeout(() => setShowComplete(true), 300);
        }
      }
      return next;
    });
  }, [dayData, sessionLog, saveNoteMutation, saveSessionMutation]);

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

  // Group into Warm-Up / Main / Cool-Down blocks
  const blockOf = (ex: any): "warmup" | "main" | "cooldown" => {
    const mg = (ex.muscle_group || "").toLowerCase();
    const name = (ex.exercise_name || "").toLowerCase();
    if (mg === "warmup" || mg === "warm-up" || /warm[- ]?up/.test(name)) return "warmup";
    if (mg === "cooldown" || mg === "cool-down" || /cool[- ]?down|stretch/.test(name)) return "cooldown";
    return "main";
  };

  const exercises = dayData?.training_plan_exercises?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [];
  const hasGeneratedWarmup = exercises.some((ex: any) => blockOf(ex) === "warmup");
  const quickWarmupCount = exercises.length > 0 && !hasGeneratedWarmup ? 1 : 0;
  const totalExercises = exercises.length + quickWarmupCount;
  const completedExercises = exercises.filter((ex: any) => localNotes[ex.id]?.is_completed).length + (quickWarmupCount && quickWarmupComplete ? 1 : 0);
  const progressPercent = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
  const displayCompleted = sessionLog?.completed_at ? totalExercises : completedExercises;
  const displayPercent = sessionLog?.completed_at ? 100 : progressPercent;
  const warmupExercises = exercises.filter((ex: any) => blockOf(ex) === "warmup");
  const mainExercises = exercises.filter((ex: any) => blockOf(ex) === "main");
  const cooldownExercises = exercises.filter((ex: any) => blockOf(ex) === "cooldown");
  const allDoneIn = (list: any[]) => list.length > 0 && list.every((ex: any) => localNotes[ex.id]?.is_completed);
  const warmupDone = warmupExercises.length === 0 ? quickWarmupComplete : allDoneIn(warmupExercises);
  const mainDone = mainExercises.length === 0 || allDoneIn(mainExercises);

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

        {!hasPremiumAccess && freeWorkoutsRemaining <= 3 && freeWorkoutsRemaining > 0 && (
          <div className="rounded-lg bg-muted px-4 py-2.5 text-xs text-muted-foreground">
            You have {freeWorkoutsRemaining} free workout{freeWorkoutsRemaining === 1 ? "" : "s"} left.
          </div>
        )}

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
        {dayData && exercises.length > 0 && (() => {
          // Derive a clean "Week N · Day M" from day_number (assume 7-day cycle).
          const dn = Number(dayData.day_number) || 1;
          const weekNum = Math.max(1, Math.ceil(dn / 7));
          const dayInWeek = ((dn - 1) % 7) + 1;
          // Strip leading "Week X" / "Day X" prefixes from day_label to avoid "Week 2 - Week 1 - Day 1".
          const cleanLabel = (dayData.day_label || "")
            .replace(/^\s*week\s*\d+\s*[-–·:]?\s*/i, "")
            .replace(/^\s*day\s*\d+\s*[-–·:]?\s*/i, "")
            .trim();
          const titleLine = cleanLabel || dayData.focus || `Day ${dn}`;
          return (
            <div className="rounded-2xl border border-white/[0.05] p-5 bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] shadow-[0_8px_30px_-15px_rgba(0,0,0,0.6)]">
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold mb-1.5">
                    Week {weekNum} · Day {dayInWeek}
                  </p>
                  <h1 className="font-heading text-2xl tracking-tight text-foreground leading-tight">
                    {titleLine}
                  </h1>
                  {dayData.focus && cleanLabel && (
                    <Badge variant="outline" className="mt-2 text-foreground/70 border-white/10 bg-white/[0.03]">
                      {dayData.focus}
                    </Badge>
                  )}
                </div>
                {sessionLog?.completed_at && (
                  <div className="flex items-center gap-1.5 text-primary text-xs uppercase tracking-wider font-bold flex-shrink-0">
                    <Check className="w-4 h-4" /> Done
                  </div>
                )}
              </div>

              {/* Progress */}
              {totalExercises > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-semibold tabular-nums">{displayCompleted}/{totalExercises} exercises</span>
                    <span className="text-[10px] uppercase tracking-wider text-primary font-bold tabular-nums">{Math.round(displayPercent)}%</span>
                  </div>
                  <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                      style={{ width: `${displayPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Blocks: Warm-Up → Main → Cool-Down */}
        {dayData && exercises.length > 0 && (
          <div className="space-y-6">
            {[
              { key: "warmup", title: "Warm-Up Block", duration: "5 min", subtitle: "Prep your body", list: warmupExercises, locked: false, doneCount: hasGeneratedWarmup ? warmupExercises.filter((ex: any) => localNotes[ex.id]?.is_completed).length : (quickWarmupComplete ? 1 : 0), complete: warmupDone },
              { key: "main", title: "Main Workout", duration: `~${Math.max(20, mainExercises.length * 4)} min`, subtitle: "Today's training", list: mainExercises, locked: !warmupDone, doneCount: mainExercises.filter((ex: any) => localNotes[ex.id]?.is_completed).length, complete: mainDone },
              { key: "cooldown", title: "Cool-Down Block", duration: "5 min", subtitle: "Stretches for today's muscles", list: cooldownExercises, locked: !warmupDone || !mainDone, doneCount: cooldownExercises.filter((ex: any) => localNotes[ex.id]?.is_completed).length, complete: allDoneIn(cooldownExercises) },
            ].map((block) => {
              const total = block.key === "warmup" && !hasGeneratedWarmup ? 1 : block.list.length;
              return (block.list.length > 0 || block.key === "warmup") && (
              <div key={block.key} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${block.complete ? "bg-primary shadow-[0_0_6px_hsl(var(--primary))]" : "bg-primary/40"}`} />
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-foreground/80">{block.title}</p>
                      <p className="text-[10px] text-foreground/40 uppercase tracking-wider mt-0.5">{block.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-primary tabular-nums">
                      {block.doneCount}/{total}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] uppercase tracking-wider text-foreground/60 inline-flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {block.duration}
                    </span>
                  </div>
                </div>
                <div className={`relative space-y-3 ${block.locked ? "opacity-50 pointer-events-none select-none" : ""}`}>
                  {block.key === "warmup" && !hasGeneratedWarmup ? (
                    <QuickWarmupCard complete={quickWarmupComplete} onComplete={toggleQuickWarmup} />
                  ) : block.list.map((ex: any) => (
                    <ExerciseRow
                      key={ex.id}
                      exercise={ex}
                      dayId={dayId || ""}
                      logDate={dateParam}
                      userId={user?.id || ""}
                      setLogs={localSetLogs[ex.id] || []}
                      previousSetLogs={previousSetLogs[ex.id] || []}
                      exerciseNote={localNotes[ex.id] || null}
                      dayLabel={dayData?.day_label || (dayData?.day_number ? `Day ${dayData.day_number}` : "")}
                      onSetLogChange={handleSetLogChange}
                      onNoteChange={handleNoteChange}
                      onToggleComplete={handleToggleComplete}
                      onSwap={() => handleSwapExercise(ex)}
                    />
                  ))}
                  {block.locked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="px-4 py-2 rounded-full bg-background/90 border border-border text-[11px] text-foreground/70 backdrop-blur">
                        {block.key === "main" ? "Complete the warm-up to unlock" : "Complete the main workout to unlock"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );})}
          </div>
        )}

        {sessionLog?.completed_at && !showComplete && (
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/25 text-center">
            <p className="text-sm font-bold text-primary flex items-center justify-center gap-2 uppercase tracking-wider">
              <Trophy className="w-4 h-4" /> Workout Completed
            </p>
          </div>
        )}

        {/* Spacer so sticky bar doesn't cover content */}
        {totalExercises > 0 && !sessionLog?.completed_at && <div className="h-20" />}
      </div>

      {/* Sticky Finish Workout Bar */}
      {totalExercises > 0 && !sessionLog?.completed_at && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/95 to-transparent backdrop-blur-md pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <Button
              variant="apollo"
              className="w-full gap-2 h-12 rounded-2xl shadow-[0_8px_30px_-6px_hsl(var(--primary)/0.55)] font-bold uppercase tracking-wider text-xs"
              onClick={() => {
                if (logging || saveSessionMutation.isPending) return;
                setLogging(true);
                saveSessionMutation.mutate();
                setTimeout(() => setShowComplete(true), 300);
              }}
              disabled={logging || saveSessionMutation.isPending}
            >
              {(logging || saveSessionMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Mark Workout Complete
            </Button>
          </div>
        </div>
      )}

      {/* Workout Complete Dialog with Watch Screenshot Upload */}
      <Dialog open={showComplete} onOpenChange={(open) => {
        if (!open) {
          setShowComplete(false);
          setWatchScreenshot(null);
          setWatchPreviewUrl(null);
        }
      }}>
        <DialogContent className="max-w-sm text-center border-border overflow-hidden">
          <div className="py-6 space-y-5">
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
            </div>

            {/* Difficulty rating - Smart Coach */}
            <DifficultyRating
              value={difficulty}
              onChange={setDifficulty}
              onSave={() => saveDifficultyAndRecommend(difficulty ?? 5)}
              saving={savingDifficulty}
            />

            {/* Apple Watch Screenshot Upload */}
            <div className="mx-4 p-4 rounded-xl border border-border bg-muted/30 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm font-medium">
                <Watch className="w-4 h-4 text-primary" />
                <span>Upload Watch Screenshot</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Share your Apple Watch heart rate & calories burned screenshot so your coach can track your effort!
              </p>

              {watchPreviewUrl ? (
                <div className="relative">
                  <img
                    src={watchPreviewUrl}
                    alt="Watch screenshot preview"
                    className="w-full max-h-48 object-contain rounded-lg border border-border"
                  />
                  <button
                    onClick={() => { setWatchScreenshot(null); setWatchPreviewUrl(null); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-foreground/30 cursor-pointer transition-colors">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground">Tap to upload screenshot</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
                          return;
                        }
                        setWatchScreenshot(file);
                        setWatchPreviewUrl(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              )}
            </div>

            <div className="flex flex-col gap-2 px-4 pt-2">
              {watchScreenshot && (
                <Button
                  variant="apollo"
                  className="w-full gap-2"
                  disabled={uploadingScreenshot}
                  onClick={async () => {
                    if (!user || !dayId || !watchScreenshot) return;
                    setUploadingScreenshot(true);
                    try {
                      const ext = watchScreenshot.name.split(".").pop() || "jpg";
                      const filePath = `${user.id}/${dayId}_${dateParam}.${ext}`;
                      const { error: uploadError } = await supabase.storage
                        .from("workout-screenshots")
                        .upload(filePath, watchScreenshot, { upsert: true });
                      if (uploadError) throw uploadError;

                      await (supabase as any)
                        .from("workout_session_logs")
                        .update({ watch_screenshot_url: filePath })
                        .eq("user_id", user.id)
                        .eq("day_id", dayId)
                        .eq("log_date", dateParam);

                      toast({ title: "Screenshot uploaded!", description: "Your coach will review your effort 💪" });
                      queryClient.invalidateQueries({ queryKey: ["workout-session-log"] });
                      setShowComplete(false);
                      setWatchScreenshot(null);
                      setWatchPreviewUrl(null);
                      navigate("/dashboard/training");
                    } catch (err: any) {
                      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                    } finally {
                      setUploadingScreenshot(false);
                    }
                  }}
                >
                  {uploadingScreenshot ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Save & Continue</>
                  )}
                </Button>
              )}
              <div className="flex gap-3 justify-center">
                <Button variant={watchScreenshot ? "outline" : "apollo"} onClick={() => { setShowComplete(false); navigate("/dashboard/training"); }}>
                  {watchScreenshot ? "Skip" : "Back to Train"}
                </Button>
                <Button variant="outline" onClick={() => { setShowComplete(false); navigate("/dashboard"); }}>
                  Go Home
                </Button>
              </div>
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
