import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;
    const { questionnaireId, targetUserId } = await req.json();

    // Rate limit: 10 requests per user per day
    const rlAllowed = await checkRateLimit(callerId, "auto-generate-programs", 10, 1440);
    if (!rlAllowed) return rateLimitResponse(corsHeaders);

    if (!questionnaireId) {
      return new Response(JSON.stringify({ error: "Missing questionnaireId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If targetUserId is provided, verify caller is an admin
    let userId = callerId;
    if (targetUserId && targetUserId !== callerId) {
      const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: callerId, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = targetUserId;
      console.log("[AUTO-GEN] Admin override: generating for user", userId);
    }

    // Fetch the questionnaire (admin can fetch for any user)
    const { data: q, error: qErr } = await supabaseAdmin
      .from("client_questionnaires")
      .select("*")
      .eq("id", questionnaireId)
      .eq("user_id", userId)
      .single();

    if (qErr || !q) {
      return new Response(JSON.stringify({ error: "Questionnaire not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ──────── FETCH EXERCISE LIBRARY ────────
    // Only use exercises the coach has uploaded (prioritize those with video URLs)
    const { data: exerciseLibrary, error: exErr } = await supabaseAdmin
      .from("exercises")
      .select("title, muscle_group, equipment, difficulty")
      .order("title");

    if (exErr) {
      console.error("[AUTO-GEN] Failed to fetch exercises:", exErr);
      throw new Error("Failed to fetch exercise library");
    }

    // Build a formatted list of available exercises for the AI
    const exerciseList = (exerciseLibrary || [])
      .map((e: any) => `- ${e.title} [${e.muscle_group}] (${e.equipment || "bodyweight"})`)
      .join("\n");

    console.log(`[AUTO-GEN] Exercise library loaded: ${exerciseLibrary?.length || 0} exercises`);

    const results: any = { training: null, nutrition: null, errors: [] };

    // ──────── GENERATE TRAINING PLAN ────────
    try {
      console.log("[AUTO-GEN] Generating training plan for", userId);

      const workoutDuration = q.workout_duration_minutes || 60;
      const clientAge = q.age || 30;

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

      const trainingPrompt = `Generate a 4-week training program for a client with these specifications:

- Sex: ${q.sex}
- Age: ${clientAge}
- Weight: ${q.weight_lbs} lbs
- Goal Weight: ${q.goal_weight ? q.goal_weight + " lbs" : "not specified"}
- Activity level: ${q.activity_level}
- Workout days per week: ${q.workout_days_per_week}
- Available equipment: ${q.training_methods?.join(", ") || "bodyweight"}
- Goal: ${q.goal_next_4_weeks || "general fitness"}${q.goal_weight ? `\n- Target weight: ${q.goal_weight} lbs (client currently weighs ${q.weight_lbs} lbs, so they need to ${q.goal_weight < q.weight_lbs ? "lose" : "gain"} ${Math.abs(q.weight_lbs - q.goal_weight)} lbs)` : ""}
- Available gym time: ${workoutDuration} minutes per session
${ageGuidelines}

CRITICAL RULE: You MUST ONLY use exercises from the following exercise library. Do NOT invent or suggest any exercise that is not on this list. Use the EXACT exercise name as written below.

AVAILABLE EXERCISES:
${exerciseList}

WORKOUT STRUCTURE RULES:
1. WARM-UP (REQUIRED): The FIRST 1-2 exercises of EVERY training day MUST be a dynamic warm-up. This can be a 5-minute treadmill walk/light jog OR 2-3 dynamic warm-up movements (leg swings, arm circles, hip openers, etc.). Use exercises from the library if available, otherwise add "Dynamic Warm-Up" or "Treadmill Walk" as the first exercise with notes describing the warm-up.
2. MAIN WORKOUT: The body of the workout should fit within the client's available time of ${workoutDuration} minutes (minus warm-up and cool-down time).
3. COOL-DOWN (REQUIRED): The LAST exercise of EVERY training day MUST be a 5-minute cool-down consisting of static stretches. Add it as the final exercise with the name "Cool-Down Stretches" and include specific stretches in the notes field targeting the muscles worked that day.

Create a program with exactly ${q.workout_days_per_week} training days per week. For the 4-week program, provide ONE week template that repeats.

For each training day, assign a focus (e.g., "Upper Body Push", "Lower Body", "Full Body", "Pull Day") and list exercises selected ONLY from the list above. Adjust the number of exercises to fit within ${workoutDuration} minutes total (including warm-up and cool-down).

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

      const trainingResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are an expert strength & conditioning coach. Generate safe, evidence-based training programs. You MUST ONLY select exercises from the provided exercise library. Never invent exercises. Use the exact exercise names as given. Respond with ONLY valid JSON." },
            { role: "user", content: trainingPrompt },
          ],
        }),
      });

      if (!trainingResp.ok) throw new Error(`Training AI error: ${trainingResp.status}`);

      const trainingAI = await trainingResp.json();
      const trainingContent = trainingAI.choices?.[0]?.message?.content;
      if (!trainingContent) throw new Error("No training AI response");

      let planData;
      let clean = trainingContent.trim();
      if (clean.startsWith("```json")) clean = clean.slice(7);
      if (clean.startsWith("```")) clean = clean.slice(3);
      if (clean.endsWith("```")) clean = clean.slice(0, -3);
      planData = JSON.parse(clean.trim());

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
            console.warn(`[AUTO-GEN] Removing unlisted exercise: "${ex.exercise_name}"`);
          }
          return exists || isException;
        });
      }

      // Save training plan
      const { data: plan, error: planError } = await supabaseAdmin
        .from("client_training_plans")
        .insert({
          user_id: userId,
          questionnaire_id: questionnaireId,
          title: `${q.goal_next_4_weeks || "Training"} Program - Cycle ${q.cycle_number || 1}`,
          cycle_number: q.cycle_number || 1,
          workout_days_per_week: q.workout_days_per_week,
          duration_weeks: 4,
          status: "active",
        })
        .select()
        .single();

      if (planError) throw new Error("Failed to create training plan");

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

          if (dayError) { console.error("Day insert error:", dayError); continue; }

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

      results.training = { success: true, planId: plan.id };
      console.log("[AUTO-GEN] Training plan created:", plan.id);
    } catch (err) {
      console.error("[AUTO-GEN] Training error:", err);
      results.errors.push(`Training: ${err instanceof Error ? err.message : "Unknown"}`);
    }

    // ──────── GENERATE NUTRITION PLAN ────────
    try {
      console.log("[AUTO-GEN] Generating nutrition plan for", userId);

      const weightKg = (q.weight_lbs || 150) * 0.453592;
      const heightCm = (q.height_inches || 68) * 2.54;
      const bmr = q.sex === "female"
        ? 10 * weightKg + 6.25 * heightCm - 5 * (q.age || 30) - 161
        : 10 * weightKg + 6.25 * heightCm - 5 * (q.age || 30) + 5;

      const activityMultipliers: Record<string, number> = {
        sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9, extreme: 1.9,
      };

      let tdee = bmr * (activityMultipliers[q.activity_level || "moderate"] || 1.55);

      const goal = (q.goal_next_4_weeks || "").toLowerCase();
      const hasGoalWeight = q.goal_weight && q.goal_weight < q.weight_lbs;
      if (hasGoalWeight || goal.includes("lose") || goal.includes("cut") || goal.includes("lean")) tdee -= 500;
      else if ((!hasGoalWeight && q.goal_weight && q.goal_weight > q.weight_lbs) || goal.includes("gain") || goal.includes("bulk") || goal.includes("muscle")) tdee += 300;

      const dailyCalories = Math.round(tdee);
      const proteinGrams = Math.round(weightKg * 2.2);
      const fatGrams = Math.round((dailyCalories * 0.25) / 9);
      const carbsGrams = Math.round((dailyCalories - proteinGrams * 4 - fatGrams * 9) / 4);

      const dietaryInfo = q.dietary_restrictions?.length > 0
        ? `Dietary restrictions: ${q.dietary_restrictions.join(", ")}.` : "";
      const dislikedInfo = q.disliked_foods?.length > 0
        ? `IMPORTANT - The client DISLIKES and must NEVER be given these foods: ${q.disliked_foods.join(", ")}. Do NOT include these ingredients in ANY meal.` : "";
      const budgetInfo = q.weekly_food_budget
        ? `Weekly food budget: $${q.weekly_food_budget}. ${q.grocery_store ? `Primary grocery store: ${q.grocery_store}.` : ""}` : "";

      const nutritionPrompt = `Generate a complete 7-day meal plan for a client:

- Daily calories: ${dailyCalories} kcal
- Protein: ${proteinGrams}g, Carbs: ${carbsGrams}g, Fat: ${fatGrams}g
- Goal: ${q.goal_next_4_weeks || "maintain"}${q.goal_weight ? `\n- Goal Weight: ${q.goal_weight} lbs (current: ${q.weight_lbs} lbs)` : ""}
${dietaryInfo}
${dislikedInfo}
${budgetInfo}

For EACH of the 7 days, provide exactly 4 meals: breakfast, lunch, dinner, and snack.

You MUST respond with ONLY valid JSON:
{
  "days": [
    {
      "day_number": 1,
      "meals": [
        {
          "meal_type": "breakfast",
          "meal_name": "name",
          "description": "brief description with cooking instructions",
          "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount"],
          "calories": 400,
          "protein_grams": 30,
          "carbs_grams": 40,
          "fat_grams": 15
        }
      ]
    }
  ]
}

Make meals practical, varied, and delicious.`;

      const nutritionResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are an expert sports nutritionist. Generate precise, practical meal plans. Respond with ONLY valid JSON." },
            { role: "user", content: nutritionPrompt },
          ],
        }),
      });

      if (!nutritionResp.ok) throw new Error(`Nutrition AI error: ${nutritionResp.status}`);

      const nutritionAI = await nutritionResp.json();
      const nutritionContent = nutritionAI.choices?.[0]?.message?.content;
      if (!nutritionContent) throw new Error("No nutrition AI response");

      let mealPlanData;
      let cleanMeal = nutritionContent.trim();
      if (cleanMeal.startsWith("```json")) cleanMeal = cleanMeal.slice(7);
      if (cleanMeal.startsWith("```")) cleanMeal = cleanMeal.slice(3);
      if (cleanMeal.endsWith("```")) cleanMeal = cleanMeal.slice(0, -3);
      mealPlanData = JSON.parse(cleanMeal.trim());

      // Also upsert nutrition profile
      await supabaseAdmin.from("client_nutrition_profiles").upsert({
        user_id: userId,
        age: q.age,
        weight_lbs: q.weight_lbs,
        height_inches: q.height_inches,
        activity_level: q.activity_level,
        goals: q.goal_next_4_weeks || "maintain",
        dietary_preferences: q.dietary_restrictions || [],
        food_restrictions: q.disliked_foods || [],
      }, { onConflict: "user_id" });

      const { data: plan, error: planError } = await supabaseAdmin
        .from("nutrition_plans")
        .insert({
          user_id: userId,
          created_by: userId,
          title: `${q.goal_next_4_weeks || "Custom"} Meal Plan - Cycle ${q.cycle_number || 1}`,
          daily_calories: dailyCalories,
          protein_grams: proteinGrams,
          carbs_grams: carbsGrams,
          fat_grams: fatGrams,
          duration_weeks: 4,
          status: "active",
        })
        .select()
        .single();

      if (planError) throw new Error("Failed to create nutrition plan");

      const allMeals: any[] = [];
      for (let week = 0; week < 4; week++) {
        for (const day of mealPlanData.days) {
          const actualDay = week * 7 + day.day_number;
          for (const meal of day.meals) {
            allMeals.push({
              plan_id: plan.id,
              day_number: actualDay,
              meal_type: meal.meal_type,
              meal_name: meal.meal_name,
              description: meal.description,
              ingredients: meal.ingredients,
              calories: meal.calories,
              protein_grams: meal.protein_grams,
              carbs_grams: meal.carbs_grams,
              fat_grams: meal.fat_grams,
              sort_order: meal.meal_type === "breakfast" ? 0 : meal.meal_type === "lunch" ? 1 : meal.meal_type === "dinner" ? 2 : 3,
            });
          }
        }
      }

      const { error: mealsError } = await supabaseAdmin.from("nutrition_plan_meals").insert(allMeals);
      if (mealsError) {
        await supabaseAdmin.from("nutrition_plans").delete().eq("id", plan.id);
        throw new Error("Failed to create meal entries");
      }

      results.nutrition = { success: true, planId: plan.id, macros: { dailyCalories, proteinGrams, carbsGrams, fatGrams } };
      console.log("[AUTO-GEN] Nutrition plan created:", plan.id);
    } catch (err) {
      console.error("[AUTO-GEN] Nutrition error:", err);
      results.errors.push(`Nutrition: ${err instanceof Error ? err.message : "Unknown"}`);
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auto-generate-programs error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
