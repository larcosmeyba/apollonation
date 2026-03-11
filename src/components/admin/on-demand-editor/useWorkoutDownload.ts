import { useState, useCallback } from "react";
import { WorkoutProject, WorkoutBlock } from "./types";

/**
 * Canvas-based workout recorder.
 * Draws branded intro → exercise/rest blocks with timers → done screen,
 * records everything via MediaRecorder, and returns a downloadable .webm blob.
 */

const W = 1920;
const H = 1080;
const GOLD = "#C9A84C";
const BG_DARK = "#0a0a0a";
const BG_MID = "#1a1a1a";

function drawGradientBg(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, BG_MID);
  grad.addColorStop(1, BG_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawIntro(
  ctx: CanvasRenderingContext2D,
  project: WorkoutProject,
  remainingSec: number
) {
  drawGradientBg(ctx);

  // Logo placeholder circle
  ctx.beginPath();
  ctx.arc(W / 2, H / 2 - 120, 50, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("AN", W / 2, H / 2 - 110);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px sans-serif";
  ctx.fillText(project.title || "Untitled Workout", W / 2, H / 2 + 20);

  // Coach
  ctx.fillStyle = GOLD;
  ctx.font = "24px sans-serif";
  ctx.letterSpacing = "8px";
  ctx.fillText(
    `COACHED BY ${(project.coachedBy || "Coach Marcos").toUpperCase()}`,
    W / 2,
    H / 2 + 70
  );
  ctx.letterSpacing = "0px";

  // Countdown
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "18px sans-serif";
  ctx.fillText(`Starting in ${remainingSec}s`, W / 2, H / 2 + 140);
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: WorkoutBlock,
  blockIdx: number,
  totalBlocks: number,
  remainingSec: number,
  videoEl?: HTMLVideoElement | null
) {
  // Try drawing video frame
  let drewVideo = false;
  if (
    block.type === "exercise" &&
    videoEl &&
    videoEl.readyState >= 2 &&
    !videoEl.paused
  ) {
    try {
      ctx.drawImage(videoEl, 0, 0, W, H);
      // Darken overlay for text readability
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, W, H);
      drewVideo = true;
    } catch {
      // CORS or other error — fall back
    }
  }

  if (!drewVideo) {
    if (block.type === "rest") {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, BG_MID);
      grad.addColorStop(0.5, "#1c1916");
      grad.addColorStop(1, BG_DARK);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = GOLD;
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("REST", W / 2, H / 2 - 20);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "22px sans-serif";
      ctx.fillText("Breathe & recover", W / 2, H / 2 + 30);
    } else {
      // Exercise without video
      drawGradientBg(ctx);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 52px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        block.label || block.exerciseClip?.name || "Exercise",
        W / 2,
        H / 2
      );
    }
  }

  // Timer box (top-right)
  const timerW = 220;
  const timerH = 110;
  const timerX = W - timerW - 40;
  const timerY = 40;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  roundRect(ctx, timerX, timerY, timerW, timerH, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  roundRect(ctx, timerX, timerY, timerW, timerH, 12);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    block.type === "exercise" ? "WORK" : "REST",
    timerX + timerW / 2,
    timerY + 28
  );

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px monospace";
  ctx.fillText(
    `${mins}:${secs.toString().padStart(2, "0")}`,
    timerX + timerW / 2,
    timerY + 82
  );

  // Bottom bar — exercise name + block info
  const barGrad = ctx.createLinearGradient(0, H - 140, 0, H);
  barGrad.addColorStop(0, "rgba(0,0,0,0)");
  barGrad.addColorStop(1, "rgba(0,0,0,0.8)");
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, H - 140, W, 140);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(
    block.label || block.exerciseClip?.name || "Exercise",
    50,
    H - 70
  );

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "18px sans-serif";
  ctx.fillText(
    `Block ${blockIdx + 1} / ${totalBlocks}  •  ${block.durationSeconds}s`,
    50,
    H - 35
  );

  // Progress bar
  const progress =
    ((block.durationSeconds - remainingSec) / block.durationSeconds) * W;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(0, H - 6, W, 6);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, H - 6, progress, 6);
}

