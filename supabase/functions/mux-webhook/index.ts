// Receives Mux webhooks.
//
// Two responsibilities:
//   1. Keep `render_jobs` rows in sync when stitched assets are ready (existing
//      class-builder flow — matched by Mux `passthrough` = job id).
//   2. Auto-ingest every other ready asset into Apollo's content database by
//      parsing the asset's `meta.title` naming convention:
//
//        EX_LIBRARY_<ExerciseName>_<BodyPart>          → admin_exercises (vertical)
//        CLASS_<CATEGORY>_<ClassName>_<BodyPart>       → admin_classes   (horizontal)
//
//      Examples:
//        EX_LIBRARY_Goblet_Squat_Glutes
//        CLASS_STRENGTH_GluteBridge_Glutes

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const WEBHOOK_SECRET = Deno.env.get("MUX_WEBHOOK_SECRET") || "";

// Mux signs webhooks with `Mux-Signature: t=<ts>,v1=<hex hmac sha256>`.
async function verifyMuxSignature(rawBody: string, header: string | null) {
  if (!WEBHOOK_SECRET || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=")),
  );
  const ts = parts["t"];
  const sig = parts["v1"];
  if (!ts || !sig) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const macBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${ts}.${rawBody}`),
  );
  const expected = Array.from(new Uint8Array(macBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Naming parser
// ─────────────────────────────────────────────────────────────────────────────

type ParsedAsset =
  | {
      contentType: "exercise";
      category: string; // "library"
      name: string;
      bodyPart: string | null;
    }
  | {
      contentType: "class";
      category: string; // "strength" | "sculpt" | ...
      name: string;
      bodyPart: string | null;
    };

const CLASS_CATEGORIES = new Set([
  "strength",
  "sculpt",
  "stretch",
  "cardio",
  "hiit",
  "cycling",
  "recovery",
  "beginner",
]);

const KNOWN_BODY_PARTS = new Set([
  "glutes", "legs", "quads", "hamstrings", "calves", "core", "abs",
  "back", "chest", "shoulders", "arms", "biceps", "triceps",
  "fullbody", "full-body", "cardio", "hips", "mobility",
]);

const splitCamel = (s: string) =>
  s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_+/g, " ").trim();

export function parseAssetTitle(raw: string | null | undefined): ParsedAsset | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\.[^.]+$/, ""); // strip extension
  const tokens = cleaned.split(/[_\s]+/).filter(Boolean);
  if (tokens.length < 3) return null;

  const head = tokens[0].toUpperCase();

  // EX_LIBRARY_<name parts...>[_<bodyPart>]
  if (head === "EX" && tokens[1]?.toUpperCase() === "LIBRARY") {
    const rest = tokens.slice(2);
    let bodyPart: string | null = null;
    const tail = rest[rest.length - 1];
    if (tail && KNOWN_BODY_PARTS.has(tail.toLowerCase())) {
      bodyPart = splitCamel(tail);
      rest.pop();
    }
    const name = splitCamel(rest.join(" "));
    if (!name) return null;
    return { contentType: "exercise", category: "library", name, bodyPart };
  }

  // CLASS_<CATEGORY>_<name parts...>[_<bodyPart>]
  if (head === "CLASS") {
    const cat = tokens[1]?.toLowerCase();
    if (!cat || !CLASS_CATEGORIES.has(cat)) return null;
    const rest = tokens.slice(2);
    let bodyPart: string | null = null;
    const tail = rest[rest.length - 1];
    if (tail && KNOWN_BODY_PARTS.has(tail.toLowerCase())) {
      bodyPart = splitCamel(tail);
      rest.pop();
    }
    const name = splitCamel(rest.join(" "));
    if (!name) return null;
    return { contentType: "class", category: cat, name, bodyPart };
  }

  return null;
}

// Mux aspect ratios are e.g. "9:16" / "16:9". Anything taller than wide is vertical.
function orientationFromAspect(aspect: string | null | undefined, fallback: "horizontal" | "vertical") {
  if (!aspect || !aspect.includes(":")) return fallback;
  const [w, h] = aspect.split(":").map(Number);
  if (!w || !h) return fallback;
  return h > w ? "vertical" : "horizontal";
}

// ─────────────────────────────────────────────────────────────────────────────
// Ingest into admin tables
// ─────────────────────────────────────────────────────────────────────────────

async function syncAssetToLibrary(
  supabase: ReturnType<typeof createClient>,
  asset: any,
) {
  const title: string | undefined = asset?.meta?.title || asset?.passthrough;
  const parsed = parseAssetTitle(title);
  if (!parsed) {
    console.log("[mux-webhook] no parseable title, skipping ingest:", title);
    return;
  }

  const playbackId = asset?.playback_ids?.[0]?.id || null;
  const assetId = asset?.id || null;
  const duration = asset?.duration ? Number(asset.duration) : null;
  const thumbnail = playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&fit_mode=smartcrop`
    : null;

  if (parsed.contentType === "exercise") {
    const orientation = orientationFromAspect(asset?.aspect_ratio, "vertical");
    const { error } = await supabase
      .from("admin_exercises")
      .upsert(
        {
          mux_asset_id: assetId,
          mux_playback_id: playbackId,
          name: parsed.name,
          body_part: parsed.bodyPart,
          muscle_group: parsed.bodyPart?.toLowerCase() ?? null,
          category: "library",
          orientation,
          thumbnail_url: thumbnail,
          duration_seconds: duration,
        },
        { onConflict: "mux_asset_id" },
      );
    if (error) console.error("[mux-webhook] exercise upsert failed", error);
    else console.log("[mux-webhook] synced exercise:", parsed.name);
  } else {
    const orientation = orientationFromAspect(asset?.aspect_ratio, "horizontal");
    const { error } = await supabase
      .from("admin_classes")
      .upsert(
        {
          mux_asset_id: assetId,
          mux_playback_id: playbackId,
          title: parsed.name,
          body_part: parsed.bodyPart,
          class_type: parsed.category,
          orientation,
          source_type: "uploaded",
          thumbnail_url: thumbnail,
          duration_seconds: duration,
          duration_minutes: duration ? Math.max(1, Math.round(duration / 60)) : 20,
          status: "draft",
        },
        { onConflict: "mux_asset_id" },
      );
    if (error) console.error("[mux-webhook] class upsert failed", error);
    else console.log("[mux-webhook] synced class:", parsed.name);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP handler
// ─────────────────────────────────────────────────────────────────────────────

async function linkAssetToAdminClass(
  supabase: ReturnType<typeof createClient>,
  classId: string,
  asset: any,
) {
  const playbackId = asset?.playback_ids?.[0]?.id || null;
  const assetId = asset?.id || null;
  const duration = asset?.duration ? Number(asset.duration) : null;
  const update: Record<string, unknown> = {
    mux_asset_id: assetId,
    mux_status: "processing",
    source_type: "uploaded",
  };

  if (playbackId) {
    update.mux_playback_id = playbackId;
    update.video_url = `https://stream.mux.com/${playbackId}.m3u8`;
    update.thumbnail_url = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&fit_mode=smartcrop`;
    update.mux_status = "ready";
  }
  if (duration) {
    update.duration_seconds = duration;
    update.duration_minutes = Math.max(1, Math.round(duration / 60));
  }

  const { error } = await supabase
    .from("admin_classes")
    .update(update)
    .eq("id", classId);
  if (error) console.error("[mux-webhook] admin class upload link failed", error);
  else console.log("[mux-webhook] linked uploaded class asset:", classId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const sigHeader = req.headers.get("mux-signature");

  const valid = await verifyMuxSignature(raw, sigHeader);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = JSON.parse(raw);
  const type = payload.type as string;
  const data = payload.data || {};
  const passthrough = data.passthrough as string | undefined;
  const assetId = data.id as string | undefined;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const adminClassUpload = passthrough?.match(/^admin_class:([0-9a-f-]{36})$/i);
  if (adminClassUpload) {
    if (type === "video.asset.ready") {
      await linkAssetToAdminClass(supabase, adminClassUpload[1], data);
    } else if (type === "video.asset.created") {
      await supabase
        .from("admin_classes")
        .update({ mux_status: "processing", mux_asset_id: assetId ?? null })
        .eq("id", adminClassUpload[1]);
    } else if (type === "video.asset.errored" || type === "video.upload.errored") {
      await supabase
        .from("admin_classes")
        .update({ mux_status: "errored", mux_asset_id: assetId ?? null })
        .eq("id", adminClassUpload[1]);
      console.error("[mux-webhook] uploaded class asset errored", adminClassUpload[1], data.errors || data);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 1. Existing render_jobs sync (stitched class builder) ───────────────
  const matchById = passthrough
    ? { id: passthrough }
    : assetId
      ? { mux_asset_id: assetId }
      : null;

  if (matchById) {
    if (type === "video.asset.ready") {
      const playbackId = data.playback_ids?.[0]?.id || null;
      const duration = data.duration || null;
      const mp4Url = playbackId
        ? `https://stream.mux.com/${playbackId}/high.mp4`
        : null;

      await supabase
        .from("render_jobs")
        .update({
          status: "ready",
          mux_playback_id: playbackId,
          mp4_url: mp4Url,
          duration_seconds: duration,
          mux_asset_id: assetId,
          error: null,
        })
        .match(matchById);

      // Auto-link the stitched asset back to its admin_classes row so
      // publishing flows the playback id into client-facing workouts.
      try {
        const { data: jobRow } = await supabase
          .from("render_jobs")
          .select("class_id")
          .match(matchById)
          .maybeSingle();
        const classId = (jobRow as any)?.class_id;
        if (classId && playbackId) {
          const thumb = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&fit_mode=smartcrop`;
          await supabase
            .from("admin_classes")
            .update({
              mux_playback_id: playbackId,
              mux_asset_id: assetId,
              thumbnail_url: thumb,
              duration_seconds: duration,
              duration_minutes: duration
                ? Math.max(1, Math.round(Number(duration) / 60))
                : undefined,
            })
            .eq("id", classId);
        }
      } catch (e) {
        console.error("[mux-webhook] admin_classes link failed", e);
      }

    } else if (
      type === "video.asset.errored" ||
      type === "video.upload.errored"
    ) {
      await supabase
        .from("render_jobs")
        .update({
          status: "failed",
          error: JSON.stringify(data.errors || data),
        })
        .match(matchById);
    } else if (type === "video.asset.created") {
      await supabase
        .from("render_jobs")
        .update({ status: "rendering", mux_asset_id: assetId })
        .match(matchById);
    }
  }

  // ── 2. Auto-ingest non-stitched uploads into the content library ────────
  // Only on `ready` (we need playback id + duration + aspect ratio).
  // Skip stitched render jobs — those carry a `passthrough` job id.
  if (type === "video.asset.ready" && !passthrough) {
    try {
      await syncAssetToLibrary(supabase, data);
    } catch (e) {
      console.error("[mux-webhook] library sync failed", e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
