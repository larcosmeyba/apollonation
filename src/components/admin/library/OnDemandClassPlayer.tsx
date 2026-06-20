import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, SkipForward, Pause, Play, Repeat } from "lucide-react";
import type MuxPlayerElement from "@mux/mux-player";
import { AdminExercise, muxThumb } from "./exerciseTypes";
import MuxVideo from "@/components/video/MuxVideo";

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
  drop_set?: boolean;
  section?: "warmup" | "workout_a" | "workout_b" | "workout_c" | "cooldown";
}

interface Props {
  title: string;
  blocks: PlayerBlock[];
  onClose: () => void;
  introEnabled?: boolean;
}

type RestType = "between-sets" | "between-exercises";

/**
 * Cinematic on-demand class player.
 */
const OnDemandClassPlayer = ({ title, blocks, onClose, introEnabled = true }: Props) => {
  const [phase, setPhase] = useState<"intro" | "block" | "rest" | "done">(
    introEnabled ? "intro" : "block",
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

  const block = blocks[idx];
  const next = blocks[idx + 1];
  const isLastSet = !!block && setNum >= block.sets;
  const isLastBlock = idx >= blocks.length - 1;

  // Intro 4s
  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("block"), 4000);
    return () => clearTimeout(t);
  }, [phase]);

  // Initialize remaining when entering a phase
  useEffect(() => {
    if (phase === "block" && block) setRemaining(block.work_seconds);
    else if (phase === "rest" && block) {
      setRemaining(restType === "between-sets" ? block.set_rest_seconds : block.rest_seconds);
    }
  }, [phase, idx, setNum, block, restType]);

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

  // Object-position from admin reframing
  const focal = (ex: AdminExercise | null) =>
    (ex as any)?.video_object_position || "center center";

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
            transition={{ duration: 0.6 }}
            className="flex-1 flex items-center justify-center bg-gradient-to-b from-black via-zinc-900 to-black"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2 }}
                className="font-heading text-5xl md:text-7xl tracking-[0.2em] mb-4"
              >
                APOLLO
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="text-xs uppercase tracking-[0.4em] text-white/60 mb-12"
              >
                Reborn
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="text-2xl md:text-3xl font-light"
              >
                {title}
              </motion.div>
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
            <div className="font-heading text-[18vw] md:text-[12vw] leading-none tabular-nums text-white">
              {remaining}
            </div>

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
                      className="w-full h-full object-cover"
                      style={{ objectPosition: focal(block.exercise) }}
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
              <button onClick={skip} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                <SkipForward className="w-5 h-5" />
              </button>
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
                    className="w-full h-full object-cover"
                    style={{ objectPosition: focal(block.exercise) }}
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
                    className="w-full h-full object-cover"
                    style={{ objectPosition: focal(block.alt) }}
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
                  <h2 className="font-heading text-3xl md:text-5xl mt-1 tracking-wider">
                    {block.exercise?.name || "—"}
                  </h2>
                  {(block.section === "workout_a" || block.section === "workout_b" || block.section === "workout_c") && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {block.exercise?.body_part && (
                        <div className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur text-xs uppercase tracking-wider text-white/80">
                          Target: {block.exercise.body_part}
                        </div>
                      )}
                      {block.exercise?.muscle_group && block.exercise.muscle_group !== block.exercise.body_part && (
                        <div className="px-2.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs uppercase tracking-wider">
                          Feel it: {block.exercise.muscle_group}
                        </div>
                      )}
                    </div>
                  )}
                  {block.drop_set && (
                    <div className="mt-2 inline-block px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs uppercase tracking-wider">
                      Drop Set
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-heading text-6xl md:text-8xl tabular-nums">{remaining}</div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/60 mt-1">
                    {block.section === "cooldown" ? "Hold" : "Work"}
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-end justify-between gap-6 flex-wrap">
                <div className="space-y-1.5 max-w-md">
                  {block.weight_prompt && (
                    <div className="text-sm uppercase tracking-wider text-amber-300">
                      💪 {block.weight_prompt}
                    </div>
                  )}
                  {block.tempo_prompt && (
                    <div className="text-sm uppercase tracking-wider text-cyan-300">
                      ⏱ {block.tempo_prompt}
                    </div>
                  )}
                  {(block.cue_overrides || block.exercise?.coaching_notes) && (
                    <p className="text-base md:text-lg text-white/80 leading-snug">
                      {block.cue_overrides || block.exercise?.coaching_notes}
                    </p>
                  )}
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
                <button
                  onClick={skip}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur flex items-center justify-center"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
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
              </div>
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
