// Called by the EXTERNAL render worker (not a user) to report progress/result.
// Authenticated with a shared secret, not a JWT. Uses the service-role key to
// update render_jobs regardless of RLS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-worker-secret",
};

const RENDER_WORKER_SECRET = Deno.env.get("RENDER_WORKER_SECRET");

// timing-safe string compare
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!RENDER_WORKER_SECRET) return json({ error: "Worker secret not configured" }, 500);
    const provided = req.headers.get("x-worker-secret") || "";
    if (!safeEqual(provided, RENDER_WORKER_SECRET)) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { jobId, status, mp4_url, duration_seconds, error, expires_at } = body ?? {};
    if (!jobId || typeof jobId !== "string") return json({ error: "jobId required" }, 400);
    if (!["rendering", "ready", "failed"].includes(status)) return json({ error: "invalid status" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (mp4_url !== undefined) patch.mp4_url = mp4_url;
    if (duration_seconds !== undefined) patch.duration_seconds = duration_seconds;
    if (error !== undefined) patch.error = String(error).slice(0, 1000);
    if (expires_at !== undefined) patch.expires_at = expires_at;

    const { error: upErr } = await admin.from("render_jobs").update(patch).eq("id", jobId);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
