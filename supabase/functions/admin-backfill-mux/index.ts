// One-shot admin utility: pulls every Mux asset and upserts it into
// admin_exercises / admin_classes using the same naming convention parser
// the live `mux-webhook` uses for new uploads.
//
// Auth: requires an admin user JWT. Idempotent (onConflict mux_asset_id).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLASS_CATEGORIES = new Set([
  "strength","sculpt","stretch","cardio","hiit","cycling","recovery","beginner",
]);
const KNOWN_BODY_PARTS = new Set([
  "glutes","legs","quads","hamstrings","calves","core","abs",
  "back","chest","shoulders","arms","biceps","triceps",
  "fullbody","full-body","cardio","hips","mobility",
]);
const splitCamel = (s: string) =>
  s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_+/g, " ").trim();

function parseTitle(raw: string | null | undefined) {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\.[^.]+$/, "");
  const tokens = cleaned.split(/[_\s]+/).filter(Boolean);
  if (tokens.length < 3) return null;
  const head = tokens[0].toUpperCase();

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
    return { contentType: "exercise" as const, category: "library", name, bodyPart };
  }
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
    return { contentType: "class" as const, category: cat, name, bodyPart };
  }
  return null;
}

function orientation(aspect: string | null | undefined, fallback: "vertical" | "horizontal") {
  if (!aspect?.includes(":")) return fallback;
  const [w, h] = aspect.split(":").map(Number);
  if (!w || !h) return fallback;
  return h > w ? "vertical" : "horizontal";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: admin user OR CRON_SECRET header (for one-shot backfills).
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const providedCron = req.headers.get("x-cron-secret") ?? "";
    const isCron = cronSecret && providedCron && providedCron === cronSecret;
    if (!isCron) {
      const auth = req.headers.get("Authorization") ?? "";
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data: userRes } = await userClient.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
      if (!roleRow) return new Response(JSON.stringify({ error: "admin_only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tokenId = Deno.env.get("MUX_TOKEN_ID")!;
    const tokenSecret = Deno.env.get("MUX_TOKEN_SECRET")!;
    const basic = btoa(`${tokenId}:${tokenSecret}`);

    const results = { exercises: 0, classes: 0, skipped: 0, errors: [] as string[] };
    let cursor: string | null = null;
    let page = 0;

    do {
      page++;
      const url = new URL("https://api.mux.com/video/v1/assets");
      url.searchParams.set("limit", "100");
      if (cursor) url.searchParams.set("page", String(page));
      const res = await fetch(url.toString(), { headers: { Authorization: `Basic ${basic}` } });
      if (!res.ok) {
        results.errors.push(`Mux fetch failed page ${page}: ${res.status}`);
        break;
      }
      const json = await res.json();
      const assets: any[] = json.data || [];
      if (assets.length === 0) break;

      for (const asset of assets) {
        if (asset.status !== "ready") { results.skipped++; continue; }
        const title = asset?.meta?.title || asset?.passthrough;
        const parsed = parseTitle(title);
        if (!parsed) { results.skipped++; continue; }
        const playbackId = asset?.playback_ids?.[0]?.id || null;
        const assetId = asset?.id;
        const duration = asset?.duration ? Number(asset.duration) : null;
        const thumbnail = playbackId
          ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&fit_mode=smartcrop`
          : null;

        if (parsed.contentType === "exercise") {
          const { error } = await supabase.from("admin_exercises").upsert({
            mux_asset_id: assetId,
            mux_playback_id: playbackId,
            name: parsed.name,
            body_part: parsed.bodyPart,
            muscle_group: parsed.bodyPart?.toLowerCase() ?? null,
            orientation: orientation(asset?.aspect_ratio, "vertical"),
            thumbnail_url: thumbnail,
            duration_seconds: duration,
          }, { onConflict: "mux_asset_id" });
          if (error) results.errors.push(`ex ${parsed.name}: ${error.message}`);
          else results.exercises++;
        } else {
          const { error } = await supabase.from("admin_classes").upsert({
            mux_asset_id: assetId,
            mux_playback_id: playbackId,
            title: parsed.name,
            body_part: parsed.bodyPart,
            class_type: parsed.category,
            orientation: orientation(asset?.aspect_ratio, "horizontal"),
            source_type: "uploaded",
            thumbnail_url: thumbnail,
            duration_seconds: duration,
            duration_minutes: duration ? Math.max(1, Math.round(duration / 60)) : 20,
            status: "draft",
          }, { onConflict: "mux_asset_id" });
          if (error) results.errors.push(`cls ${parsed.name}: ${error.message}`);
          else results.classes++;
        }
      }

      // Mux paginates with `page` numbers; stop when fewer than the limit returned.
      if (assets.length < 100) break;
      cursor = String(page);
    } while (page < 20);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
