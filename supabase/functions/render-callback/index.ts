import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-worker-secret" };
const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");
const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID") || "";
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET") || "";
const MUX_AUTH = "Basic " + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);
function safeEqual(a: string, b: string): boolean { if (a.length !== b.length) return false; let out = 0; for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i); return out === 0; }
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!RENDER_WORKER_SECRET) return json({ error: "Worker secret not configured" }, 500);
    if (!safeEqual(req.headers.get("x-worker-secret") || "", RENDER_WORKER_SECRET)) return json({ error: "Forbidden" }, 403);
    const { jobId, status, mp4_url, duration_seconds, error, expires_at } = (await req.json()) ?? {};
    if (!jobId || typeof jobId !== "string") return json({ error: "jobId required" }, 400);
    if (!["rendering", "ready", "failed"].includes(status)) return json({ error: "invalid status" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (mp4_url !== undefined) patch.mp4_url = mp4_url;
    if (duration_seconds !== undefined) patch.duration_seconds = duration_seconds;
    if (error !== undefined) patch.error = String(error).slice(0, 1000);
    if (expires_at !== undefined) patch.expires_at = expires_at;
    const { error: upErr } = await admin.from("render_jobs").update(patch).eq("id", jobId);
    if (upErr) return json({ error: upErr.message }, 500);

    // When the worker reports a finished MP4, ingest it into Mux as a single-input asset
    // and attach it to the originating admin_classes row.
    if (status === "ready" && typeof mp4_url === "string" && mp4_url.length > 0) {
      try {
        if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
          console.error("[render-callback] Mux credentials not configured; skipping ingest");
        } else {
          const { data: jobRow, error: jobErr } = await admin
            .from("render_jobs")
            .select("class_id, mux_asset_id")
            .eq("id", jobId)
            .maybeSingle();
          if (jobErr) throw new Error(jobErr.message);
          const classId = jobRow?.class_id as string | undefined;
          if (!classId) {
            console.error("[render-callback] No class_id on job", jobId);
          } else {
            const muxRes = await fetch("https://api.mux.com/video/v1/assets", {
              method: "POST",
              headers: { Authorization: MUX_AUTH, "Content-Type": "application/json" },
              body: JSON.stringify({
                input: mp4_url,
                playback_policy: ["public"],
                mp4_support: "capped-1080p",
                passthrough: `admin_class:${classId}`,
              }),
            });
            const muxData = await muxRes.json().catch(async () => ({ raw: await muxRes.text() }));
            if (!muxRes.ok) {
              const msg = muxData?.error?.messages?.join(" ") || muxData?.error?.message || muxData?.raw || `Mux ${muxRes.status}`;
              console.error("[render-callback] Mux ingest failed:", msg);
              await admin.from("render_jobs").update({ error: `Mux ingest failed: ${String(msg).slice(0, 800)}` }).eq("id", jobId);
            } else {
              const assetId = muxData?.data?.id as string | undefined;
              if (assetId) {
                await admin.from("render_jobs").update({ mux_asset_id: assetId }).eq("id", jobId);
                await admin
                  .from("admin_classes")
                  .update({ mux_asset_id: assetId, mux_status: "processing" })
                  .eq("id", classId);
              }
            }
          }
        }
      } catch (e) {
        console.error("[render-callback] Mux ingest exception:", (e as Error).message);
      }
    }

    return json({ ok: true });
  } catch (e) { return json({ error: (e as Error).message }, 500); }
});
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
