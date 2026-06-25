import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SkipForward, Pause, Play, Repeat, Crop, Check, Type } from "lucide-react";
import type MuxPlayerElement from "@mux/mux-player";
import { AdminExercise, muxThumb } from "./exerciseTypes";
import introVideoAsset from "@/assets/intro-video.mov.asset.json";
import MuxVideo from "@/components/video/MuxVideo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export interface PlayerBlock {
  exercise: AdminExercise | null;
  alt: AdminExercise | null;
  work_seconds: number;
  rest_seconds: number;
  sets: number;
  set_rest_seconds: number;
  cue_overrides?: string | null;
  weight_prompt?: string | null;
  tempo_prompt?: string | null;
  rest_notes?: string | null;
  drop_set?: boolean;
  section?: "warmup" | "workout_a" | "workout_b" | "workout_c" | "cooldown";
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  progression_cue?: string | null;
}

interface Props {
  title: string;
  blocks: PlayerBlock[];
  onClose: () => void;
  introEnabled?: boolean;
  /** Admin preview mode — show per-exercise reframe/sizing overlay & persist to DB. */
  adminEditable?: boolean;
  /** Allow user to skip ahead. Disabled on the client on-demand experience. */
  allowSkip?: boolean;
}

type RestType = "between-sets" | "between-exercises";

type FrameOverrides = {
  position: string; // CSS object-position
  fit: "cover" | "contain";
  scale: number; // 1.0 – 1.8
};

const FRAME_LS_KEY = "apollo:exercise-frame-overrides";
const UI_SCALE_LS_KEY = "apollo:player-ui-scale";

type UiScale = { title: number; clock: number; note: number };
const DEFAULT_UI_SCALE: UiScale = { title: 1, clock: 1, note: 1 };

const loadUiScale = (): UiScale => {
  try {
    const v = JSON.parse(localStorage.getItem(UI_SCALE_LS_KEY) || "null");
    if (v && typeof v === "object") return { ...DEFAULT_UI_SCALE, ...v };
  } catch { /* noop */ }
  return DEFAULT_UI_SCALE;
};
const saveUiScale = (s: UiScale) => {
  try { localStorage.setItem(UI_SCALE_LS_KEY, JSON.stringify(s)); } catch { /* noop */ }
};

