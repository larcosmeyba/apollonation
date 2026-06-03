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
}

interface Props {
  title: string;
  blocks: PlayerBlock[];
  onClose: () => void;
  introEnabled?: boolean;
}

/**
 * Cinematic on-demand class player.
 * - Reusable Apollo intro card (cinematic dark fade)
 * - Per-exercise screen: looped MUX video, timer, set counter, next-up, cues
 * - Split-screen alt view via "Show Alternate" toggle
 * - Trim-to-loop using loop_in/loop_out (crossfade-free seek for simplicity)
 */
const OnDemandClassPlayer = ({ title, blocks, onClose, introEnabled = true }: Props) => {
  const [phase, setPhase] = useState<"intro" | "block" | "rest" | "done">(introEnabled ? "intro" : "block");
  const [idx, setIdx] = useState(0);
  const [setNum, setSetNum] = useState(1);
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showAlt, setShowAlt] = useState(false);
  const videoRef = useRef<MuxPlayerElement>(null);
  const altVideoRef = useRef<MuxPlayerElement>(null);

  const block = blocks[idx];
  const next = blocks[idx + 1];

  // Intro 4s
  useEffect(() => {
    if (phase !== "intro") return;
    const t = setTimeout(() => setPhase("block"), 4000);
    return () => clearTimeout(t);
  }, [phase]);

  // Initialize remaining when entering a phase
  useEffect(() => {
    if (phase === "block" && block) setRemaining(block.work_seconds);
    else if (phase === "rest" && block) setRemaining(block.rest_seconds);
  }, [phase, idx, setNum, block]);

  // Tick
  useEffect(() => {
    if (paused || phase === "intro" || phase === "done") return;
    const i = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        // advance
        if (phase === "block") {
          if (block && setNum < block.sets) {
            setSetNum((s) => s + 1);
            setPhase("rest");
            return block.set_rest_seconds;
          }
          if (idx < blocks.length - 1) {
            setSetNum(1);
            setIdx((i) => i + 1);
            setPhase("rest");
            return block?.rest_seconds || 10;
          }
          setPhase("done");
          return 0;
        }
        if (phase === "rest") {
          setPhase("block");
          return blocks[idx]?.work_seconds || 30;
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(i);
  }, [paused, phase, idx, setNum, block, blocks]);

  // Loop trim — works against mux-player which proxies the media element API.
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

  const skip = () => {
    if (phase === "block") {
      if (block && setNum < block.sets) {
        setSetNum((s) => s + 1);
        setPhase("rest");
      } else if (idx < blocks.length - 1) {
        setSetNum(1);
        setIdx((i) => i + 1);
        setPhase("rest");
      } else setPhase("done");
    } else if (phase === "rest") {
      setPhase("block");
    }
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

        {phase !== "intro" && phase !== "done" && block && (
          <motion.div
            key={`block-${idx}-${phase}`}
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
                  <video
                    ref={videoRef}
                    src={muxMp4(block.exercise.mux_playback_id)}
                    autoPlay
                    muted
                    playsInline
                    onTimeUpdate={handleTimeUpdate(videoRef, block.exercise)}
                    onLoadedMetadata={() => {
                      if (videoRef.current && block.exercise?.loop_in_seconds)
                        videoRef.current.currentTime = block.exercise.loop_in_seconds;
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40">No video</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
              </div>
              {showAlt && block.alt && (
                <div className="relative bg-black border-l border-white/10">
                  <video
                    ref={altVideoRef}
                    src={muxMp4(block.alt.mux_playback_id)}
                    autoPlay
                    muted
                    playsInline
                    onTimeUpdate={handleTimeUpdate(altVideoRef, block.alt)}
                    onLoadedMetadata={() => {
                      if (altVideoRef.current && block.alt?.loop_in_seconds)
                        altVideoRef.current.currentTime = block.alt.loop_in_seconds;
                    }}
                    className="w-full h-full object-cover"
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
              {/* Top: name + set */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-white/60">
                    {phase === "rest" ? "Rest" : `Set ${setNum} of ${block.sets}`}
                  </div>
                  <h2 className="font-heading text-3xl md:text-5xl mt-1 tracking-wider">
                    {block.exercise?.name || "—"}
                  </h2>
                  {block.drop_set && (
                    <div className="mt-2 inline-block px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs uppercase tracking-wider">
                      Drop Set
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-heading text-6xl md:text-8xl tabular-nums">{remaining}</div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/60 mt-1">
                    {phase === "rest" ? "Rest" : "Work"}
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-end justify-between gap-6 flex-wrap">
                {/* Cues */}
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

                {/* Next up */}
                {next?.exercise && (
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

              {/* Controls */}
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
