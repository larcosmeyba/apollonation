import { useState, useEffect, useRef, useCallback } from "react";
import { WorkoutProject, WorkoutBlock } from "./types";
import { Play, Pause, SkipForward, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import apolloLogo from "@/assets/apollo-logo.png";

interface Props {
  project: WorkoutProject;
}

type Phase = "intro" | "workout" | "done";

const WorkoutPreview = ({ project }: Props) => {
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [introTimer, setIntroTimer] = useState(project.introDurationSeconds);
  const [blockIndex, setBlockIndex] = useState(0);
  const [blockTimer, setBlockTimer] = useState(0);
  const [muted, setMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const currentBlock: WorkoutBlock | undefined = project.blocks[blockIndex];
  const totalBlocks = project.blocks.length;

  const resetAll = useCallback(() => {
    setPlaying(false);
    setPhase("intro");
    setIntroTimer(project.introDurationSeconds);
    setBlockIndex(0);
    setBlockTimer(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [project.introDurationSeconds]);

  // Main tick
  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      if (phase === "intro") {
        setIntroTimer((prev) => {
          if (prev <= 1) {
            setPhase("workout");
            if (project.blocks.length > 0) {
              setBlockTimer(project.blocks[0].durationSeconds);
            }
            return 0;
          }
          return prev - 1;
        });
      } else if (phase === "workout") {
        setBlockTimer((prev) => {
          if (prev <= 1) {
            // Move to next block
            setBlockIndex((bi) => {
              const next = bi + 1;
              if (next >= totalBlocks) {
                setPhase("done");
                setPlaying(false);
                if (audioRef.current) audioRef.current.pause();
                return bi;
              }
              setBlockTimer(project.blocks[next].durationSeconds);
              return next;
            });
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, phase, totalBlocks, project.blocks]);

  // Play/pause music
  useEffect(() => {
    if (!audioRef.current || !project.musicTrack) return;
    if (playing && phase !== "done") {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [playing, phase, project.musicTrack]);

  // Play/pause video
  useEffect(() => {
    if (!videoRef.current) return;
    if (playing && phase === "workout" && currentBlock?.type === "exercise" && currentBlock.exerciseClip) {
      videoRef.current.src = currentBlock.exerciseClip.videoUrl;
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [playing, phase, blockIndex, currentBlock]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    if (phase === "done") {
      resetAll();
      return;
    }
    if (!playing && phase === "workout" && blockTimer === 0 && project.blocks.length > 0) {
      setBlockTimer(project.blocks[blockIndex].durationSeconds);
    }
    setPlaying(!playing);
  };

  const skipBlock = () => {
    if (phase === "intro") {
      setPhase("workout");
      if (project.blocks.length > 0) setBlockTimer(project.blocks[0].durationSeconds);
      return;
    }
    const next = blockIndex + 1;
    if (next >= totalBlocks) {
      setPhase("done");
      setPlaying(false);
      return;
    }
    setBlockIndex(next);
    setBlockTimer(project.blocks[next].durationSeconds);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = phase === "workout" && currentBlock
    ? ((currentBlock.durationSeconds - blockTimer) / currentBlock.durationSeconds) * 100
    : 0;

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-black max-w-[800px] mx-auto">
      {/* 16:9 viewport */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {/* INTRO SCREEN */}
        {phase === "intro" && (
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center gap-4 z-10">
            <img src={apolloLogo} alt="Apollo Nation" className="w-16 h-16 invert opacity-90" />
            <h2 className="font-heading text-2xl text-white tracking-wider uppercase">
              {project.title || "Untitled Workout"}
            </h2>
            <p className="text-apollo-gold text-sm tracking-widest uppercase">
              Coached by {project.coachedBy || "Coach Marcos"}
            </p>
            <div className="mt-4 text-white/50 text-xs">
              Starting in {introTimer}s
            </div>
          </div>
        )}

        {/* WORKOUT PHASE */}
        {phase === "workout" && currentBlock && (
          <>
            {currentBlock.type === "exercise" && currentBlock.exerciseClip ? (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                loop
                muted
                playsInline
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black flex items-center justify-center">
                <div className="text-center">
                  <p className="text-apollo-gold text-lg font-heading tracking-wider uppercase mb-2">Rest</p>
                  <p className="text-white/50 text-sm">Breathe & recover</p>
                </div>
              </div>
            )}

            {/* Timer overlay */}
            <div className="absolute top-4 right-4 z-20 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 text-center border border-white/10">
              <p className="text-[10px] uppercase tracking-wider text-white/60 mb-0.5">
                {currentBlock.type === "exercise" ? "Work" : "Rest"}
              </p>
              <p className="text-3xl font-mono font-bold text-white tabular-nums">
                {formatTime(blockTimer)}
              </p>
            </div>

            {/* Exercise name overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-10">
              <p className="text-white font-heading text-lg tracking-wide uppercase">
                {currentBlock.label || currentBlock.exerciseClip?.name || "Exercise"}
              </p>
              <div className="flex items-center gap-3 mt-1 text-white/50 text-xs">
                <span>Block {blockIndex + 1} / {totalBlocks}</span>
                <span>•</span>
                <span>{currentBlock.durationSeconds}s</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30">
              <div
                className="h-full bg-apollo-gold transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {/* DONE SCREEN */}
        {phase === "done" && (
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center gap-3 z-10">
            <img src={apolloLogo} alt="Apollo Nation" className="w-12 h-12 invert opacity-80" />
            <h2 className="font-heading text-xl text-white tracking-wider uppercase">Workout Complete</h2>
            <p className="text-apollo-gold/80 text-sm">Great work 💪</p>
          </div>
        )}

        {/* No blocks message */}
        {project.blocks.length === 0 && phase !== "intro" && (
          <p className="text-white/40 text-sm">Add exercises to preview</p>
        )}
      </div>

      {/* Controls */}
      <div className="bg-zinc-900 border-t border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="text-white hover:bg-white/10 h-9 w-9" onClick={togglePlay}>
            {phase === "done" ? (
              <RotateCcw className="w-4 h-4" />
            ) : playing ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button size="icon" variant="ghost" className="text-white/60 hover:bg-white/10 h-9 w-9" onClick={skipBlock} disabled={phase === "done"}>
            <SkipForward className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="text-white/60 hover:bg-white/10 h-9 w-9" onClick={resetAll}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {project.musicTrack && (
            <span className="text-white/40 text-xs mr-2 hidden sm:block">♪ {project.musicTrack.title}</span>
          )}
          <Button size="icon" variant="ghost" className="text-white/60 hover:bg-white/10 h-9 w-9" onClick={() => setMuted(!muted)}>
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Hidden audio element */}
      {project.musicTrack && (
        <audio
          ref={audioRef}
          src={project.musicTrack.url}
          loop
          preload="auto"
          crossOrigin="anonymous"
          onError={() => console.warn("Music track failed to load:", project.musicTrack?.url)}
        />
      )}
    </div>
  );
};

export default WorkoutPreview;
