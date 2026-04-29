import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 30 requests per user per hour
    const swapAllowed = await checkRateLimit(userData.user.id, "suggest-exercise-swap", 30, 60);
    if (!swapAllowed) return rateLimitResponse(corsHeaders);

    const { exerciseName, muscleGroup, availableEquipment } = await req.json();

    if (!exerciseName) {
      return new Response(JSON.stringify({ error: "Missing exercise name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch exercise library to constrain suggestions
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: exerciseLibrary } = await supabaseAdmin
      .from("exercises")
      .select("title, muscle_group, equipment, difficulty")
      .order("title");

    const exerciseList = (exerciseLibrary || [])
      .map((e: any) => `- ${e.title} [${e.muscle_group}] (${e.equipment || "bodyweight"})`)
      .join("\n");

    const prompt = `Suggest 3 alternative exercises to replace "${exerciseName}" that target the same movement pattern and muscle group (${muscleGroup || "unknown"}).

${availableEquipment ? `Available equipment: ${availableEquipment.join(", ")}` : ""}

CRITICAL RULE: You MUST ONLY suggest exercises from the following exercise library. Do NOT invent or suggest any exercise that is not on this list. Use the EXACT exercise name as written below.

AVAILABLE EXERCISES:
${exerciseList}

Requirements:
- Same primary muscle group
- Similar movement pattern (e.g., push for push, pull for pull, hinge for hinge)
- Safe and evidence-based alternatives
- Select ONLY from the list above

Respond with ONLY valid JSON:
{
  "alternatives": [
    {
      "exercise_name": "name",
      "muscle_group": "primary muscle",
      "movement_pattern": "push/pull/hinge/squat/carry/rotation",
      "difficulty": "beginner/intermediate/advanced",
      "reason": "Brief explanation why this is a good swap"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are an expert exercise physiologist. Suggest safe alternative exercises. You MUST ONLY select exercises from the provided exercise library. Never invent exercises. Respond with ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${response.status}`);

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    let data;
    try {
      let clean = content.trim();
      if (clean.startsWith("```json")) clean = clean.slice(7);
      if (clean.startsWith("```")) clean = clean.slice(3);
      if (clean.endsWith("```")) clean = clean.slice(0, -3);
      data = JSON.parse(clean.trim());
    } catch {
      throw new Error("Failed to parse alternatives");
    }

    // Validate that suggested exercises exist in the library
    const libraryTitles = new Set((exerciseLibrary || []).map((e: any) => e.title.toLowerCase()));
    if (data.alternatives) {
      data.alternatives = data.alternatives.filter((alt: any) =>
        libraryTitles.has(alt.exercise_name.toLowerCase())
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("suggest-exercise-swap error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
