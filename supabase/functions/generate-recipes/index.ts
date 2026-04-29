import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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
    // Auth check
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

    const userId = claimsData.claims.sub;

    // Verify admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: 20 requests per admin per day (1440 min)
    const allowed = await checkRateLimit(userId as string, "generate-recipes", 20, 1440);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { mode, prompt, pdfText, count } = await req.json();

    if (!mode || (mode === "ai" && !prompt) || (mode === "pdf" && !pdfText)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const recipeCount = Math.min(count || 1, 10);

    let userMessage = "";

    if (mode === "pdf") {
      userMessage = `I have the following text extracted from a nutrition PDF document. Parse it and extract ALL recipes found. If the text contains nutrition info, meal plans, or food descriptions, convert them into structured recipes.

PDF Content:
---
${pdfText}
---

Extract every recipe or meal you can find from this content. For each one, provide complete nutritional information and cooking instructions. If exact macros aren't provided in the text, estimate them based on the ingredients.`;
    } else {
      userMessage = `Create ${recipeCount} nutrition recipe(s) based on this request: "${prompt}"

Make the recipes practical, healthy, and delicious. Include precise measurements, clear cooking instructions, and accurate macro estimates. Each recipe should feel premium and coach-approved.`;
    }

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
            content: `You are a professional sports nutrition chef creating recipes for a premium fitness coaching platform called Apollo Reborn. 

You MUST respond with ONLY valid JSON (no markdown, no code blocks, no extra text) in this exact format:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "A compelling 1-2 sentence description",
      "category": "breakfast" | "main" | "snack" | "dessert" | "smoothie",
      "prep_time_minutes": number,
      "cook_time_minutes": number,
      "servings": number,
      "calories_per_serving": number,
      "protein_grams": number,
      "carbs_grams": number,
      "fat_grams": number,
      "ingredients": ["ingredient 1 with measurement", "ingredient 2 with measurement"],
      "instructions": "Step-by-step instructions as a single string with numbered steps",
      "dietary_tags": ["high-protein", "low-carb", etc]
    }
  ]
}

Requirements:
- Accurate macro calculations
- Clear, concise cooking instructions
- Practical ingredients
- Fitness-focused recipes that support training goals`
          },
          { role: "user", content: userMessage }
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

    let recipesData;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
      recipesData = JSON.parse(cleanContent.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse recipes from AI response");
    }

    // Save all recipes to database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const recipesToInsert = recipesData.recipes.map((r: any) => ({
      title: r.title,
      description: r.description || null,
      category: r.category || "main",
      prep_time_minutes: r.prep_time_minutes || null,
      cook_time_minutes: r.cook_time_minutes || null,
      servings: r.servings || null,
      calories_per_serving: r.calories_per_serving || null,
      protein_grams: r.protein_grams || null,
      carbs_grams: r.carbs_grams || null,
      fat_grams: r.fat_grams || null,
      ingredients: r.ingredients || [],
      instructions: r.instructions || null,
      dietary_tags: r.dietary_tags || [],
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("recipes")
      .insert(recipesToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save recipes");
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipes: inserted,
        count: inserted.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-recipes error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
