import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const adminId = userData.user.id;

    // Verify admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { questionnaire, clientUserId } = await req.json();

    if (!questionnaire || !clientUserId) {
      return new Response(JSON.stringify({ error: "Missing data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { workout_days_per_week, training_methods, goal_next_4_weeks, sex, age, weight_lbs, activity_level } = questionnaire;

    const prompt = `Generate a 4-week training program for a client with these specifications:

- Sex: ${sex}
- Age: ${age}
- Weight: ${weight_lbs} lbs
- Activity level: ${activity_level}
- Workout days per week: ${workout_days_per_week}
- Available equipment: ${training_methods?.join(", ") || "bodyweight"}
- Goal: ${goal_next_4_weeks || "general fitness"}

Create a program with exactly ${workout_days_per_week} training days per week. For the 4-week program, provide ONE week template that repeats.

For each training day, assign a focus (e.g., "Upper Body Push", "Lower Body", "Full Body", "Pull Day") and list 5-7 exercises.

You MUST respond with ONLY valid JSON (no markdown, no code blocks):
{
  "days": [
    {
      "day_number": 1,
      "day_label": "Day 1",
      "focus": "Upper Body Push",
      "exercises": [
        {
          "exercise_name": "Barbell Bench Press",
          "muscle_group": "chest",
          "sets": 4,
          "reps": "8-10",
          "rest_seconds": 90,
          "notes": "Focus on controlled eccentric"
        }
      ]
    }
  ]
}

Make exercises safe, evidence-based, and appropriate for the client's experience level. Match exercises to available equipment.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert strength & conditioning coach. Generate safe, evidence-based training programs. Respond with ONLY valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    let planData;
    try {
      let clean = content.trim();
      if (clean.startsWith("```json")) clean = clean.slice(7);
      if (clean.startsWith("```")) clean = clean.slice(3);
      if (clean.endsWith("```")) clean = clean.slice(0, -3);
      planData = JSON.parse(clean.trim());
    } catch {
      console.error("Failed to parse:", content);
      throw new Error("Failed to parse training plan");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create training plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from("client_training_plans")
      .insert({
        user_id: clientUserId,
        questionnaire_id: questionnaire.id,
        title: `${goal_next_4_weeks || "Training"} Program - Cycle ${questionnaire.cycle_number || 1}`,
        cycle_number: questionnaire.cycle_number || 1,
        workout_days_per_week,
        duration_weeks: 4,
        status: "active",
      })
      .select()
      .single();

    if (planError) throw new Error("Failed to create training plan");

    // Insert days and exercises for 4 weeks
    for (let week = 0; week < 4; week++) {
      for (const day of planData.days) {
        const actualDay = week * 7 + day.day_number;

        const { data: dayRow, error: dayError } = await supabaseAdmin
          .from("training_plan_days")
          .insert({
            plan_id: plan.id,
            day_number: actualDay,
            day_label: `Week ${week + 1} - ${day.day_label}`,
            focus: day.focus,
          })
          .select()
          .single();

        if (dayError) {
          console.error("Day insert error:", dayError);
          continue;
        }

        const exercises = day.exercises.map((ex: any, i: number) => ({
          day_id: dayRow.id,
          exercise_name: ex.exercise_name,
          muscle_group: ex.muscle_group || null,
          sets: ex.sets || 3,
          reps: ex.reps || "10",
          rest_seconds: ex.rest_seconds || 60,
          notes: ex.notes || null,
          sort_order: i,
        }));

        await supabaseAdmin.from("training_plan_exercises").insert(exercises);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      plan,
      daysCount: planData.days.length * 4,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-training-plan error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
