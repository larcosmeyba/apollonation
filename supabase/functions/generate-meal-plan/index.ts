import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { buildCorsHeaders, handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { z } from "https://esm.sh/zod@3.23.8";

// Strict input validation: numbers in human ranges, capped array sizes.
const ProfileSchema = z.object({
  age: z.number().int().min(10).max(120).optional().nullable(),
  weight_lbs: z.number().min(50).max(500).optional().nullable(),
  height_inches: z.number().min(36).max(108).optional().nullable(),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional().nullable(),
  goals: z.string().max(500).optional().nullable(),
  dietary_preferences: z.array(z.string().max(100)).max(50).optional().nullable(),
  food_restrictions: z.array(z.string().max(100)).max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
}).passthrough();

const BodySchema = z.object({
  profile: ProfileSchema,
  clientUserId: z.string().uuid(),
  planTitle: z.string().max(200).optional(),
});

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  const corsHeaders = buildCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminId = claimsData.claims.sub;

    // Verify admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: 5 requests per admin per day (1440 min)
    const allowed = await checkRateLimit(adminId as string, "generate-meal-plan", 5, 1440);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return jsonResponse(req, { error: "Invalid input", issues: parsed.error.flatten() }, 400);
    }
    const { profile, clientUserId, planTitle } = parsed.data;

    // Calculate macros based on profile
    const { age, weight_lbs, height_inches, activity_level, goals } = profile;

    // Mifflin-St Jeor equation for BMR
    const weightKg = (weight_lbs || 150) * 0.453592;
    const heightCm = (height_inches || 68) * 2.54;
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * (age || 30) + 5; // male default

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    let tdee = bmr * (activityMultipliers[activity_level || "moderate"] || 1.55);

    // Adjust for goals
    if (goals === "lose_weight") tdee -= 500;
    else if (goals === "gain_muscle") tdee += 300;

    const dailyCalories = Math.round(tdee);
    const proteinGrams = Math.round(weightKg * 2.2); // ~1g per lb
    const fatGrams = Math.round((dailyCalories * 0.25) / 9);
    const carbsGrams = Math.round((dailyCalories - proteinGrams * 4 - fatGrams * 9) / 4);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const dietaryPrefs = profile.dietary_preferences?.length > 0
      ? `Dietary preferences: ${profile.dietary_preferences.join(", ")}.`
      : "";
    const restrictions = profile.food_restrictions?.length > 0
      ? `IMPORTANT - The client DISLIKES and must NEVER be given these foods: ${profile.food_restrictions.join(", ")}. Do NOT include these ingredients in ANY meal.`
      : "";

    const prompt = `Generate a complete 28-day meal plan (4 unique weeks) for a client with these specifications:

- Daily calories: ${dailyCalories} kcal
- Protein: ${proteinGrams}g
- Carbs: ${carbsGrams}g
- Fat: ${fatGrams}g
- Goal: ${goals || "maintain"}
${dietaryPrefs}
${restrictions}
${profile.notes ? `Additional notes: ${profile.notes}` : ""}

For EACH of the 28 days, provide exactly 4 meals: breakfast, lunch, dinner, and snack.
Each week should have DIFFERENT meals — do NOT repeat the same meals across weeks. Vary proteins, cooking methods, cuisines, and ingredients week to week.

You MUST respond with ONLY valid JSON (no markdown, no code blocks) in this exact format:
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
          "calories": number,
          "protein_grams": number,
          "carbs_grams": number,
          "fat_grams": number
        }
      ]
    }
  ]
}

Make meals practical, varied, and delicious. Each day's total macros should approximately match the targets. Ensure variety across all 4 weeks.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "You are an expert sports nutritionist. Generate precise, practical meal plans with high variety across weeks. Respond with ONLY valid JSON."
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    let mealPlanData;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
      mealPlanData = JSON.parse(cleanContent.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse meal plan from AI response");
    }

    // Use service role to create the plan and meals
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create the nutrition plan
    const { data: plan, error: planError } = await supabaseAdmin
      .from("nutrition_plans")
      .insert({
        user_id: clientUserId,
        created_by: adminId,
        title: planTitle || `${goals || "Custom"} Meal Plan`,
        daily_calories: dailyCalories,
        protein_grams: proteinGrams,
        carbs_grams: carbsGrams,
        fat_grams: fatGrams,
        duration_weeks: 4,
        status: "active",
      })
      .select()
      .single();

    if (planError) {
      console.error("Plan creation error:", planError);
      throw new Error("Failed to create nutrition plan");
    }

    // Insert all meals (28 unique days from AI)
    const allMeals: any[] = [];
    for (const day of mealPlanData.days) {
      for (const meal of day.meals) {
        allMeals.push({
          plan_id: plan.id,
          day_number: day.day_number,
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

    const { error: mealsError } = await supabaseAdmin
      .from("nutrition_plan_meals")
      .insert(allMeals);

    if (mealsError) {
      console.error("Meals creation error:", mealsError);
      // Clean up the plan
      await supabaseAdmin.from("nutrition_plans").delete().eq("id", plan.id);
      throw new Error("Failed to create meal entries");
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan,
        macros: { dailyCalories, proteinGrams, carbsGrams, fatGrams },
        mealsCount: allMeals.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-meal-plan error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
