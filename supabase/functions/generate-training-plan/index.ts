import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { wrapUserInput, PROMPT_INJECTION_GUARD } from "../_shared/prompt-safety.ts";

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

    // Rate limit: 5 requests per admin per day (1440 min)
    const allowed = await checkRateLimit(adminId as string, "generate-training-plan", 5, 1440);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { questionnaire, clientUserId } = await req.json();

    if (!questionnaire || !clientUserId) {
      return new Response(JSON.stringify({ error: "Missing data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // ──────── FETCH EXERCISE LIBRARY ────────
    const { data: exerciseLibrary, error: exErr } = await supabaseAdmin
      .from("exercises")
      .select("title, muscle_group, equipment, difficulty")
      .order("title");

    if (exErr) {
      console.error("Failed to fetch exercises:", exErr);
      throw new Error("Failed to fetch exercise library");
    }

    const exerciseList = (exerciseLibrary || [])
      .map((e: any) => `- ${e.title} [${e.muscle_group}] (${e.equipment || "bodyweight"})`)
      .join("\n");

    console.log(`Exercise library loaded: ${exerciseLibrary?.length || 0} exercises`);

    const { workout_days_per_week, training_methods, goal_next_4_weeks, sex, age, weight_lbs, activity_level, workout_duration_minutes } = questionnaire;
    const workoutDuration = workout_duration_minutes || 60;
    const clientAge = age || 30;

    // Age-based training guidelines
    let ageGuidelines = "";
    if (clientAge >= 60) {
      ageGuidelines = `
AGE-SPECIFIC RULES (Client is ${clientAge} years old - Senior):
- Use LOWER intensity, moderate weights, higher reps (12-15+)
- Prioritize joint-friendly exercises (machines, cables, bodyweight)
- AVOID heavy compound lifts with high spinal load (heavy barbell squats, heavy deadlifts)
- Include extra balance and stability work
- Longer rest periods (90-120 seconds minimum)
- Focus on functional movement patterns
- Keep total volume moderate to prevent overtraining`;
    } else if (clientAge >= 50) {
      ageGuidelines = `
AGE-SPECIFIC RULES (Client is ${clientAge} years old - Mature Adult):
- Use moderate intensity, focus on controlled movements
- Avoid excessive plyometrics or high-impact exercises
- Include mobility work within the exercises
- Moderate rest periods (60-90 seconds)
- Prioritize injury prevention over maximal loading`;
    } else if (clientAge >= 40) {
      ageGuidelines = `
AGE-SPECIFIC RULES (Client is ${clientAge} years old):
- Include adequate warm-up movements
- Balance heavy compound lifts with joint-friendly accessory work
- Monitor total volume to prevent overuse injuries`;
    } else if (clientAge <= 18) {
      ageGuidelines = `
AGE-SPECIFIC RULES (Client is ${clientAge} years old - Youth):
- Focus on movement quality and form over heavy weights
- Use moderate weights with higher reps (10-15)
- Emphasize bodyweight exercises and movement skills
- Avoid maximal 1RM attempts
- Keep sessions fun and engaging`;
    }

    const prompt = `Generate a 4-week training program for a client with these specifications:

- Sex: ${sex}
- Age: ${clientAge}
- Weight: ${weight_lbs} lbs
- Activity level: ${activity_level}
- Workout days per week: ${workout_days_per_week}
- Available equipment: ${wrapUserInput(training_methods?.join(", ") || "bodyweight")}
- Goal: ${wrapUserInput(goal_next_4_weeks || "general fitness")}
- Available gym time: ${workoutDuration} minutes per session
${ageGuidelines}

CRITICAL RULE: You MUST ONLY use exercises from the following exercise library. Do NOT invent or suggest any exercise that is not on this list. Use the EXACT exercise name as written below.

AVAILABLE EXERCISES:
${exerciseList}

WORKOUT STRUCTURE RULES:
1. WARM-UP (REQUIRED): The FIRST 1-2 exercises of EVERY training day MUST be a dynamic warm-up. This can be a 5-minute treadmill walk/light jog OR 2-3 dynamic warm-up movements. Use exercises from the library if available, otherwise add "Dynamic Warm-Up" or "Treadmill Walk" as the first exercise with notes describing the warm-up.
2. MAIN WORKOUT: The body of the workout should fit within the client's available time of ${workoutDuration} minutes (minus warm-up and cool-down time).
3. COOL-DOWN (REQUIRED): The LAST exercise of EVERY training day MUST be a 5-minute cool-down consisting of static stretches. Add it as the final exercise with the name "Cool-Down Stretches" and include specific stretches in the notes field targeting the muscles worked that day.

Create a program with exactly ${workout_days_per_week} training days per week. For the 4-week program, provide ONE week template that repeats.

For each training day, assign a focus (e.g., "Upper Body Push", "Lower Body", "Full Body", "Pull Day") and list exercises. Adjust the number of exercises to fit within ${workoutDuration} minutes total (including warm-up and cool-down).

You MUST respond with ONLY valid JSON (no markdown, no code blocks):
{
  "days": [
    {
      "day_number": 1,
      "day_label": "Day 1",
      "focus": "Upper Body Push",
      "exercises": [
        {
          "exercise_name": "Treadmill Walk",
          "muscle_group": "warmup",
          "sets": 1,
          "reps": "5 min",
          "rest_seconds": 0,
          "notes": "Light pace to elevate heart rate, followed by arm circles and shoulder dislocates"
        },
        {
          "exercise_name": "Barbell Bench Press",
          "muscle_group": "chest",
          "sets": 4,
          "reps": "8-10",
          "rest_seconds": 90,
          "notes": "Focus on controlled eccentric"
        },
        {
          "exercise_name": "Cool-Down Stretches",
          "muscle_group": "cooldown",
          "sets": 1,
          "reps": "5 min",
          "rest_seconds": 0,
          "notes": "Chest doorway stretch, tricep stretch, shoulder cross-body stretch - hold each 30 seconds"
        }
      ]
    }
  ]
}

Make exercises safe, evidence-based, and appropriate for the client's age and experience level. Match exercises to available equipment. REMEMBER: Only use exercises from the provided list above (warm-up and cool-down entries are exceptions).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are an expert strength & conditioning coach. Generate safe, evidence-based training programs. You MUST ONLY select exercises from the provided exercise library. Never invent exercises. Use the exact exercise names as given. Respond with ONLY valid JSON.\n\n${PROMPT_INJECTION_GUARD}` },
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

    // Validate that all exercises exist in the library (allow warm-up/cool-down exceptions)
    const libraryTitles = new Set((exerciseLibrary || []).map((e: any) => e.title.toLowerCase()));
    const allowedExceptions = ["dynamic warm-up", "treadmill walk", "cool-down stretches", "warmup", "cooldown"];
    for (const day of planData.days) {
      day.exercises = day.exercises.filter((ex: any) => {
        const name = ex.exercise_name.toLowerCase();
        const isException = allowedExceptions.some(ae => name.includes(ae)) || 
                            ex.muscle_group === "warmup" || ex.muscle_group === "cooldown";
        const exists = libraryTitles.has(name);
        if (!exists && !isException) {
          console.warn(`Removing unlisted exercise: "${ex.exercise_name}"`);
        }
        return exists || isException;
      });
    }

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
