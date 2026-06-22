import express from "express";
import { randomUUID } from "node:crypto";
import { renderClass } from "./render.js";
import { uploadAndPresign } from "./storage.js";
import { reportProgress, reportResult, reportFailure } from "./notify.js";

const PORT = process.env.PORT || 8080;
const WORKER_SECRET = process.env.RENDER_WORKER_SECRET;
// How long the R2 download link stays valid. Matches the bucket lifecycle.
const URL_TTL_SECONDS = Number(process.env.DOWNLOAD_URL_TTL_SECONDS || 24 * 60 * 60);

// Bump this on every worker change so /health reveals which build is live.
const VERSION = "v4-direct-url-hls";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, version: VERSION }));

app.post("/render", (req, res) => {
  if (!WORKER_SECRET || req.get("x-worker-secret") !== WORKER_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { jobId, title, segments, callbackUrl } = req.body || {};
  if (!jobId || !Array.isArray(segments) || segments.length === 0 || !callbackUrl) {
    return res.status(400).json({ error: "jobId, segments[], callbackUrl required" });
  }

  // ACK immediately so the edge function doesn't block; render in the background.
  res.status(202).json({ accepted: true, jobId });

  processJob({ jobId, title, segments, callbackUrl }).catch((err) => {
    console.error(`[job ${jobId}] fatal`, err);
  });
});

async function processJob({ jobId, title, segments, callbackUrl }) {
  const ctx = { callbackUrl, jobId };
  const t0 = Date.now();
  let cleanup = null;
  try {
    console.log(`[job ${jobId}] start — ${segments.length} segments`);
    await reportProgress(ctx, "rendering");

    const result = await renderClass({ jobId, segments });
    cleanup = result.cleanup;
    console.log(`[job ${jobId}] rendered ${result.durationSeconds}s in ${(Date.now() - t0) / 1000}s`);

    const key = `renders/${jobId}/${slug(title) || "class"}-${randomUUID().slice(0, 8)}.mp4`;
    const { url, expiresAt } = await uploadAndPresign(result.filePath, key, URL_TTL_SECONDS);
    console.log(`[job ${jobId}] uploaded → ${key}`);

    await reportResult(ctx, {
      mp4_url: url,
      duration_seconds: result.durationSeconds,
      expires_at: expiresAt,
    });
    console.log(`[job ${jobId}] done`);
  } catch (err) {
    console.error(`[job ${jobId}] failed`, err);
    await reportFailure(ctx, err?.message || String(err)).catch(() => {});
  } finally {
    // Always remove the temp working dir — nothing persists on the worker.
    if (cleanup) await cleanup().catch(() => {});
  }
}

function slug(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

app.listen(PORT, () => console.log(`Apollo render worker listening on :${PORT}`));
