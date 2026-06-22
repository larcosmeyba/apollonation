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

const muxPlaybackUrl = (playbackId: string, fileName: string, downloadName: string) =>
  `https://stream.mux.com/${playbackId}/${fileName}?download=${encodeURIComponent(downloadName)}`;

const MUX_TOKEN_ID = Deno.env.get("MUX_TOKEN_ID") || "";
const MUX_TOKEN_SECRET = Deno.env.get("MUX_TOKEN_SECRET") || "";
const MUX_AUTH = "Basic " + btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

const normalizeStoragePath = (path: string | null): string | null => {
  if (!path) return null;
  const cleaned = path.replace(/^\/+/, "");
  return cleaned.startsWith("exercise-videos/") ? cleaned.slice("exercise-videos/".length) : cleaned;
};

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

const fetchMuxAsset = async (assetId: string) => {
  const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
    headers: { Authorization: MUX_AUTH },
  });
  const assetData = await assetRes.json().catch(() => null);
  return { assetRes, assetData };
};

const pickReadyStaticMp4 = (assetData: any) => {
  const files = assetData?.data?.static_renditions?.files;
  if (!Array.isArray(files)) return null;
  return files.find((file: any) => file?.status === "ready" && typeof file?.name === "string" && file.name.endsWith(".mp4")) || null;
};

const createStaticMp4IfMissing = async (assetId: string) => {
  const res = await fetch(`https://api.mux.com/video/v1/assets/${assetId}/static-renditions`, {
    method: "POST",
    headers: { Authorization: MUX_AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ resolution: "highest", passthrough: "apollo-admin-download" }),
  });
  await res.text().catch(() => "");
  return res.status;
};

const firstReachableMuxMp4 = async (playbackId: string, downloadName: string) => {
  const legacyFiles = ["capped-1080p.mp4", "high.mp4", "medium.mp4"];
  for (const fileName of legacyFiles) {
    const url = muxPlaybackUrl(playbackId, fileName, downloadName);
    const response = await fetch(url, { headers: { Range: "bytes=0-1" } }).catch(() => null);
    if (response?.ok || response?.status === 206) return url;
    await response?.body?.cancel().catch(() => null);
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
      .select("id,name,source_storage_path,source_video_url,mux_playback_id,mux_asset_id")
      .eq("id", exerciseId)
      .maybeSingle();

    if (exerciseErr) return json({ error: exerciseErr.message }, 500);
    if (!exercise) return json({ error: "Exercise not found" }, 404);

    const storagePath = normalizeStoragePath(exercise.source_storage_path || extractExerciseStoragePath(exercise.source_video_url));
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
      candidateUrls.push(`https://stream.mux.com/${exercise.mux_playback_id}/capped-1080p.mp4`);
      candidateUrls.push(`https://stream.mux.com/${exercise.mux_playback_id}/high.mp4`);
      candidateUrls.push(`https://stream.mux.com/${exercise.mux_playback_id}/medium.mp4`);
    }

    if (exercise.mux_asset_id && MUX_TOKEN_ID && MUX_TOKEN_SECRET) {
      await fetch(`https://api.mux.com/video/v1/assets/${exercise.mux_asset_id}/master-access`, {
        method: "PUT",
        headers: { Authorization: MUX_AUTH, "Content-Type": "application/json" },
        body: JSON.stringify({ master_access: "temporary" }),
      }).catch(() => null);
      const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${exercise.mux_asset_id}`, {
        headers: { Authorization: MUX_AUTH },
      });
      const assetData = await assetRes.json().catch(() => null);
      const masterUrl = assetData?.data?.master?.url;
      if (masterUrl) candidateUrls.push(masterUrl);
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