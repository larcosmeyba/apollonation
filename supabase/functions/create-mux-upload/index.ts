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
    const classId = typeof body.class_id === "string" ? body.class_id : "";
    if (!classId) return json({ error: "class_id required" }, 400);

    const { data: cls, error: clsErr } = await supabase
      .from("admin_classes")
      .select("id,title,class_type")
      .eq("id", classId)
      .maybeSingle();

    if (clsErr || !cls) return json({ error: "Class not found or forbidden" }, 403);

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
          passthrough: `admin_class:${classId}`,
          meta: {
            title: cls.title || "Apollo On-Demand Class",
            category: cls.class_type || "strength",
          },
        },
      }),
    });

    const muxData = await muxRes.json().catch(async () => ({ raw: await muxRes.text() }));
    if (!muxRes.ok) {
      return json({ error: muxData?.error?.messages?.join(" ") || muxData?.error?.message || "Mux upload failed" }, 502);
    }

    await service
      .from("admin_classes")
      .update({
        mux_status: "processing",
        mux_asset_id: null,
        mux_playback_id: null,
        video_url: null,
      })
      .eq("id", classId);

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