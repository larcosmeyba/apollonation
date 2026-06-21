import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const safeFileName = (name: string, fallback = "apollo-clip") =>
  (name || fallback).replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "") || fallback;

const extractExerciseStoragePath = (rawUrl: string | null): string | null => {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const decodedPath = decodeURIComponent(url.pathname);
    const markers = [
      "/storage/v1/object/sign/exercise-videos/",
      "/storage/v1/object/public/exercise-videos/",
    ];
    for (const marker of markers) {
      const index = decodedPath.indexOf(marker);
      if (index >= 0) return decodedPath.slice(index + marker.length);
    }
  } catch (_) {
    return null;
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
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
    const exerciseId = typeof body.exercise_id === "string" ? body.exercise_id : "";
    if (!exerciseId) return json({ error: "exercise_id required" }, 400);

    const { data: exercise, error: exerciseErr } = await service
      .from("admin_exercises")
      .select("id,name,source_storage_path,source_video_url,mux_playback_id")
      .eq("id", exerciseId)
      .maybeSingle();

    if (exerciseErr) return json({ error: exerciseErr.message }, 500);
    if (!exercise) return json({ error: "Exercise not found" }, 404);

    const storagePath = exercise.source_storage_path || extractExerciseStoragePath(exercise.source_video_url);
    const candidateUrls: string[] = [];

    if (storagePath) {
      const { data, error } = await service.storage
        .from("exercise-videos")
        .createSignedUrl(storagePath, 600);
      if (error) return json({ error: error.message }, 500);
      if (data?.signedUrl) candidateUrls.push(data.signedUrl);
    } else if (exercise.source_video_url) {
      candidateUrls.push(exercise.source_video_url);
    }

    if (exercise.mux_playback_id) {
      candidateUrls.push(`https://stream.mux.com/${exercise.mux_playback_id}/high.mp4`);
      candidateUrls.push(`https://stream.mux.com/${exercise.mux_playback_id}/medium.mp4`);
    }

    if (candidateUrls.length === 0) return json({ error: "This exercise has no downloadable video source" }, 404);

    let upstream: Response | null = null;
    let upstreamStatus = 0;
    for (const url of candidateUrls) {
      const response = await fetch(url);
      upstreamStatus = response.status;
      if (response.ok && response.body) {
        upstream = response;
        break;
      }
    }

    if (!upstream?.body) return json({ error: `Video source returned ${upstreamStatus || "no response"}` }, 502);

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFileName(exercise.name)}.mp4"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});