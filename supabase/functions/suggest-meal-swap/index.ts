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

    const { data: { user }, error: userError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (userError || !user) throw new Error("Unauthorized");

    // Privacy: respect AI personalization opt-out
    const { data: privacyPrefs } = await supabase
      .from("user_privacy_preferences")
      .select("ai_personalization_opted_out")
      .eq("user_id", user.id)
      .maybeSingle();
    if (privacyPrefs?.ai_personalization_opted_out) {
      return new Response(JSON.stringify({ error: "AI personalization is disabled in your privacy settings. Enable it under Profile → Privacy & Data to get suggestions." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mealId, planId } = await req.json();
    if (!mealId || !planId) throw new Error("Missing mealId or planId");

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(mealId) || !UUID_RE.test(planId)) {
      return new Response(JSON.stringify({ error: "Invalid id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: meal, error: mealError } = await supabase
      .from("nutrition_plan_meals")
      .select("*, nutrition_plans!inner(user_id, daily_calories, protein_grams, carbs_grams, fat_grams)")
      .eq("id", mealId)
      .eq("plan_id", planId)
      .maybeSingle();

    if (mealError) throw new Error("Meal lookup failed");
    if (!meal) {
      return new Response(JSON.stringify({ error: "Meal not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (meal.nutrition_plans.user_id !== user.id) throw new Error("Unauthorized");

    const { data: questionnaire } = await supabase
      .from("client_questionnaires")
      .select("disliked_foods, dietary_restrictions")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const dislikedFoods: string[] = questionnaire?.disliked_foods || [];
    const dietaryRestrictions: string[] = questionnaire?.dietary_restrictions || [];
    const avoidList = [...dislikedFoods, ...dietaryRestrictions].filter(Boolean);

    const prompt = `You are a nutrition coach. Suggest exactly 3 alternative meals that:
- Each matches these macros (within 10% variance):
  • Calories: ${meal.calories} kcal
  • Protein: ${meal.protein_grams}g
  • Carbs: ${meal.carbs_grams}g
  • Fat: ${meal.fat_grams}g
- Each is a ${meal.meal_type} meal (same meal type)
- None contain any of these foods/ingredients: ${avoidList.length > 0 ? avoidList.join(", ") : "none specified"}
- All are easy to prepare, healthy, and realistic
- All are DIFFERENT from each other and from the current meal: "${meal.meal_name}"
- Offer variety in cuisine style and ingredients

Return ONLY valid JSON (no markdown):
{
  "suggestions": [
    {
      "meal_name": "string",
      "description": "brief 1-sentence description",
      "ingredients": ["ingredient 1", "ingredient 2"],
      "calories": number,
      "protein_grams": number,
      "carbs_grams": number,
      "fat_grams": number
    }
  ]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact support." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const err = await aiResponse.text();
      throw new Error(`AI error: ${err}`);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("Empty AI response");

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    const suggestions = parsed.suggestions || [parsed];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
