import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the requesting user
    const { data: { user }, error: userError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (userError || !user) throw new Error("Unauthorized");

    const { mealId, planId } = await req.json();
    if (!mealId || !planId) throw new Error("Missing mealId or planId");

    // Verify the meal belongs to this user's plan
    const { data: meal, error: mealError } = await supabase
      .from("nutrition_plan_meals")
      .select("*, nutrition_plans!inner(user_id, daily_calories, protein_grams, carbs_grams, fat_grams)")
      .eq("id", mealId)
      .eq("plan_id", planId)
      .single();

    if (mealError || !meal) throw new Error("Meal not found");
    if (meal.nutrition_plans.user_id !== user.id) throw new Error("Unauthorized");

    // Get client's disliked foods
    const { data: questionnaire } = await supabase
      .from("client_questionnaires")
      .select("disliked_foods, dietary_restrictions")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const dislikedFoods: string[] = questionnaire?.disliked_foods || [];
    const dietaryRestrictions: string[] = questionnaire?.dietary_restrictions || [];

    const avoidList = [...dislikedFoods, ...dietaryRestrictions].filter(Boolean);

    const prompt = `You are a nutrition coach. Suggest ONE alternative meal that:
- Matches these macros (within 10% variance):
  • Calories: ${meal.calories} kcal
  • Protein: ${meal.protein_grams}g
  • Carbs: ${meal.carbs_grams}g
  • Fat: ${meal.fat_grams}g
- Is a ${meal.meal_type} meal (same meal type)
- Does NOT contain any of these foods/ingredients: ${avoidList.length > 0 ? avoidList.join(", ") : "none specified"}
- Is easy to prepare, healthy, and realistic
- Is DIFFERENT from the current meal: "${meal.meal_name}"

Return ONLY valid JSON (no markdown):
{
  "meal_name": "string",
  "description": "brief 1-sentence description",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "calories": number,
  "protein_grams": number,
  "carbs_grams": number,
  "fat_grams": number
}`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      throw new Error(`AI error: ${err}`);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("Empty AI response");

    const suggestion = JSON.parse(raw);

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
