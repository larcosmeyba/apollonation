import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Canonical output format. Every segment is normalized to these params so the
// final concat can stream-copy (fast, no quality loss on the join).
// Default to 720p + ultrafast to fit small Railway instances. The encoder, not
// the network, is the memory hog — 1080p veryfast can OOM-kill ffmpeg (exit
// signal SIGKILL). All overridable via env if the instance has more headroom.
const W = Number(process.env.RENDER_WIDTH || 1280);
const H = Number(process.env.RENDER_HEIGHT || 720);
const FPS = Number(process.env.RENDER_FPS || 30);

const VIDEO_ARGS = [
  "-c:v", "libx264", "-preset", process.env.FFMPEG_PRESET || "ultrafast",
  "-crf", process.env.FFMPEG_CRF || "23", "-pix_fmt", "yuv420p",
  "-r", String(FPS), "-g", String(FPS * 2), "-video_track_timescale", "90000",
  "-threads", process.env.FFMPEG_THREADS || "2",
];
const AUDIO_ARGS = ["-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2"];
// Let FFmpeg read sources over the network — direct files (mp4/mov) AND HLS
// playlists (m3u8), whose segment fetches are otherwise blocked by the default
// 'file,crypto,data' whitelist.
const PW = ["-protocol_whitelist", "file,crypto,data,http,https,tcp,tls"];
const NORMALIZE_VF =
  `scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
  `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${FPS},format=yuv420p`;

export async function renderClass({ jobId, segments }) {
  const dir = await mkdtemp(join(tmpdir(), `apollo-${jobId}-`));
  try {
    const segFiles = [];
    let idx = 0;
    for (const seg of segments) {
      idx++;
      const out = join(dir, `seg_${String(idx).padStart(3, "0")}.mp4`);
      if (seg.kind === "rest") {
        await buildRestSegment(out, Math.max(1, Number(seg.seconds) || 0));
      } else {
        await buildExerciseSegment(dir, idx, seg, out);
      }
      segFiles.push(out);
    }

    // Concat all normalized segments by stream copy.
    const listPath = join(dir, "concat.txt");
    await writeFile(listPath, segFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"));
    const finalPath = join(dir, "class.mp4");
    await ffmpeg([
      "-f", "concat", "-safe", "0",
      "-protocol_whitelist", "file,crypto,data,http,https,tcp,tls",
      "-i", listPath,
      "-c", "copy", "-movflags", "+faststart", finalPath,
    ]);

    const durationSeconds = Math.round(await ffprobeDuration(finalPath));
    // Caller uploads finalPath then we clean the temp dir.
    return {
      filePath: finalPath,
      durationSeconds,
      cleanup: () => rm(dir, { recursive: true, force: true }),
      _dir: dir,
    };
  } catch (err) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }
}

// --- segment builders -------------------------------------------------------

async function buildExerciseSegment(dir, idx, seg, outPath) {
  // Read the source directly with a protocol whitelist. This handles BOTH direct
  // files (mp4/mov over https, e.g. Supabase storage) and HLS playlists (m3u8,
  // e.g. Mux). Pre-downloading broke on HLS because fetch() saved the playlist
  // text, not the video, so FFmpeg couldn't fetch the https segments.
  const unit = join(dir, `unit_${idx}.mp4`);
  const trim = [];
  if (Number.isFinite(seg.in) && Number.isFinite(seg.out) && seg.out > seg.in) {
    trim.push("-ss", String(seg.in), "-t", String(seg.out - seg.in));
  }
  const hasAudio = await ffprobeHasAudio(seg.url);
  if (hasAudio) {
    await ffmpeg([...PW, ...trim, "-i", seg.url, "-vf", NORMALIZE_VF, ...VIDEO_ARGS, ...AUDIO_ARGS, "-shortest", unit]);
  } else {
    // No audio track → add a silent stereo track so every segment matches.
    await ffmpeg([
      ...PW, ...trim, "-i", seg.url,
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
      "-vf", NORMALIZE_VF, ...VIDEO_ARGS, ...AUDIO_ARGS,
      "-map", "0:v:0", "-map", "1:a:0", "-shortest", unit,
    ]);
  }

  // 2) Loop the unit to fill the work duration (sets * work_seconds).
  //    Re-encode here (NOT -c copy) so the cut is frame-accurate. Stream-copy can
  //    only cut on a keyframe boundary, which makes each segment run ~0.1s long and
  //    accumulates into seconds of drift across a full class. Verified: re-encoding
  //    yields exact durations.
  const fill = Math.max(1, Number(seg.fillSeconds) || 0);
  await ffmpeg(["-stream_loop", "-1", "-i", unit, "-t", String(fill), ...VIDEO_ARGS, ...AUDIO_ARGS, "-movflags", "+faststart", outPath]);
}

async function buildRestSegment(outPath, seconds) {
  // Black screen + silence, same canonical params. (A timer overlay here is a
  // Remotion-tier upgrade; FFmpeg keeps it a plain rest card for now.)
  await ffmpeg([
    "-f", "lavfi", "-i", `color=c=black:s=${W}x${H}:r=${FPS}`,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-t", String(seconds), ...VIDEO_ARGS, ...AUDIO_ARGS, "-shortest", outPath,
  ]);
}

// --- helpers ----------------------------------------------------------------

function ffmpeg(args) {
  return run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", reject);
    p.on("close", (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} exited code=${code} signal=${signal || "none"}${signal === "SIGKILL" ? " (out of memory — bump the worker instance memory)" : ""}: ${stderr.slice(-700)}`)),
    );
  });
}

function ffprobeDuration(file) {
  return new Promise((resolve, reject) => {
    const p = spawn("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", file,
    ]);
    let out = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.on("error", reject);
    p.on("close", () => resolve(parseFloat(out.trim()) || 0));
  });
}

function ffprobeHasAudio(input) {
  return new Promise((resolve) => {
    const p = spawn("ffprobe", [
      ...PW,
      "-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
      "-of", "csv=p=0", input,
    ]);
    let out = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.on("error", () => resolve(false));
    p.on("close", () => resolve(out.trim().length > 0));
  });
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed ${res.status} for ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function extFromUrl(url) {
  const m = String(url).split("?")[0].match(/\.(mp4|mov|m4v|webm)$/i);
  return m ? m[0] : ".mp4";
}
