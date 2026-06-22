# Apollo Render Worker

External FFmpeg worker that stitches an On-Demand class's clips into **one finished MP4**, stores it in **Cloudflare R2** behind a temporary (24h) download URL, and reports the result back to Supabase. Nothing is rendered in Supabase Edge Functions and no MP4 is permanently stored in Supabase.

```
Apollo Admin → enqueue-class-render (edge fn) → THIS WORKER (Railway)
                                                    ├─ download clips
                                                    ├─ ffmpeg trim/loop/concat → class.mp4
                                                    ├─ upload to R2 (presigned, 24h)
                                                    └─ render-callback (edge fn) → render_jobs
Apollo Admin polls render_jobs → "Download Finished MP4" → you upload to Mux → paste playback id back
```

## Endpoints
- `GET /health` → `{ ok: true }`
- `POST /render` (header `x-worker-secret`) → `{ jobId, title, segments[], callbackUrl }`, returns `202` and renders async.

## 1. Create the Cloudflare R2 bucket
1. Cloudflare dashboard → **R2** → create bucket, e.g. `apollo-renders`.
2. **Settings → Object lifecycle rules → Add rule:** delete objects **1 day** after creation. *(This is what auto-deletes the MP4 after 24h.)*
3. **R2 → Manage API Tokens → Create** an Account API token with **Object Read & Write** on this bucket. Note the Access Key ID + Secret.
4. Your S3 endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

## 2. Deploy to Railway
1. Push this repo (or the `render-worker/` folder) to GitHub.
2. Railway → **New Project → Deploy from GitHub repo** → pick the repo. If the worker isn't at the repo root, set **Root Directory = `render-worker`**. Railway auto-detects the `Dockerfile`.
3. Add **Variables** (see `.env.example`):
   - `RENDER_WORKER_SECRET` — long random string (save it; Supabase needs the same value)
   - `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
4. Deploy. Railway gives you a public URL like `https://apollo-render.up.railway.app`.
5. Verify: open `<url>/health` → `{ "ok": true }`.

## 3. Configure Supabase
Set these as **Edge Function secrets** (Supabase dashboard → Project Settings → Edge Functions, or `supabase secrets set`):
- `RENDER_WORKER_URL` = your Railway URL (no trailing slash)
- `RENDER_WORKER_SECRET` = **same** value as on Railway

`render-callback` also uses the project's built-in `SUPABASE_SERVICE_ROLE_KEY` (already available to edge functions).

Deploy the two functions: `enqueue-class-render` and `render-callback` (Lovable/Supabase will pick them up from `supabase/functions/`).

## 4. Use it
In Apollo Admin → Class Builder → **Generate Finished MP4**. When it flips to **Download Finished MP4**, download the file (link valid 24h), upload it to Mux yourself, then paste the Mux **playback ID** back into the class.

## Local dev
```sh
cd render-worker
cp .env.example .env   # fill in values
npm install
npm run dev            # needs ffmpeg + ffprobe on PATH
# in another shell:
curl localhost:8080/health
```

## Notes / limits
- Output is normalized to 1920×1080 / 30fps / H.264 + AAC so segments concat by stream-copy. Tune via `RENDER_*` / `FFMPEG_*` env vars.
- Clips without an audio track get a silent stereo track so the join stays clean.
- Rest blocks render as a black card with silence. **Branded overlays, on-screen timers, intro screens, or premium transitions are a Remotion upgrade** — swap `src/render.js` for a Remotion render step when you need them; the rest of the pipeline (enqueue → worker → R2 → callback) stays the same.
- `start_time`/`end_time` loop trimming is applied only to Mux-sourced clips (consistent encoding), matching the original `render-class` behavior.
