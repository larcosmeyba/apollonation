import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const pre = handlePreflight(req); if (pre) return pre;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return json({ error: "Unauthorized" }, 401);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roles) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    if (!name) return json({ error: "name required" }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    const systemPrompt = `You are a certified strength coach generating exercise metadata for a coaching platform. Return ONLY valid JSON matching the requested schema. Be concise, specific, and safety-aware.

Rules:
- coaching_notes: 2-4 short coaching cues (form, breathing, common mistakes). One sentence each, separated by line breaks.
- weight_recommendation: AVERAGE target ranges by experience level. Format example: "Beginner: 5-10 lbs · Intermediate: 15-25 lbs · Advanced: 30-45 lbs". Use bodyweight or "N/A" if no weight applies.
- tempo_recommendation: standard tempo notation (eccentric-pause-concentric-pause), e.g. "3-1-1-0".
- contraindications: ALWAYS list specific injuries/conditions where this exercise should be avoided or modified (e.g. "Avoid with: lower back pain, shoulder impingement, knee instability"). Be specific to the movement.
- equipment: array from this list ONLY: ["bodyweight","dumbbells","barbell","kettlebell","bands","bench","mat","bike","rower","machine"].
- movement_type: one of ["push","pull","squat","hinge","carry","rotation","lunge","isometric","plyometric","cardio"].
- muscle_group: one of ["chest","back","shoulders","arms","legs","glutes","core","full-body","cardio"].
- difficulty: one of ["beginner","intermediate","advanced"].`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      signal: AbortSignal.timeout(45_000),
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Exercise name: "${name}". Generate metadata.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "fill_exercise",
            description: "Fill exercise metadata",
            parameters: {
              type: "object",
              properties: {
                coaching_notes: { type: "string" },
                weight_recommendation: { type: "string" },
                tempo_recommendation: { type: "string" },
                contraindications: { type: "string" },
                equipment: { type: "array", items: { type: "string" } },
                movement_type: { type: "string" },
                muscle_group: { type: "string" },
                difficulty: { type: "string" },
              },
              required: ["coaching_notes", "weight_recommendation", "tempo_recommendation", "contraindications", "equipment", "movement_type", "muscle_group", "difficulty"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "fill_exercise" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return json({ error: "Rate limit hit, try again shortly" }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted" }, 402);
      return json({ error: `AI error: ${txt}` }, 500);
    }

    const aiData = await aiRes.json();
    const args = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ error: "No AI response" }, 500);
    const parsed = JSON.parse(args);

    return json(parsed, 200);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
