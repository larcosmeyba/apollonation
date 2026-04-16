import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IncomingRecipe {
  title: string;
  description?: string | null;
  category?: string | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  servings?: number | null;
  calories_per_serving?: number | null;
  protein_grams?: number | null;
  carbs_grams?: number | null;
  fat_grams?: number | null;
  ingredients?: string[];
  instructions?: string | null;
  dietary_tags?: string[];
  // Optional base64-encoded thumbnail (data: URL or raw base64). If provided, we upload to storage.
  thumbnail_base64?: string | null;
  thumbnail_mime?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recipes } = (await req.json()) as { recipes: IncomingRecipe[] };
    if (!Array.isArray(recipes) || recipes.length === 0) {
      return new Response(JSON.stringify({ error: "recipes array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const rows: Record<string, unknown>[] = [];

    for (const r of recipes) {
      let thumbnail_url: string | null = null;

      if (r.thumbnail_base64) {
        try {
          // Strip data: prefix if present
          let b64 = r.thumbnail_base64;
          let mime = r.thumbnail_mime || "image/jpeg";
          if (b64.startsWith("data:")) {
            const match = b64.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              mime = match[1];
              b64 = match[2];
            }
          }
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          const ext = mime.split("/")[1] || "jpg";
          const path = `${crypto.randomUUID()}.${ext}`;

          const { error: uploadErr } = await supabaseAdmin.storage
            .from("recipe-images")
            .upload(path, bytes, { contentType: mime, upsert: false });

          if (!uploadErr) {
            const { data: pub } = supabaseAdmin.storage.from("recipe-images").getPublicUrl(path);
            thumbnail_url = pub.publicUrl;
          } else {
            console.error("Image upload failed:", uploadErr);
          }
        } catch (e) {
          console.error("Image processing error:", e);
        }
      }

      rows.push({
        title: r.title,
        description: r.description || null,
        category: r.category || "main",
        prep_time_minutes: r.prep_time_minutes ?? null,
        cook_time_minutes: r.cook_time_minutes ?? null,
        servings: r.servings ?? null,
        calories_per_serving: r.calories_per_serving ?? null,
        protein_grams: r.protein_grams ?? null,
        carbs_grams: r.carbs_grams ?? null,
        fat_grams: r.fat_grams ?? null,
        ingredients: r.ingredients || [],
        instructions: r.instructions || null,
        dietary_tags: r.dietary_tags || [],
        thumbnail_url,
      });
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("recipes")
      .insert(rows)
      .select("id");

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save recipes: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, count: inserted?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("save-imported-recipes error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
