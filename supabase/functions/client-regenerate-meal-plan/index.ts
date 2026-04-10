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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Rate limit: 3 regenerations per user per day
    const allowed = await checkRateLimit(userId, "client-regenerate-meal-plan", 3, 1440);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { planId, week } = await req.json();
    if (!planId || !week) {
      return new Response(JSON.stringify({ error: "Missing planId or week" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the plan belongs to this user
    const { data: plan, error: planErr } = await supabaseAdmin
      .from("nutrition_plans")
      .select("id, user_id, daily_calories, protein_grams, carbs_grams, fat_grams, duration_weeks")
      .eq("id", planId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found or not yours" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch client profile data for restrictions/preferences
    const { data: profile } = await supabaseAdmin
      .from("client_nutrition_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    const { data: questionnaire } = await supabaseAdmin
      .from("client_questionnaires")
      .select("disliked_foods, dietary_restrictions, goal_next_4_weeks, grocery_store, weekly_food_budget")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const dietaryPrefs = profile?.dietary_preferences?.length
      ? `Dietary preferences: ${profile.dietary_preferences.join(", ")}.`
      : questionnaire?.dietary_restrictions?.length
      ? `Dietary restrictions: ${questionnaire.dietary_restrictions.join(", ")}.`
      : "";

    const restrictions = (profile?.food_restrictions?.length
      ? profile.food_restrictions
      : questionnaire?.disliked_foods || []);
    const restrictionsText = restrictions.length
      ? `IMPORTANT - The client DISLIKES and must NEVER be given these foods: ${restrictions.join(", ")}. Do NOT include these ingredients in ANY meal.`
      : "";

    const budgetInfo = questionnaire?.weekly_food_budget
      ? `Weekly food budget: $${questionnaire.weekly_food_budget}. ${questionnaire.grocery_store ? `Primary grocery store: ${questionnaire.grocery_store}.` : ""}`
      : "";

    const goal = profile?.goals || questionnaire?.goal_next_4_weeks || "maintain";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `7-day meal plan, Week ${week}. 4 meals/day (breakfast, lunch, dinner, snack). Varied cuisines & proteins.
Targets: ${plan.daily_calories}cal, ${plan.protein_grams}g P, ${plan.carbs_grams}g C, ${plan.fat_grams}g F. Goal: ${goal}.
${dietaryPrefs}${restrictionsText}${budgetInfo}${profile?.notes ? ` Notes: ${profile.notes}` : ""}

Respond ONLY with JSON: {"days":[{"day_number":1,"meals":[{"meal_type":"breakfast","meal_name":"...","description":"...","ingredients":["item with amount"],"calories":0,"protein_grams":0,"carbs_grams":0,"fat_grams":0}]}]}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Expert nutritionist. Return ONLY valid JSON, no markdown." },
          { role: "user", content: prompt },
        ],
        temperature: 0.9,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No AI response");

    let mealPlanData;
    let clean = content.trim();
    if (clean.startsWith("```json")) clean = clean.slice(7);
    if (clean.startsWith("```")) clean = clean.slice(3);
    if (clean.endsWith("```")) clean = clean.slice(0, -3);
    mealPlanData = JSON.parse(clean.trim());

    // Delete old meals for this specific week only
    const weekStart = (week - 1) * 7 + 1;
    const weekEnd = week * 7;

    const { error: delErr } = await supabaseAdmin
      .from("nutrition_plan_meals")
      .delete()
      .eq("plan_id", plan.id)
      .gte("day_number", weekStart)
      .lte("day_number", weekEnd);

    if (delErr) throw new Error(`Failed to delete old meals: ${delErr.message}`);

    // Insert new meals for this week
    const newMeals: any[] = [];
    for (const day of mealPlanData.days) {
      const actualDay = (week - 1) * 7 + day.day_number;
      for (const meal of day.meals) {
        newMeals.push({
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

    const { error: insertErr } = await supabaseAdmin
      .from("nutrition_plan_meals")
      .insert(newMeals);

    if (insertErr) throw new Error(`Failed to insert meals: ${insertErr.message}`);

    return new Response(JSON.stringify({
      success: true,
      mealsCount: newMeals.length,
      week,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("client-regenerate-meal-plan error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
