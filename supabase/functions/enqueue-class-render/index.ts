import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
const RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL")?.trim().replace(/\/+$/, "");
const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET")?.trim();
const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID") || "";
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET") || "";
const MUX_AUTH = "Basic " + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);
interface Block { exercise_id: string | null; work_seconds: number; rest_seconds: number; sets: number; set_rest_seconds: number; sort_order: number; }
interface Exercise { id: string; mux_playback_id: string | null; mux_asset_id: string | null; source_video_url: string | null; loop_in_seconds: number | null; loop_out_seconds: number | null; }
const muxMp4 = (id: string) => `https://stream.mux.com/${id}/capped-1080p.mp4`;
Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const pre = handlePreflight(req); if (pre) return pre;
  try {
    if ((!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) && (!RENDER_WORKER_URL || !RENDER_WORKER_SECRET)) return json({ error: "Render pipeline is not configured" }, 500);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);
    // Admin-only: rendering burns paid Mux/worker compute. Never expose to non-admins.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (roleErr || isAdmin !== true) return json({ error: "Forbidden" }, 403);
    const body = await req.json().catch(() => ({}));
    if (body?.action === "status") {
      const jobId = typeof body.job_id === "string" ? body.job_id : "";
      if (!jobId) return json({ error: "job_id required" }, 400);
      if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) return json({ error: "Mux credentials are not configured" }, 500);
      const { data: existing, error: readErr } = await supabase.from("render_jobs").select("id,mux_asset_id").eq("id", jobId).maybeSingle();
      if (readErr || !existing?.mux_asset_id) return json({ error: readErr?.message || "Render job not found" }, readErr ? 500 : 404);
      const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${existing.mux_asset_id}`, { headers: { Authorization: MUX_AUTH } });
      const assetPayload = await assetRes.json().catch(async () => ({ raw: await assetRes.text() }));
      if (!assetRes.ok) return json({ error: assetPayload?.error?.message || assetPayload?.raw || "Mux status check failed" }, 502);
      const asset = assetPayload.data || {};
      const playbackId = asset.playback_ids?.[0]?.id || null;
      const rendition = asset.static_renditions?.files?.find((f: any) => f?.status === "ready" && f?.ext === "mp4");
      const mp4Url = playbackId && rendition?.name ? `https://stream.mux.com/${playbackId}/${rendition.name}` : null;
      const patch: Record<string, unknown> = { status: mp4Url ? "ready" : asset.status === "errored" ? "failed" : "rendering", mux_playback_id: playbackId, mp4_url: mp4Url, duration_seconds: asset.duration || null, error: asset.errors ? JSON.stringify(asset.errors) : null };
      await supabase.from("render_jobs").update(patch).eq("id", jobId);
      return json({ job_id: jobId, ...patch });
    }
    const { class_id } = body;
    if (!class_id || typeof class_id !== "string") return json({ error: "class_id required" }, 400);
    const { data: cls, error: clsErr } = await supabase.from("admin_classes").select("*").eq("id", class_id).maybeSingle();
    if (clsErr || !cls) return json({ error: "Class not found or forbidden" }, 403);
    const { data: blocks, error: blocksErr } = await supabase.from("admin_class_blocks").select("*").eq("class_id", class_id).order("sort_order");
    if (blocksErr) return json({ error: blocksErr.message }, 500);
    if (!blocks || blocks.length === 0) return json({ error: "Class has no blocks" }, 400);
    const exerciseIds = Array.from(new Set(blocks.map((b: Block) => b.exercise_id).filter(Boolean) as string[]));
    const { data: exRows } = await supabase.from("admin_exercises").select("id, mux_playback_id, mux_asset_id, source_video_url, loop_in_seconds, loop_out_seconds").in("id", exerciseIds);
    const exMap = new Map<string, Exercise>((exRows || []).map((e: Exercise) => [e.id, e]));
    type Segment = { kind: "exercise"; url: string; isMux: boolean; in: number; out: number; fillSeconds: number } | { kind: "rest"; seconds: number };
    const segments: Segment[] = [];
    const muxInputs: Array<Record<string, unknown>> = [];
    let canUseMuxStitching = !!MUX_TOKEN_ID && !!MUX_TOKEN_SECRET;
    for (const b of blocks as Block[]) {
      if (!b.exercise_id) continue;
      const ex = exMap.get(b.exercise_id); if (!ex) continue;
      const isMux = !!ex.mux_playback_id;
      const url = isMux ? muxMp4(ex.mux_playback_id!) : ex.source_video_url; if (!url) continue;
      const loopIn = ex.loop_in_seconds ?? 0; const loopOut = ex.loop_out_seconds ?? loopIn + 4;
      const explicitLoopOut = ex.loop_out_seconds !== null && ex.loop_out_seconds !== undefined;
      const fillSeconds = Math.max(1, (b.sets || 1) * (b.work_seconds || loopOut - loopIn));
      segments.push({ kind: "exercise", url, isMux, in: loopIn, out: loopOut, fillSeconds });
      if (ex.mux_asset_id) {
        const copies = Math.max(1, Number(b.sets) || 1);
        for (let i = 0; i < copies; i += 1) {
          const input: Record<string, unknown> = { url: `mux://assets/${ex.mux_asset_id}` };
          if (loopIn > 0) input.start_time = loopIn;
          if (explicitLoopOut && loopOut > loopIn) input.end_time = loopOut;
          muxInputs.push(input);
        }
      } else {
        canUseMuxStitching = false;
      }
      if (b.rest_seconds && b.rest_seconds > 0) segments.push({ kind: "rest", seconds: b.rest_seconds });
    }
    if (segments.length === 0) return json({ error: "No usable clips in this class" }, 400);
    // Always use the external worker. It renders to one MP4 → render-callback ingests into Mux.
    // (Mux multi-input stitching is disabled — Mux rejects it for our inputs.)
    const { data: job, error: jobErr } = await supabase.from("render_jobs").insert({ class_id, status: "queued", render_engine: "ffmpeg", inputs_json: { title: cls.title, segments }, created_by: user.id }).select().single();
    if (jobErr || !job) return json({ error: jobErr?.message || "job insert failed" }, 500);
    if (!RENDER_WORKER_URL || !RENDER_WORKER_SECRET) {
      await supabase.from("render_jobs").update({ status: "failed", error: "Render worker is not configured for non-Mux clips" }).eq("id", job.id);
      return json({ error: "Render worker is not configured for non-Mux clips" }, 500);
    }
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/render-callback`;
    let workerResp: Response;
    try {
      workerResp = await fetch(`${RENDER_WORKER_URL}/render`, { method: "POST", headers: { "Content-Type": "application/json", "x-worker-secret": RENDER_WORKER_SECRET }, body: JSON.stringify({ jobId: job.id, title: cls.title, segments, callbackUrl }) });
    } catch (e) {
      await supabase.from("render_jobs").update({ status: "failed", error: `Worker unreachable: ${(e as Error).message}` }).eq("id", job.id);
      return json({ error: "Render worker unreachable" }, 502);
    }
    if (!workerResp.ok) {
      const txt = await workerResp.text();
      await supabase.from("render_jobs").update({ status: "failed", error: `Worker ${workerResp.status}: ${txt.slice(0, 300)}` }).eq("id", job.id);
      return json({ error: `Worker rejected job: ${workerResp.status}` }, 502);
    }
    await supabase.from("render_jobs").update({ status: "rendering" }).eq("id", job.id);
    return json({ job_id: job.id, status: "rendering" });
  } catch (e) { return json({ error: (e as Error).message }, 500); }
});
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