function drawDone(ctx: CanvasRenderingContext2D) {
  drawGradientBg(ctx);

  ctx.beginPath();
  ctx.arc(W / 2, H / 2 - 80, 40, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("AN", W / 2, H / 2 - 72);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px sans-serif";
  ctx.fillText("WORKOUT COMPLETE", W / 2, H / 2 + 20);

  ctx.fillStyle = GOLD;
  ctx.font = "24px sans-serif";
  ctx.fillText("Great work 💪", W / 2, H / 2 + 70);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function loadVideo(url: string): Promise<HTMLVideoElement | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    v.onloadeddata = () => {
      v.play().then(() => resolve(v)).catch(() => resolve(null));
    };
    v.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 5000); // timeout
  });
}

export function useWorkoutDownload() {
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);

  const download = useCallback(async (project: WorkoutProject) => {
    if (project.blocks.length === 0) return;

    setRecording(true);
    setProgress(0);

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Build phase list
    type Phase = {
      type: "intro" | "block" | "done";
      durationMs: number;
      blockIdx?: number;
    };
    const phases: Phase[] = [];

    if (project.introEnabled) {
      phases.push({ type: "intro", durationMs: project.introDurationSeconds * 1000 });
    }
    project.blocks.forEach((_, i) => {
      phases.push({
        type: "block",
        durationMs: project.blocks[i].durationSeconds * 1000,
        blockIdx: i,
      });
    });
    phases.push({ type: "done", durationMs: 3000 });

    const totalMs = phases.reduce((s, p) => s + p.durationMs, 0);

    // Try to load exercise videos for canvas drawing
    const videoEls: (HTMLVideoElement | null)[] = [];
    for (const block of project.blocks) {
      if (block.type === "exercise" && block.exerciseClip?.videoUrl) {
        videoEls.push(await loadVideo(block.exerciseClip.videoUrl));
      } else {
        videoEls.push(null);
      }
    }

    // Setup MediaRecorder
    const stream = canvas.captureStream(30);

    // Try to add audio
    let audioEl: HTMLAudioElement | null = null;
    if (project.musicTrack) {
      try {
        audioEl = new Audio();
        audioEl.crossOrigin = "anonymous";
        audioEl.src = project.musicTrack.url;
        audioEl.loop = true;
        await new Promise<void>((res, rej) => {
          audioEl!.oncanplaythrough = () => res();
          audioEl!.onerror = () => rej();
          setTimeout(rej, 5000);
        });

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(audioEl);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      } catch {
        audioEl = null; // audio failed, record without it
      }
    }

    // Pick supported MIME type
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    const blobPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: "video/webm" }));
      };
    });

    recorder.start(100);
    if (audioEl) audioEl.play().catch(() => {});

    // Animation loop
    let phaseIdx = 0;
    let phaseStart = performance.now();
    let stopped = false;

    function tick() {
      if (stopped) return;
      const now = performance.now();
      const phaseElapsed = now - phaseStart;
      const phase = phases[phaseIdx];

      if (phaseElapsed >= phase.durationMs) {
        phaseIdx++;
        phaseStart = now;
        if (phaseIdx >= phases.length) {
          stopped = true;
          recorder.stop();
          if (audioEl) audioEl.pause();
          videoEls.forEach((v) => v?.pause());
          return;
        }
      }

      const currentPhase = phases[Math.min(phaseIdx, phases.length - 1)];
      const elapsed = performance.now() - phaseStart;
      const remainingSec = Math.max(
        0,
        Math.ceil((currentPhase.durationMs - elapsed) / 1000)
      );

      // Calculate total progress
      const completedMs =
        phases.slice(0, phaseIdx).reduce((s, p) => s + p.durationMs, 0) +
        elapsed;
      setProgress(Math.min(100, (completedMs / totalMs) * 100));

      // Draw
      if (currentPhase.type === "intro") {
        drawIntro(ctx, project, remainingSec);
      } else if (currentPhase.type === "block" && currentPhase.blockIdx != null) {
        const block = project.blocks[currentPhase.blockIdx];
        drawBlock(
          ctx,
          block,
          currentPhase.blockIdx,
          project.blocks.length,
          remainingSec,
          videoEls[currentPhase.blockIdx]
        );
      } else {
        drawDone(ctx);
      }

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // Wait for recording to finish
    const blob = await blobPromise;
    setRecording(false);
    setProgress(100);

    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project.title || "workout").replace(/\s+/g, "-").toLowerCase()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  return { recording, progress, download };
}
