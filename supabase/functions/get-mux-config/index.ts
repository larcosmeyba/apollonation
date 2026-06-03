// Returns the public Mux Data environment key. Safe to expose to clients —
// Mux Data env keys are designed to ship in player code.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const envKey = Deno.env.get("MUX_DATA_ENV_KEY") ?? "";
  return new Response(
    JSON.stringify({ env_key: envKey }),
    { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } },
  );
});
