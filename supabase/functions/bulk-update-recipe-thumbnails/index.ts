import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PhotoUpdate {
  recipe_id: string;
  filename: string;
  data_base64: string;
  mime: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.claims.sub)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { photos } = (await req.json()) as { photos: PhotoUpdate[] };
    const results: { recipe_id: string; ok: boolean; url?: string; error?: string }[] = [];

    for (const p of photos) {
      try {
        const bytes = Uint8Array.from(atob(p.data_base64), (c) => c.charCodeAt(0));
        const ext = (p.filename.split(".").pop() || "jpg").toLowerCase();
        const path = `recipes/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await admin.storage
          .from("recipe-images")
          .upload(path, bytes, { contentType: p.mime, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = admin.storage.from("recipe-images").getPublicUrl(path);
        const { error: updErr } = await admin
          .from("recipes")
          .update({ thumbnail_url: pub.publicUrl })
          .eq("id", p.recipe_id);
        if (updErr) throw updErr;
        results.push({ recipe_id: p.recipe_id, ok: true, url: pub.publicUrl });
      } catch (e) {
        results.push({
          recipe_id: p.recipe_id,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
