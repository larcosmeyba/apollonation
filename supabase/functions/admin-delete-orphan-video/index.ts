// One-shot admin utility: deletes a file from a Supabase Storage bucket.
// Used to remove the orphaned .mov from `exercise-videos` after Apollo
// Reborn migrated all video delivery to Mux.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // One-shot cleanup endpoint; gated by CRON_SECRET header.
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== Deno.env.get("CRON_SECRET")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { bucket, paths } = await req.json();
    if (!bucket || !Array.isArray(paths) || paths.length === 0) {
      return json({ error: "bucket + paths[] required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await admin.storage.from(bucket).remove(paths);
    if (error) return json({ error: error.message }, 500);
    return json({ deleted: data });
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