const loadFrameOverrides = (): Record<string, FrameOverrides> => {
  try {
    return JSON.parse(localStorage.getItem(FRAME_LS_KEY) || "{}");
  } catch {
    return {};
  }
};
const saveFrameOverridesLS = (map: Record<string, FrameOverrides>) => {
  try {
    localStorage.setItem(FRAME_LS_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
};

/**
 * Cinematic on-demand class player.
 */
const OnDemandClassPlayer = ({ title, blocks, onClose, introEnabled = true, adminEditable = false, allowSkip = true }: Props) => {
  const [phase, setPhase] = useState<"intro" | "starting" | "block" | "rest" | "done">(
    introEnabled ? "intro" : "starting",
  );

  const [idx, setIdx] = useState(0);
  const [setNum, setSetNum] = useState(1);
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [restType, setRestType] = useState<RestType>("between-sets");
  const [showAlt, setShowAlt] = useState(false);
  const videoRef = useRef<MuxPlayerElement>(null);
  const altVideoRef = useRef<MuxPlayerElement>(null);
  const restPreviewRef = useRef<MuxPlayerElement>(null);
  const startPreviewRef = useRef<MuxPlayerElement>(null);

  const block = blocks[idx];
  const next = blocks[idx + 1];
  const isLastSet = !!block && setNum >= block.sets;
  const isLastBlock = idx >= blocks.length - 1;

  // Intro plays an MP4/MOV; fallback safety timeout in case onEnded never fires
  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("starting"), 60000);
    return () => clearTimeout(t);
  }, [phase]);

  // Starting countdown — 10s preview before first exercise begins
  useEffect(() => {
    if (phase === "starting") setRemaining(10);
  }, [phase]);

  // Initialize remaining when entering a WORK phase.
  // Rest duration is set by advance() at the moment of transition (since the
  // rest belongs to the OUTGOING block, not the incoming one after idx++).
  useEffect(() => {
    if (phase === "block" && block) setRemaining(block.work_seconds);
  }, [phase, idx, setNum, block]);

  // Pause/resume the actual video when user taps pause
  useEffect(() => {
    const els: Array<MuxPlayerElement | null> = [
      videoRef.current,
      altVideoRef.current,
      restPreviewRef.current,
    ];
    els.forEach((el) => {
      if (!el) return;
      try {
        if (paused) el.pause();
        else el.play()?.catch?.(() => {});
      } catch {
        /* noop */
      }
    });
  }, [paused, phase, idx]);

  // Advance helper — handles skipping zero-length rest automatically
  const advance = (current: typeof phase) => {
    if (current === "block") {
      if (block && setNum < block.sets) {
        // between sets
        const restLen = block.set_rest_seconds;
        setSetNum((s) => s + 1);
        if (restLen > 0) {
          setRestType("between-sets");
          setPhase("rest");
          return restLen;
        }
        // no rest between sets → straight back to work
        return block.work_seconds;
      }
      if (idx < blocks.length - 1) {
        // between exercises
        const restLen = block?.rest_seconds ?? 0;
        const nextWork = blocks[idx + 1]?.work_seconds ?? 30;
        setSetNum(1);
        setIdx((i) => i + 1);
        if (restLen > 0) {
          setRestType("between-exercises");
          setPhase("rest");
          return restLen;
        }
        // no rest → straight into next exercise
        setPhase("block");
        return nextWork;
      }
      setPhase("done");
      return 0;
    }
    if (current === "rest") {
      setPhase("block");
      return blocks[idx]?.work_seconds || 30;
    }
    if (current === "starting") {
      setPhase("block");
      return blocks[0]?.work_seconds || 30;
    }
    return 0;
  };

  // Tick
  useEffect(() => {
    if (paused || phase === "intro" || phase === "done") return;
    const i = setInterval(() => {
      setRemaining((r) => (r > 1 ? r - 1 : advance(phase)));
    }, 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, phase, idx, setNum, block, blocks]);

  // Countdown beeps — short tick under 10s, longer "go" beep at transitions
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeepRef = useRef<number>(-1);
  const playBeep = (freq: number, duration: number, volume = 0.25) => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current!;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    if (paused || phase === "intro" || phase === "done") return;
    if (remaining === lastBeepRef.current) return;
    lastBeepRef.current = remaining;
    if (remaining > 0 && remaining <= 10) {
      // Higher tone on the final "go" cue, lower ticks for 10→1
      playBeep(remaining === 1 ? 880 : 660, remaining === 1 ? 0.18 : 0.09, 0.22);
    } else if (remaining === 0) {
      // Long transition beep (start work / start rest)
      playBeep(1040, 0.32, 0.28);
    }
  }, [remaining, phase, paused]);

  const skip = () => {
    const newRemaining = advance(phase);
    setRemaining(newRemaining);
  };

  // Loop trim
  const handleTimeUpdate = (
    ref: React.RefObject<MuxPlayerElement>,
    ex: AdminExercise | null,
  ) => () => {
    if (!ref.current || !ex) return;
    const el = ref.current;
    const out = ex.loop_out_seconds ?? el.duration;
    if (out && el.currentTime >= out - 0.05) {
      el.currentTime = ex.loop_in_seconds ?? 0;
      el.play().catch(() => {});
    }
  };

  // Should the rest screen show the BIG next-exercise preview with video?
  // Only when the current block has finished its final set AND a new exercise is coming up.
  // (During between-sets rest we stay on the same exercise.)
  const showBigPreview = phase === "rest" && restType === "between-exercises" && !!block?.exercise;

  // Object-position / sizing — per-exercise overrides for admin preview
  const [overrides, setOverrides] = useState<Record<string, FrameOverrides>>(() => loadFrameOverrides());
  const [savingFrame, setSavingFrame] = useState(false);
  const [showFramePanel, setShowFramePanel] = useState(false);
  const [showSizePanel, setShowSizePanel] = useState(false);
  const [uiScale, setUiScale] = useState<UiScale>(() => loadUiScale());
  const updateUiScale = (patch: Partial<UiScale>) => {
    setUiScale((prev) => {
      const next = { ...prev, ...patch };
      saveUiScale(next);
      return next;
    });
  };

  // Lock to landscape orientation while the player is open (best-effort, mobile only).
  useEffect(() => {
    const so: any = (window.screen as any)?.orientation;
    let locked = false;
    try {
      if (so?.lock) {
        so.lock("landscape").then(() => { locked = true; }).catch(() => {});
      }
    } catch { /* noop */ }
    return () => {
      try { if (locked && so?.unlock) so.unlock(); } catch { /* noop */ }
    };
  }, []);

  const getFrame = (ex: AdminExercise | null): FrameOverrides => {
    if (!ex) return { position: "center center", fit: "cover", scale: 1 };
    const ov = overrides[ex.id];
    return {
      position: ov?.position ?? ((ex as any).video_object_position || "center center"),
      fit: ov?.fit ?? "cover",
      scale: ov?.scale ?? 1,
    };
  };

  const focal = (ex: AdminExercise | null) => getFrame(ex).position;

  const updateFrame = (ex: AdminExercise | null, patch: Partial<FrameOverrides>) => {
    if (!ex) return;
    setOverrides((prev) => {
      const next = { ...prev, [ex.id]: { ...getFrame(ex), ...patch } };
      saveFrameOverridesLS(next);
      return next;
    });
  };

  const persistFrame = async (ex: AdminExercise | null) => {
    if (!ex) return;
    const frame = getFrame(ex);
    setSavingFrame(true);
    const { error } = await supabase
      .from("admin_exercises")
      .update({ video_object_position: frame.position } as any)
      .eq("id", ex.id);
    setSavingFrame(false);
    if (error) return toast.error(error.message);
    toast.success("Focal point saved. Zoom & fit are preview-only.");
  };

  const videoStyle = (ex: AdminExercise | null): React.CSSProperties => {
    const f = getFrame(ex);
    return {
      objectPosition: f.position,
      objectFit: f.fit,
      transform: f.scale !== 1 ? `scale(${f.scale})` : undefined,
      transformOrigin: f.position,
    };
  };



  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur"
      >
        <X className="w-5 h-5" />
      </button>

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 relative bg-black flex items-center justify-center overflow-hidden"
          >
            <video
              src={introVideoAsset.url}
              autoPlay
              playsInline
              muted={false}
              onEnded={() => setPhase("starting")}
              onError={() => setPhase("starting")}
              className="w-full h-full object-contain bg-black"
            />
            <button
              onClick={() => setPhase("starting")}
              className="absolute bottom-6 right-6 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-xs uppercase tracking-[0.3em]"
            >
              Skip intro
            </button>
          </motion.div>
        )}

        {phase === "starting" && blocks[0] && (
          <motion.div
            key="starting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center bg-black px-6"
          >
            <div className="text-[11px] uppercase tracking-[0.5em] text-white/50 mb-3">
              Starting Workout in
            </div>
            <div className="font-heading text-[18vw] md:text-[12vw] leading-none tabular-nums text-white" style={{ fontSize: `clamp(64px, ${18 * uiScale.clock}vw, ${24 * uiScale.clock}vw)` }}>
              {remaining}
            </div>

            <div className="mt-8 w-full max-w-3xl">
              <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3 text-center">
                First move
              </div>
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/15 bg-zinc-950 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
                {blocks[0].exercise?.mux_playback_id ? (
                  <MuxVideo
                    ref={startPreviewRef}
                    playbackId={blocks[0].exercise.mux_playback_id}
                    signed={Boolean((blocks[0].exercise as any).mux_playback_signed)}
                    title={`Preview: ${blocks[0].exercise.name}`}
                    videoId={blocks[0].exercise.id}
                    category={blocks[0].exercise.category}
                    classTitle={title}
                    autoPlay
                    muted
                    controls={false}
                    onTimeUpdate={handleTimeUpdate(startPreviewRef, blocks[0].exercise) as never}
                    onLoadedMetadata={() => {
                      if (startPreviewRef.current && blocks[0].exercise?.loop_in_seconds)
                        startPreviewRef.current.currentTime = blocks[0].exercise.loop_in_seconds;
                    }}
                    className="w-full h-full object-contain"
                    style={videoStyle(blocks[0].exercise)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/30">
                    No video
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 to-transparent">
                  <div className="font-heading text-2xl md:text-3xl tracking-wider">
                    {blocks[0].exercise?.name || "—"}
                  </div>
                  {blocks[0].exercise?.body_part && (
                    <div className="text-[11px] uppercase tracking-widest text-white/60 mt-1">
                      {blocks[0].exercise.body_part}
                    </div>
                  )}
                  <div className="text-[11px] uppercase tracking-widest text-primary mt-1">
                    {blocks[0].sets} {blocks[0].sets === 1 ? "set" : "sets"} · {blocks[0].work_seconds}s work
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button onClick={() => setPaused((p) => !p)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
              {allowSkip && (
                <button onClick={skip} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                  <SkipForward className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {phase === "rest" && block && (
          <motion.div
            key={`rest-${idx}-${setNum}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center bg-black px-6"
          >
            <div className="text-[11px] uppercase tracking-[0.5em] text-white/50 mb-4">Rest</div>
            <div className="font-heading text-[18vw] md:text-[12vw] leading-none tabular-nums text-white" style={{ fontSize: `clamp(64px, ${18 * uiScale.clock}vw, ${24 * uiScale.clock}vw)` }}>
              {remaining}
            </div>

            {block.rest_notes && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 w-full max-w-2xl rounded-2xl border-2 border-emerald-400/70 bg-emerald-400/10 backdrop-blur-md px-5 py-4 shadow-[0_0_30px_rgba(52,211,153,0.35)] ring-2 ring-emerald-400/30"
              >
                <div className="text-[10px] uppercase tracking-[0.4em] text-emerald-300 mb-1.5 text-center font-semibold">
                  Coach Note
                </div>
                <p className="text-white text-center leading-relaxed" style={{ fontSize: `${16 * uiScale.note}px` }}>
                  {block.rest_notes}
                </p>
              </motion.div>
            )}

            {showBigPreview ? (
              <div className="mt-10 w-full max-w-3xl">
                <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3 text-center">
                  Up next
                </div>
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/15 bg-zinc-950 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
                  {block.exercise?.mux_playback_id ? (
                    <MuxVideo
                      ref={restPreviewRef}
                      playbackId={block.exercise.mux_playback_id}
                      signed={Boolean((block.exercise as any).mux_playback_signed)}
                      title={`Preview: ${block.exercise.name}`}
                      videoId={block.exercise.id}
                      category={block.exercise.category}
                      classTitle={title}
                      autoPlay
                      muted
                      controls={false}
                      onTimeUpdate={handleTimeUpdate(restPreviewRef, block.exercise) as never}
                      onLoadedMetadata={() => {
                        if (restPreviewRef.current && block.exercise?.loop_in_seconds)
                          restPreviewRef.current.currentTime = block.exercise.loop_in_seconds;
                      }}
                      className="w-full h-full object-contain"
                      style={videoStyle(block.exercise)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30">
                      No video
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 to-transparent">
                    <div className="font-heading text-2xl md:text-3xl tracking-wider">
                      {block.exercise?.name || "—"}
                    </div>
                    {block.exercise?.body_part && (
                      <div className="text-[11px] uppercase tracking-widest text-white/60 mt-1">
                        {block.exercise.body_part}
                      </div>
                    )}
                    <div className="text-[11px] uppercase tracking-widest text-primary mt-1">
                      {block.sets} {block.sets === 1 ? "set" : "sets"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 text-xs uppercase tracking-[0.3em] text-white/40">
                Set {setNum} of {block.sets} · {block.exercise?.name || ""}
              </div>
            )}

            <div className="mt-8 flex items-center gap-3">
              <button onClick={() => setPaused((p) => !p)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
              {allowSkip && (
                <button onClick={skip} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                  <SkipForward className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {phase === "block" && block && (
          <motion.div
            key={`block-${idx}-${setNum}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 relative overflow-hidden"
          >
            {/* Video layer */}
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: showAlt && block.alt ? "1fr 1fr" : "1fr" }}>
              <div className="relative bg-black">
                {block.exercise?.mux_playback_id ? (
                  <MuxVideo
                    ref={videoRef}
                    playbackId={block.exercise.mux_playback_id}
                    signed={Boolean((block.exercise as any).mux_playback_signed)}
                    title={block.exercise.name}
                    videoId={block.exercise.id}
                    category={block.exercise.category}
                    classTitle={title}
                    autoPlay
                    muted
                    controls={false}
                    onTimeUpdate={handleTimeUpdate(videoRef, block.exercise) as never}
                    onLoadedMetadata={() => {
                      if (videoRef.current && block.exercise?.loop_in_seconds)
                        videoRef.current.currentTime = block.exercise.loop_in_seconds;
                    }}
                    className="w-full h-full object-contain"
                    style={{ ...videoStyle(block.exercise), objectFit: "contain" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40">No video</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
              </div>
              {showAlt && block.alt?.mux_playback_id && (
                <div className="relative bg-black border-l border-white/10">
                  <MuxVideo
                    ref={altVideoRef}
                    playbackId={block.alt.mux_playback_id}
                    signed={Boolean((block.alt as any).mux_playback_signed)}
                    title={`${block.alt.name} (alt)`}
                    videoId={block.alt.id}
                    category={block.alt.category}
                    classTitle={title}
                    autoPlay
                    muted
                    controls={false}
                    onTimeUpdate={handleTimeUpdate(altVideoRef, block.alt) as never}
                    onLoadedMetadata={() => {
                      if (altVideoRef.current && block.alt?.loop_in_seconds)
                        altVideoRef.current.currentTime = block.alt.loop_in_seconds;
                    }}
                    className="w-full h-full object-contain"
                    style={{ ...videoStyle(block.alt), objectFit: "contain" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs uppercase tracking-widest">
                    Modification: {block.alt.name}
                  </div>
                </div>
              )}
            </div>

            {/* HUD */}
            <div className="relative z-10 h-full flex flex-col p-6 md:p-10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-white/60">
                    {block.section === "warmup" ? "Warm Up"
                      : block.section === "cooldown" ? "Cool Down"
                      : block.section === "workout_a" ? "Workout Block A"
                      : block.section === "workout_b" ? "Workout Block B"
                      : block.section === "workout_c" ? "Workout Block C"
                      : `Set ${setNum} of ${block.sets}`}
                  </div>
                  <h2 className="font-heading mt-1 tracking-wider leading-tight" style={{ fontSize: `${20 * uiScale.title}px` }}>
                    {block.exercise?.name || "—"}
                  </h2>
                  {(block.section === "workout_a" || block.section === "workout_b" || block.section === "workout_c") && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {block.exercise?.body_part && (
                        <div className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur text-[9px] uppercase tracking-wider text-white/70">
                          Target: {block.exercise.body_part}
                        </div>
                      )}
                      {block.exercise?.muscle_group && block.exercise.muscle_group !== block.exercise.body_part && (
                        <div className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/40 text-primary text-[9px] uppercase tracking-wider">
                          Feel it: {block.exercise.muscle_group}
                        </div>
                      )}
                    </div>
                  )}
                  {block.drop_set && (
                    <div className="mt-2 inline-block px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[9px] uppercase tracking-wider">
                      Drop Set
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-heading tabular-nums leading-none" style={{ fontSize: `${36 * uiScale.clock}px` }}>{remaining}</div>
                  <div className="text-[9px] uppercase tracking-[0.3em] text-white/60 mt-1">
                    {block.section === "cooldown" ? "Hold" : "Work"}
                  </div>
                </div>
              </div>


              <div className="mt-auto flex items-end justify-between gap-6 flex-wrap">
                <div className="space-y-2 max-w-md">
                  {(block.target_reps_min || block.target_reps_max) && block.section !== "warmup" && block.section !== "cooldown" && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/20 border border-primary/40">
                      <span className="text-[9px] uppercase tracking-[0.25em] text-primary/80">Target</span>
                      <span className="text-xs font-bold text-primary tabular-nums">
                        {block.target_reps_min && block.target_reps_max && block.target_reps_min !== block.target_reps_max
                          ? `${block.target_reps_min}–${block.target_reps_max} reps`
                          : `${block.target_reps_max || block.target_reps_min} reps`}
                      </span>
                    </div>
                  )}
                  {block.weight_prompt && (
                    <div className="text-xs uppercase tracking-wider text-amber-300">
                      💪 {block.weight_prompt}
                    </div>
                  )}
                  {block.tempo_prompt && (
                    <div className="text-xs uppercase tracking-wider text-cyan-300">
                      ⏱ {block.tempo_prompt}
                    </div>
                  )}
                  {block.progression_cue && block.sets > 1 && (
                    <div className="text-xs uppercase tracking-wider text-emerald-300">
                      📈 Set {setNum}/{block.sets} · {block.progression_cue}
                    </div>
                  )}
                  {block.cue_overrides ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-lg border border-yellow-300/70 bg-yellow-300/10 backdrop-blur-md px-3 py-2 shadow-[0_0_18px_rgba(253,224,71,0.25)]"
                    >
                      <div className="absolute -top-1.5 left-2 px-1.5 py-0.5 rounded-full bg-yellow-300 text-black text-[8px] font-bold uppercase tracking-[0.2em]">
                        Coach Note
                      </div>
                      <p className="text-xs md:text-sm font-medium text-yellow-50 leading-snug pt-0.5">
                        {block.cue_overrides}
                      </p>
                    </motion.div>
                  ) : block.exercise?.coaching_notes ? (
                    <p className="text-xs md:text-sm text-white/75 leading-snug">
                      {block.exercise.coaching_notes}
                    </p>
                  ) : null}

                </div>

                {/* "Coming Next" preview — only on the LAST set of the current exercise */}
                {isLastSet && next?.exercise && (
                  <div className="flex items-center gap-3 bg-white/5 backdrop-blur rounded-xl p-2.5 border border-white/10">
                    {next.exercise.mux_playback_id && (
                      <img
                        src={muxThumb(next.exercise.mux_playback_id)}
                        alt=""
                        className="w-16 h-10 object-cover rounded"
                      />
                    )}
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-white/50">Next</div>
                      <div className="text-sm font-medium">{next.exercise.name}</div>
                      <div className="text-[10px] uppercase tracking-widest text-primary mt-0.5">
                        {next.sets} {next.sets === 1 ? "set" : "sets"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPaused((p) => !p)}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center"
                >
                  {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
                {allowSkip && (
                  <button
                    onClick={skip}
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                )}
                {block.alt && (
                  <button
                    onClick={() => setShowAlt((s) => !s)}
                    className={`px-4 h-12 rounded-full backdrop-blur flex items-center gap-2 text-sm ${
                      showAlt ? "bg-primary text-primary-foreground" : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    <Repeat className="w-4 h-4" /> {showAlt ? "Hide" : "Show"} Alternate
                  </button>
                )}
                {adminEditable && block.exercise && (
                  <button
                    onClick={() => setShowFramePanel((s) => !s)}
                    className={`px-4 h-12 rounded-full backdrop-blur flex items-center gap-2 text-sm ${
                      showFramePanel ? "bg-primary text-primary-foreground" : "bg-white/10 hover:bg-white/20"
                    }`}
                    title="Adjust video framing & sizing"
                  >
                    <Crop className="w-4 h-4" /> Reframe
                  </button>
                )}
              </div>

              {adminEditable && showFramePanel && block.exercise && (() => {
                const ex = block.exercise;
                const frame = getFrame(ex);
                return (
                  <div className="absolute right-6 bottom-24 z-20 w-[280px] rounded-2xl border border-white/15 bg-black/80 backdrop-blur-xl p-4 space-y-3 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-[0.3em] text-white/60">Reframe</div>
                      <button onClick={() => setShowFramePanel(false)} className="text-white/60 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-white/80 truncate">{ex.name}</div>

                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5">Focal point</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          ["left top", "↖"], ["center top", "↑"], ["right top", "↗"],
                          ["left center", "←"], ["center center", "•"], ["right center", "→"],
                          ["left bottom", "↙"], ["center bottom", "↓"], ["right bottom", "↘"],
                        ].map(([pos, glyph]) => {
                          const active = frame.position === pos;
                          return (
                            <button
                              key={pos}
                              onClick={() => updateFrame(ex, { position: pos })}
                              className={`h-8 rounded-md border text-sm transition ${
                                active ? "bg-primary text-primary-foreground border-primary" : "bg-white/5 hover:bg-white/10 border-white/15"
                              }`}
                            >
                              {glyph}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5">Fit</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(["cover", "contain"] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => updateFrame(ex, { fit: f })}
                            className={`h-8 rounded-md border text-xs uppercase tracking-wider transition ${
                              frame.fit === f ? "bg-primary text-primary-foreground border-primary" : "bg-white/5 hover:bg-white/10 border-white/15"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/50 mb-1.5">
                        <span>Zoom</span>
                        <span className="tabular-nums text-white/80">{frame.scale.toFixed(2)}×</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={1.8}
                        step={0.05}
                        value={frame.scale}
                        onChange={(e) => updateFrame(ex, { scale: Number(e.target.value) })}
                        className="w-full accent-primary"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => updateFrame(ex, { position: "center center", fit: "cover", scale: 1 })}
                        className="flex-1 h-9 rounded-md bg-white/5 hover:bg-white/10 border border-white/15 text-xs"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => persistFrame(ex)}
                        disabled={savingFrame}
                        className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> Save focal
                      </button>
                    </div>
                    <p className="text-[10px] text-white/40 leading-snug">
                      Focal point is saved to the exercise. Fit &amp; zoom apply to this preview only.
                    </p>
                  </div>
                );
              })()}
            </div>
          </motion.div>

        )}

        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center bg-gradient-to-b from-black via-zinc-900 to-black"
          >
            <div className="text-center">
              <div className="font-heading text-5xl md:text-7xl tracking-[0.2em] mb-4">CLASS COMPLETE</div>
              <div className="text-sm uppercase tracking-[0.4em] text-white/60 mb-10">Apollo Reborn</div>
              <button
                onClick={onClose}
                className="px-8 h-12 rounded-full bg-white text-black font-medium tracking-wider"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnDemandClassPlayer;
