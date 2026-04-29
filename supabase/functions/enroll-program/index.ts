import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const { questionnaireId, programName, programGoal, durationWeeks } = await req.json();

    // Rate limit: 5 enrollments per day
    const rlAllowed = await checkRateLimit(userId, "enroll-program", 5, 1440);
    if (!rlAllowed) return rateLimitResponse(corsHeaders);

    if (!questionnaireId || !programName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const weeks = durationWeeks || 4;

    // Fetch questionnaire
    const { data: q, error: qErr } = await supabaseAdmin
      .from("client_questionnaires")
      .select("*")
      .eq("id", questionnaireId)
      .eq("user_id", userId)
      .single();

    if (qErr || !q) {
      return new Response(JSON.stringify({ error: "Questionnaire not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch exercise library
    const { data: exerciseLibrary } = await supabaseAdmin
      .from("exercises")
      .select("title, muscle_group, equipment, difficulty")
      .order("title");

    const exerciseList = (exerciseLibrary || [])
      .map((e: any) => `- ${e.title} [${e.muscle_group}] (${e.equipment || "bodyweight"})`)
      .join("\n");

    console.log(`[ENROLL] Generating ${programName} (${weeks} weeks) for user ${userId}`);

    // Age-based guidelines
    const clientAge = q.age || 30;
    let ageGuidelines = "";
    if (clientAge >= 60) {
      ageGuidelines = `Client is ${clientAge} years old (senior). Use joint-friendly exercises, moderate weights, higher reps (12-15+). Avoid heavy compound lifts with high spinal load.`;
    } else if (clientAge >= 50) {
      ageGuidelines = `Client is ${clientAge} years old. Use moderate intensity, controlled movements, include mobility work.`;
    } else if (clientAge <= 18) {
      ageGuidelines = `Client is ${clientAge} years old (youth). Focus on form, moderate weights, bodyweight exercises. Avoid maximal attempts.`;
    }

    const workoutDuration = q.workout_duration_minutes || 60;

    const prompt = `Generate a ${weeks}-week "${programName}" training program.

Program goal: ${programGoal || programName}

Client info:
- Sex: ${q.sex}, Age: ${clientAge}, Weight: ${q.weight_lbs} lbs
- Activity level: ${q.activity_level}
- Workout days per week: ${q.workout_days_per_week}
- Available equipment: ${q.training_methods?.join(", ") || "bodyweight"}
- Session duration: ${workoutDuration} minutes
${ageGuidelines ? `\n${ageGuidelines}` : ""}

CRITICAL: You MUST ONLY use exercises from this library (exact names):
${exerciseList}

WORKOUT STRUCTURE:
1. WARM-UP: First 1-2 exercises must be dynamic warm-up (5 min)
2. MAIN WORKOUT: Fit within ${workoutDuration} minutes
3. COOL-DOWN: Last exercise must be "Cool-Down Stretches" (5 min)

Create exactly ${q.workout_days_per_week} training days per week as ONE repeating template.
Make it progressively challenging and specific to "${programName}".

Respond with ONLY valid JSON:
{
  "days": [
    {
      "day_number": 1,
      "day_label": "Day 1",
      "focus": "Focus Area",
      "exercises": [
        {
          "exercise_name": "Exercise Name",
          "muscle_group": "group",
          "sets": 3,
          "reps": "10",
          "rest_seconds": 60,
          "notes": "coaching cue"
        }
      ]
    }
  ]
}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert strength & conditioning coach specializing in "${programName}" programs. Generate safe, evidence-based training. Use ONLY exercises from the provided library. Respond with ONLY valid JSON.`,
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) throw new Error(`AI error: ${aiResp.status}`);

    const aiData = await aiResp.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) throw new Error("No AI response");

    let planData;
    let clean = aiContent.trim();
    if (clean.startsWith("```json")) clean = clean.slice(7);
    if (clean.startsWith("```")) clean = clean.slice(3);
    if (clean.endsWith("```")) clean = clean.slice(0, -3);
    planData = JSON.parse(clean.trim());

    // Validate exercises against library
    const libraryTitles = new Set((exerciseLibrary || []).map((e: any) => e.title.toLowerCase()));
    const allowedExceptions = ["dynamic warm-up", "treadmill walk", "cool-down stretches", "warmup", "cooldown"];
    for (const day of planData.days) {
      day.exercises = day.exercises.filter((ex: any) => {
        const name = ex.exercise_name.toLowerCase();
        const isException = allowedExceptions.some((ae) => name.includes(ae)) ||
          ex.muscle_group === "warmup" || ex.muscle_group === "cooldown";
        return libraryTitles.has(name) || isException;
      });
    }

    // Deactivate existing training plans
    await supabaseAdmin
      .from("client_training_plans")
      .update({ status: "archived" })
      .eq("user_id", userId)
      .eq("status", "active");

    // Create new plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from("client_training_plans")
      .insert({
        user_id: userId,
        questionnaire_id: questionnaireId,
        title: `${programName} - ${weeks} Week Program`,
        cycle_number: q.cycle_number || 1,
        workout_days_per_week: q.workout_days_per_week,
        duration_weeks: weeks,
        status: "active",
      })
      .select()
      .single();

    if (planError) throw new Error("Failed to create training plan");

    // Insert days and exercises for each week
    for (let week = 0; week < weeks; week++) {
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

    console.log(`[ENROLL] Plan created: ${plan.id} (${weeks} weeks)`);

    return new Response(
      JSON.stringify({ success: true, planId: plan.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("enroll-program error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
