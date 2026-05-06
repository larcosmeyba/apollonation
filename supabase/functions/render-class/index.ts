// Render an admin class into a single MP4 by submitting a stitched
// asset to Mux. Returns immediately with the render_jobs row id; the
// mux-webhook function flips the row to "ready" when Mux finishes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID")!;
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET")!;
const MUX_AUTH = "Basic " + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

interface Block {
  exercise_id: string | null;
  work_seconds: number;
  rest_seconds: number;
  sets: number;
  set_rest_seconds: number;
  sort_order: number;
}

interface Exercise {
  id: string;
  mux_playback_id: string | null;
  loop_in_seconds: number | null;
  loop_out_seconds: number | null;
}

// Mux stitching needs a static MP4 URL per input. We use the medium.mp4
// rendition that Mux generates automatically for every public asset.
const muxMp4 = (id: string) => `https://stream.mux.com/${id}/medium.mp4`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);
    const userId = user.id;

    const { class_id } = await req.json();
    if (!class_id || typeof class_id !== "string") {
      return json({ error: "class_id required" }, 400);
    }

    // Verify admin via RLS-safe call
    const { data: cls, error: clsErr } = await supabase
      .from("admin_classes")
      .select("*")
      .eq("id", class_id)
      .maybeSingle();
    if (clsErr || !cls) return json({ error: "Class not found or forbidden" }, 403);

    const { data: blocks, error: blocksErr } = await supabase
      .from("admin_class_blocks")
      .select("*")
      .eq("class_id", class_id)
      .order("sort_order");
    if (blocksErr) return json({ error: blocksErr.message }, 500);
    if (!blocks || blocks.length === 0) return json({ error: "Class has no blocks" }, 400);

    const exerciseIds = Array.from(
      new Set(blocks.map((b: Block) => b.exercise_id).filter(Boolean) as string[]),
    );
    const { data: exRows } = await supabase
      .from("admin_exercises")
      .select("id, mux_playback_id, loop_in_seconds, loop_out_seconds")
      .in("id", exerciseIds);
    const exMap = new Map<string, Exercise>(
      (exRows || []).map((e: Exercise) => [e.id, e]),
    );

    // Build the Mux inputs[] array. For each block, repeat the exercise
    // clip enough times to cover total work duration; rests become silent
    // black frames (Mux supports a `start_time`/`end_time` slice; rests
    // get a placeholder loop trim of the same clip frozen at the loop
    // out point — for v1 we keep it simple and concatenate work clips
    // only. Rest is enforced by the player overlay.).
    const inputs: Array<Record<string, unknown>> = [];
    for (const b of blocks as Block[]) {
      if (!b.exercise_id) continue;
      const ex = exMap.get(b.exercise_id);
      if (!ex?.mux_playback_id) continue;

      const loopIn = ex.loop_in_seconds ?? 0;
      const loopOut = ex.loop_out_seconds ?? loopIn + 4;
      const loopLen = Math.max(1, loopOut - loopIn);
      const totalWork = b.sets * b.work_seconds;
      const reps = Math.max(1, Math.ceil(totalWork / loopLen));

      for (let i = 0; i < reps; i++) {
        inputs.push({
          url: muxMp4(ex.mux_playback_id),
          start_time: loopIn,
          end_time: loopOut,
        });
      }
    }

    if (inputs.length === 0) return json({ error: "No usable inputs" }, 400);

    // Create a render_jobs row first so we can persist failures.
    const { data: job, error: jobErr } = await supabase
      .from("render_jobs")
      .insert({
        class_id,
        status: "queued",
        inputs_json: { inputs, title: cls.title },
        created_by: userId,
      })
      .select()
      .single();
    if (jobErr || !job) return json({ error: jobErr?.message || "job insert failed" }, 500);

    // Submit to Mux
    const muxRes = await fetch("https://api.mux.com/video/v1/assets", {
      method: "POST",
      headers: {
        Authorization: MUX_AUTH,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs,
        playback_policy: ["public"],
        mp4_support: "standard",
        passthrough: job.id, // travels back via webhook
        max_resolution_tier: "1080p",
      }),
    });

    if (!muxRes.ok) {
      const errText = await muxRes.text();
      await supabase
        .from("render_jobs")
        .update({ status: "failed", error: `Mux ${muxRes.status}: ${errText}` })
        .eq("id", job.id);
      return json({ error: `Mux API error: ${errText}` }, 502);
    }

    const muxData = await muxRes.json();
    const asset = muxData.data;

    await supabase
      .from("render_jobs")
      .update({
        status: "rendering",
        mux_asset_id: asset.id,
      })
      .eq("id", job.id);

    return json({ job_id: job.id, mux_asset_id: asset.id, status: "rendering" });
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
