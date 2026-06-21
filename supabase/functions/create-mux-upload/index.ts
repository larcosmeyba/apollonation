import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID") || "";
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET") || "";
const MUX_AUTH = "Basic " + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

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
      if (!uploadId) return json({ error: "upload_id required" }, 400);
      const targetTable = classId ? "admin_classes" : "workouts";
      const targetId = classId || workoutId;
      const uploadRes = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
        headers: { Authorization: MUX_AUTH },
      });
      const uploadData = await uploadRes.json().catch(async () => ({ raw: await uploadRes.text() }));
      if (!uploadRes.ok) {
        return json({ error: uploadData?.error?.messages?.join(" ") || uploadData?.error?.message || "Mux status check failed" }, 502);
      }
      const assetId = uploadData.data?.asset_id || null;
      if (!assetId) {
        await service.from(targetTable).update({ mux_status: "processing" }).eq("id", targetId);
        return json({ status: uploadData.data?.status || "processing", asset_id: null });
      }
      const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
        headers: { Authorization: MUX_AUTH },
      });
      const assetData = await assetRes.json().catch(async () => ({ raw: await assetRes.text() }));
      if (!assetRes.ok) {
        return json({ error: assetData?.error?.messages?.join(" ") || assetData?.error?.message || "Mux asset lookup failed" }, 502);
      }
      const playbackId = assetData.data?.playback_ids?.[0]?.id || null;
      const ready = assetData.data?.status === "ready" && playbackId;
      const update: Record<string, unknown> = {
        mux_asset_id: assetId,
        mux_status: assetData.data?.status === "errored" ? "errored" : ready ? "ready" : "processing",
      };
      if (ready) {
        update.mux_playback_id = playbackId;
        update.video_url = `https://stream.mux.com/${playbackId}.m3u8`;
        update.thumbnail_url = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&fit_mode=smartcrop`;
      }
      await service.from(targetTable).update(update).eq("id", targetId);
      return json({
        status: update.mux_status,
        asset_id: assetId,
        playback_id: playbackId,
        video_url: ready ? update.video_url : null,
        thumbnail_url: ready ? update.thumbnail_url : null,
      });
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
          playback_policy: ["public"],
          mp4_support: "capped-1080p",
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