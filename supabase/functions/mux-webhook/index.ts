// Receives Mux webhooks. When a stitched asset becomes ready, we
// store the playback ID and MP4 URL on the render_jobs row using
// the asset's `passthrough` (= job id).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const WEBHOOK_SECRET = Deno.env.get("MUX_WEBHOOK_SECRET") || "";

// Mux signs webhooks with `Mux-Signature: t=<ts>,v1=<hex hmac sha256>`.
// We re-compute the HMAC over `${ts}.${rawBody}` to verify authenticity.
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

  // constant-time compare
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
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

  if (!passthrough && !assetId) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const matchById = passthrough
    ? { id: passthrough }
    : { mux_asset_id: assetId! };

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

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
