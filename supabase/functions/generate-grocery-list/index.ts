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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Rate limit: 10 grocery-list generations per user per hour.
    const allowed = await checkRateLimit(userId, "generate-grocery-list", 10, 60);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { planId, week, store } = await req.json();

    if (!planId) {
      return new Response(JSON.stringify({ error: "Missing planId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use provided store or fall back to questionnaire
    let groceryStore = store;

    if (!groceryStore) {
      const { data: questionnaire } = await supabaseClient
        .from("client_questionnaires")
        .select("grocery_store, dietary_restrictions")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!groceryStore) groceryStore = questionnaire?.grocery_store;
    }

    if (!groceryStore) groceryStore = "Local Grocery Store";

    // Get dietary restrictions from questionnaire
    const { data: qData } = await supabaseClient
      .from("client_questionnaires")
      .select("dietary_restrictions")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const restrictions = qData?.dietary_restrictions?.length
      ? `Dietary restrictions: ${qData.dietary_restrictions.join(", ")}.`
      : "";

    // Get meals for the requested week
    const weekNum = week || 1;
    const startDay = (weekNum - 1) * 7 + 1;
    const endDay = weekNum * 7;

    const { data: meals, error: mealsError } = await supabaseClient
      .from("nutrition_plan_meals")
      .select("meal_name, ingredients, day_number")
      .eq("plan_id", planId)
      .gte("day_number", startDay)
      .lte("day_number", endDay);

    if (mealsError) throw mealsError;
    if (!meals || meals.length === 0) {
      return new Response(
        JSON.stringify({ error: "No meals found for this week" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allIngredients: string[] = [];
    for (const meal of meals) {
      if (Array.isArray(meal.ingredients)) {
        allIngredients.push(...(meal.ingredients as string[]));
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Consolidate these meal ingredients into a grocery list for "${groceryStore}". ${restrictions}
Group items by aisle/section. Use realistic unit sizes/quantities.

Ingredients:
${allIngredients.map((i) => `- ${i}`).join("\n")}

Respond with ONLY valid JSON (no markdown):
{"store":"${groceryStore}","categories":[{"name":"Produce","items":[{"name":"item","quantity":"amount","note":""}]}]}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content:
                "Generate consolidated grocery lists grouped by aisle. Respond with ONLY valid JSON, no markdown, no prices.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

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

    let groceryData;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
      groceryData = JSON.parse(cleanContent.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse grocery list from AI response");
    }

    return new Response(JSON.stringify({ success: true, groceryList: groceryData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-grocery-list error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
