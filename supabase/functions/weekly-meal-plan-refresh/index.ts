import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { requireCronSecret } from "../_shared/cron-auth.ts";

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  // Cron-only: require shared secret.
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Optional: verify admin caller for manual triggers
    const authHeader = req.headers.get("Authorization");
    let isManualTrigger = false;
    if (authHeader?.startsWith("Bearer ") && !authHeader.includes("eyJpc3MiOiJzdXBhYmFzZSI")) {
      // Likely a cron/anon call, skip admin check
    } else if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      if (userData?.user) {
        const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
          _user_id: userData.user.id,
          _role: "admin",
        });
        if (!isAdmin) {
          return new Response(JSON.stringify({ error: "Admin access required" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        isManualTrigger = true;
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Find all active nutrition plans
    const { data: activePlans, error: plansErr } = await supabaseAdmin
      .from("nutrition_plans")
      .select("id, user_id, title, daily_calories, protein_grams, carbs_grams, fat_grams, duration_weeks")
      .eq("status", "active");

    if (plansErr) throw new Error("Failed to fetch active plans");
    if (!activePlans || activePlans.length === 0) {
      return new Response(JSON.stringify({ message: "No active plans to refresh", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[MEAL-REFRESH] Found ${activePlans.length} active plans to refresh`);

    const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

    for (const plan of activePlans) {
      try {
        // Fetch client's nutrition profile for dietary restrictions
        const { data: profile } = await supabaseAdmin
          .from("client_nutrition_profiles")
          .select("*")
          .eq("user_id", plan.user_id)
          .single();

        // Also check questionnaire for disliked foods
        const { data: questionnaire } = await supabaseAdmin
          .from("client_questionnaires")
          .select("disliked_foods, dietary_restrictions, goal_next_4_weeks, grocery_store, weekly_food_budget")
          .eq("user_id", plan.user_id)
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
          : questionnaire?.disliked_foods || []
        );
        const restrictionsText = restrictions.length
          ? `IMPORTANT - The client DISLIKES and must NEVER be given these foods: ${restrictions.join(", ")}. Do NOT include these ingredients in ANY meal.`
          : "";

        const budgetInfo = questionnaire?.weekly_food_budget
          ? `Weekly food budget: $${questionnaire.weekly_food_budget}. ${questionnaire.grocery_store ? `Primary grocery store: ${questionnaire.grocery_store}.` : ""}`
          : "";

        const goal = profile?.goals || questionnaire?.goal_next_4_weeks || "maintain";

        const prompt = `Generate a complete 7-day meal plan for a new week. This should be COMPLETELY DIFFERENT meals from any previous week — use different proteins, cuisines, cooking methods, and ingredients.

- Daily calories: ${plan.daily_calories} kcal
- Protein: ${plan.protein_grams}g
- Carbs: ${plan.carbs_grams}g
- Fat: ${plan.fat_grams}g
- Goal: ${goal}
${dietaryPrefs}
${restrictionsText}
${budgetInfo}
${profile?.notes ? `Additional notes: ${profile.notes}` : ""}

For EACH of the 7 days, provide exactly 4 meals: breakfast, lunch, dinner, and snack.

You MUST respond with ONLY valid JSON (no markdown, no code blocks):
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

Make meals practical, varied, and delicious. Each day's total macros should approximately match the targets.`;

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are an expert sports nutritionist. Generate precise, practical meal plans with maximum variety. Respond with ONLY valid JSON." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!aiResp.ok) throw new Error(`AI error: ${aiResp.status}`);

        const aiData = await aiResp.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (!content) throw new Error("No AI response");

        let mealPlanData;
        let clean = content.trim();
        if (clean.startsWith("```json")) clean = clean.slice(7);
        if (clean.startsWith("```")) clean = clean.slice(3);
        if (clean.endsWith("```")) clean = clean.slice(0, -3);
        mealPlanData = JSON.parse(clean.trim());

        // Delete old meals for this plan
        await supabaseAdmin
          .from("nutrition_plan_meals")
          .delete()
          .eq("plan_id", plan.id);

        // Insert new meals for 4 weeks (repeat this new week across all 4)
        // Actually generate unique 7 days and map them across 4 weeks
        const allMeals: any[] = [];
        for (let week = 0; week < (plan.duration_weeks || 4); week++) {
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

        const { error: mealsErr } = await supabaseAdmin
          .from("nutrition_plan_meals")
          .insert(allMeals);

        if (mealsErr) throw new Error(`Failed to insert meals: ${mealsErr.message}`);

        results.success.push(plan.user_id);
        console.log(`[MEAL-REFRESH] ✅ Refreshed plan ${plan.id} for user ${plan.user_id}`);
      } catch (err) {
        results.failed.push(plan.user_id);
        console.error(`[MEAL-REFRESH] ❌ Failed for plan ${plan.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Refreshed ${results.success.length} plans, ${results.failed.length} failed`,
        ...results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[MEAL-REFRESH] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
