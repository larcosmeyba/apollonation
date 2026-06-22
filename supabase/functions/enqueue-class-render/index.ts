import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const RENDER_WORKER_URL = Deno.env.get("RENDER_WORKER_URL");
const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");
interface Block { exercise_id: string | null; work_seconds: number; rest_seconds: number; sets: number; set_rest_seconds: number; sort_order: number; }
interface Exercise { id: string; mux_playback_id: string | null; source_video_url: string | null; loop_in_seconds: number | null; loop_out_seconds: number | null; }
const muxMp4 = (id: string) => `https://stream.mux.com/${id}/medium.mp4`;
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!RENDER_WORKER_URL || !RENDER_WORKER_SECRET) return json({ error: "Render worker is not configured" }, 500);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);
    const { class_id } = await req.json();
    if (!class_id || typeof class_id !== "string") return json({ error: "class_id required" }, 400);
    const { data: cls, error: clsErr } = await supabase.from("admin_classes").select("*").eq("id", class_id).maybeSingle();
    if (clsErr || !cls) return json({ error: "Class not found or forbidden" }, 403);
    const { data: blocks, error: blocksErr } = await supabase.from("admin_class_blocks").select("*").eq("class_id", class_id).order("sort_order");
    if (blocksErr) return json({ error: blocksErr.message }, 500);
    if (!blocks || blocks.length === 0) return json({ error: "Class has no blocks" }, 400);
    const exerciseIds = Array.from(new Set(blocks.map((b: Block) => b.exercise_id).filter(Boolean) as string[]));
    const { data: exRows } = await supabase.from("admin_exercises").select("id, mux_playback_id, source_video_url, loop_in_seconds, loop_out_seconds").in("id", exerciseIds);
    const exMap = new Map<string, Exercise>((exRows || []).map((e: Exercise) => [e.id, e]));
    type Segment = { kind: "exercise"; url: string; isMux: boolean; in: number; out: number; fillSeconds: number } | { kind: "rest"; seconds: number };
    const segments: Segment[] = [];
    for (const b of blocks as Block[]) {
      if (!b.exercise_id) continue;
      const ex = exMap.get(b.exercise_id); if (!ex) continue;
      const isMux = !!ex.mux_playback_id;
      const url = isMux ? muxMp4(ex.mux_playback_id!) : ex.source_video_url; if (!url) continue;
      const loopIn = ex.loop_in_seconds ?? 0; const loopOut = ex.loop_out_seconds ?? loopIn + 4;
      const fillSeconds = Math.max(1, (b.sets || 1) * (b.work_seconds || loopOut - loopIn));
      segments.push({ kind: "exercise", url, isMux, in: loopIn, out: loopOut, fillSeconds });
      if (b.rest_seconds && b.rest_seconds > 0) segments.push({ kind: "rest", seconds: b.rest_seconds });
    }
    if (segments.length === 0) return json({ error: "No usable clips in this class" }, 400);
    const { data: job, error: jobErr } = await supabase.from("render_jobs").insert({ class_id, status: "queued", render_engine: "ffmpeg", inputs_json: { title: cls.title, segments }, created_by: user.id }).select().single();
    if (jobErr || !job) return json({ error: jobErr?.message || "job insert failed" }, 500);
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/render-callback`;
    let workerResp: Response;
    try {
      workerResp = await fetch(`${RENDER_WORKER_URL}/render`, { method: "POST", headers: { "Content-Type": "application/json", "x-worker-secret": RENDER_WORKER_SECRET, "Authorization": `Bearer ${RENDER_WORKER_SECRET}` }, body: JSON.stringify({ jobId: job.id, title: cls.title, segments, callbackUrl }) });
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
