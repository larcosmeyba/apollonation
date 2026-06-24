// Mints a short-lived signed JWT for Mux playback. Caller must be an
// authenticated user. Returns a token scoped to a single playback ID.
//
// Signed playback URLs look like:
//   https://stream.mux.com/{playbackId}.m3u8?token={jwt}
//   https://image.mux.com/{playbackId}/thumbnail.jpg?token={jwt}
//
// We sign separate tokens per audience (`aud`): "v" = video, "t" = thumbnail,
// "g" = animated gif, "s" = storyboard. This function returns the "v" token by
// default and optionally a "t" token when `include_thumbnail=true`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create as createJwt, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

const KEY_ID = Deno.env.get("MUX_SIGNING_KEY_ID") || "";
const KEY_PRIVATE = Deno.env.get("MUX_SIGNING_KEY_PRIVATE") || "";
const TOKEN_TTL_SECONDS = 60 * 30; // 30 minutes — long enough for a full class

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Mux signing keys are RSA PKCS1, base64-encoded in the dashboard download.
// The secret may be supplied either as raw PEM or as base64(PEM).
function loadPrivateKeyPem(): string {
  const raw = KEY_PRIVATE.trim();
  if (raw.includes("BEGIN")) return raw;
  // Decode base64 wrapper used by Mux dashboard exports.
  try {
    return atob(raw);
  } catch {
    return raw;
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedKey: CryptoKey | null = null;
async function getSigningKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const pem = loadPrivateKeyPem();
  const ab = pemToArrayBuffer(pem);
  cachedKey = await crypto.subtle.importKey(
    "pkcs8",
    ab,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return cachedKey;
}

async function mintToken(playbackId: string, aud: "v" | "t" | "g" | "s"): Promise<string> {
  const key = await getSigningKey();
  return await createJwt(
    { alg: "RS256", typ: "JWT", kid: KEY_ID },
    {
      sub: playbackId,
      aud,
      exp: getNumericDate(TOKEN_TTL_SECONDS),
    },
    key,
  );
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const pre = handlePreflight(req); if (pre) return pre;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    if (!KEY_ID || !KEY_PRIVATE) {
      return json({ error: "Mux signing key not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const playbackId = typeof body.playback_id === "string" ? body.playback_id.trim() : "";
    const includeThumbnail = body.include_thumbnail === true;

    if (!playbackId || !/^[a-zA-Z0-9]+$/.test(playbackId)) {
      return json({ error: "valid playback_id required" }, 400);
    }

    // Entitlement check: any authenticated user may stream. Public marketing
    // assets (e.g. landing-page reels) should remain on public policy and
    // never call this function. If we add per-tier gating later, scope it
    // here by joining playback_id back to its source row.

    const video = await mintToken(playbackId, "v");
    const thumbnail = includeThumbnail ? await mintToken(playbackId, "t") : undefined;

    return json({
      token: video,
      thumbnail_token: thumbnail,
      expires_in: TOKEN_TTL_SECONDS,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
