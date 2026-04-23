import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const SETUP_TOKEN = "apollo-recipe-photos-2026-bulk";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.headers.get("x-admin-token") !== SETUP_TOKEN) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { photos } = (await req.json()) as { photos: Array<{recipe_id:string;filename:string;data_base64:string;mime:string}> };
    const results: any[] = [];
    for (const p of photos) {
      try {
        const bytes = Uint8Array.from(atob(p.data_base64), (c) => c.charCodeAt(0));
        const ext = (p.filename.split(".").pop() || "jpg").toLowerCase();
        const path = `recipes/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await admin.storage.from("recipe-images").upload(path, bytes, { contentType: p.mime, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = admin.storage.from("recipe-images").getPublicUrl(path);
        const { error: updErr } = await admin.from("recipes").update({ thumbnail_url: pub.publicUrl }).eq("id", p.recipe_id);
        if (updErr) throw updErr;
        results.push({ recipe_id: p.recipe_id, ok: true });
      } catch (e) {
        results.push({ recipe_id: p.recipe_id, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
