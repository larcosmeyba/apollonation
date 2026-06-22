import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID") || "";
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET") || "";
const MUX_AUTH = "Basic " + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

const muxError = (data: any, fallback: string) =>
  data?.error?.messages?.join(" ") || data?.error?.message || data?.errors?.messages?.join(" ") || fallback;

const playbackUrl = (playbackId: string) => `https://stream.mux.com/${playbackId}.m3u8`;
const thumbnailUrl = (playbackId: string) =>
  `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&fit_mode=smartcrop`;

async function syncAssetStatus(
  service: ReturnType<typeof createClient>,
  targetTable: "admin_classes" | "workouts",
  targetId: string,
  assetId: string,
) {
  const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
    headers: { Authorization: MUX_AUTH },
  });
  const assetData = await assetRes.json().catch(async () => ({ raw: await assetRes.text() }));
  if (!assetRes.ok) return { error: muxError(assetData, "Mux asset lookup failed"), statusCode: 502 };

  const playbackId = assetData.data?.playback_ids?.[0]?.id || null;
  const ready = assetData.data?.status === "ready" && playbackId;
  const update: Record<string, unknown> = {
    mux_asset_id: assetId,
    mux_status: assetData.data?.status === "errored" ? "errored" : ready ? "ready" : "processing",
  };
  if (ready) {
    update.mux_playback_id = playbackId;
    update.video_url = playbackUrl(playbackId);
    update.thumbnail_url = thumbnailUrl(playbackId);
  }
  await service.from(targetTable).update(update).eq("id", targetId);
  return {
    status: update.mux_status,
    asset_id: assetId,
    playback_id: playbackId,
    video_url: ready ? update.video_url : null,
    thumbnail_url: ready ? update.thumbnail_url : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
      return json({ error: "Mux credentials are not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "create";
    const classId = typeof body.class_id === "string" ? body.class_id : "";
    const workoutId = typeof body.workout_id === "string" ? body.workout_id : "";
    if (!classId && !workoutId) return json({ error: "class_id or workout_id required" }, 400);

    if (action === "status") {
      const uploadId = typeof body.upload_id === "string" ? body.upload_id : "";
      const targetTable = classId ? "admin_classes" : "workouts";
      const targetId = classId || workoutId;
      const assetIdFromBody = typeof body.asset_id === "string" ? body.asset_id : "";
      if (assetIdFromBody) {
        const status = await syncAssetStatus(service, targetTable, targetId, assetIdFromBody);
        return json("error" in status ? { error: status.error } : status, "statusCode" in status ? status.statusCode : 200);
      }
      if (!uploadId) return json({ error: "upload_id or asset_id required" }, 400);
      const uploadRes = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
        headers: { Authorization: MUX_AUTH },
      });
      const uploadData = await uploadRes.json().catch(async () => ({ raw: await uploadRes.text() }));
      if (!uploadRes.ok) {
        return json({ error: muxError(uploadData, "Mux status check failed") }, 502);
      }
      const assetId = uploadData.data?.asset_id || null;
      if (!assetId) {
        await service.from(targetTable).update({ mux_status: "processing" }).eq("id", targetId);
        return json({ status: uploadData.data?.status || "processing", asset_id: null });
      }
      const status = await syncAssetStatus(service, targetTable, targetId, assetId);
      return json("error" in status ? { error: status.error } : status, "statusCode" in status ? status.statusCode : 200);
    }

    if (action === "stitch_existing_mux" && classId) {
      const { data: blocks, error: blocksErr } = await service
        .from("admin_class_blocks")
        .select("sort_order,work_seconds,sets,exercise:admin_exercises!admin_class_blocks_exercise_id_fkey(name,mux_asset_id,loop_in_seconds,loop_out_seconds)")
        .eq("class_id", classId)
        .order("sort_order");
      if (blocksErr) return json({ error: blocksErr.message }, 500);

      const inputs = (blocks || []).flatMap((block: any) => {
        const exercise = block.exercise;
        if (!exercise?.mux_asset_id) return [];
        const copies = Math.max(1, Number(block.sets) || 1);
        return Array.from({ length: copies }, () => {
          const input: Record<string, unknown> = { url: `mux://assets/${exercise.mux_asset_id}` };
          const start = Number(exercise.loop_in_seconds ?? 0) || 0;
          const end = Number(exercise.loop_out_seconds ?? 0) || 0;
          if (start > 0) input.start_time = start;
          if (end > start) input.end_time = end;
          return input;
        });
      });
      if (inputs.length === 0) return json({ error: "This class has no Mux asset-backed exercise clips to send to Mux" }, 400);

      const { data: content } = await service
        .from("admin_classes")
        .select("id,title,class_type")
        .eq("id", classId)
        .maybeSingle();
      const title = content?.title || "Apollo On-Demand Class";
      const category = content?.class_type || "strength";
      const assetRes = await fetch("https://api.mux.com/video/v1/assets", {
        method: "POST",
        headers: { Authorization: MUX_AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs,
          playback_policies: ["public"],
          static_renditions: [{ resolution: "highest", passthrough: `admin_class:${classId}` }],
          max_resolution_tier: "1080p",
          passthrough: `admin_class:${classId}`,
          meta: { title, category, external_id: classId },
        }),
      });
      const assetData = await assetRes.json().catch(async () => ({ raw: await assetRes.text() }));
      if (!assetRes.ok) return json({ error: muxError(assetData, "Mux could not create the class asset") }, 502);

      const assetId = assetData.data?.id;
      await service
        .from("admin_classes")
        .update({ mux_status: "processing", mux_asset_id: assetId || null, mux_playback_id: null, video_url: null })
        .eq("id", classId);
      return json({ status: assetData.data?.status || "processing", asset_id: assetId, input_count: inputs.length });
    }

    const { data: content, error: contentErr } = classId
      ? await supabase
        .from("admin_classes")
        .select("id,title,class_type")
        .eq("id", classId)
        .maybeSingle()
      : await supabase
        .from("workouts")
        .select("id,title,category")
        .eq("id", workoutId)
        .maybeSingle();

    if (contentErr || !content) return json({ error: "Workout not found or forbidden" }, 403);

    const passthrough = classId ? `admin_class:${classId}` : `admin_workout:${workoutId}`;
    const title = content.title || "Apollo On-Demand Class";
    const category = ("class_type" in content ? content.class_type : content.category) || "strength";

    const origin = req.headers.get("origin") || "*";
    const muxRes = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        Authorization: MUX_AUTH,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cors_origin: origin,
        new_asset_settings: {
          playback_policies: ["public"],
          static_renditions: [{ resolution: "highest", passthrough }],
          max_resolution_tier: "1080p",
          passthrough,
          meta: {
            title,
            category,
          },
        },
      }),
    });

    const muxData = await muxRes.json().catch(async () => ({ raw: await muxRes.text() }));
    if (!muxRes.ok) {
      return json({ error: muxData?.error?.messages?.join(" ") || muxData?.error?.message || "Mux upload failed" }, 502);
    }

    await service
      .from(classId ? "admin_classes" : "workouts")
      .update({
        mux_status: "processing",
        mux_asset_id: null,
        mux_playback_id: null,
        video_url: null,
      })
      .eq("id", classId || workoutId);

    return json({
      upload_id: muxData.data?.id,
      upload_url: muxData.data?.url,
      status: muxData.data?.status,
    });
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