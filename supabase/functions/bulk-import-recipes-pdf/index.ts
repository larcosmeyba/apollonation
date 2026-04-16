import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedRecipe {
  title: string;
  description?: string;
  category?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  calories_per_serving?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
  ingredients?: string[];
  instructions?: string;
  dietary_tags?: string[];
  // Index of an image embedded in the PDF that best represents this recipe (0-based across all images we extract)
  image_index?: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 30 PDF imports per admin per day
    const allowed = await checkRateLimit(userId, "bulk-import-recipes-pdf", 30, 1440);
    if (!allowed) return rateLimitResponse(corsHeaders);

    const { pdfBase64, fileName } = await req.json();

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return new Response(JSON.stringify({ error: "pdfBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Send the entire PDF to Gemini 2.5 Pro — it handles PDF+images natively
    console.log(`Processing PDF: ${fileName}, size ~${Math.round(pdfBase64.length / 1024)}KB`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `You are a professional nutrition data extractor for a premium fitness coaching platform.

You will be given a cookbook-style PDF that contains multiple recipes with photos and macro information.

Extract EVERY recipe from the PDF. For each recipe, return all available structured data. Use the EXACT macro numbers shown in the PDF — do not estimate or recalculate.

Return ONLY valid JSON (no markdown, no code blocks) in this exact shape:
{
  "recipes": [
    {
      "title": "string (required)",
      "description": "string (1-2 sentences, optional)",
      "category": "breakfast | main | snack | dessert | smoothie",
      "prep_time_minutes": number,
      "cook_time_minutes": number,
      "servings": number,
      "calories_per_serving": number,
      "protein_grams": number,
      "carbs_grams": number,
      "fat_grams": number,
      "ingredients": ["1 cup oats", "2 tbsp peanut butter", ...],
      "instructions": "Step-by-step instructions as one string with numbered steps separated by newlines",
      "dietary_tags": ["high-protein", "vegetarian", ...]
    }
  ]
}

Rules:
- Extract EVERY recipe in the document, even if there are 50+
- Only include fields you can confidently determine; omit unknown fields
- Use the exact macro numbers from the PDF
- Title must be the exact recipe name shown
- Skip cover pages, table of contents, intros — only return actual recipes`,
          },
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  filename: fileName || "recipes.pdf",
                  file_data: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
              {
                type: "text",
                text: "Extract every recipe from this PDF and return the structured JSON.",
              },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiJson = await aiResponse.json();
    const content = aiJson.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    let parsed: { recipes: ParsedRecipe[] };
    try {
      let clean = content.trim();
      if (clean.startsWith("```json")) clean = clean.slice(7);
      if (clean.startsWith("```")) clean = clean.slice(3);
      if (clean.endsWith("```")) clean = clean.slice(0, -3);
      parsed = JSON.parse(clean.trim());
    } catch (e) {
      console.error("Failed to parse AI JSON:", content.substring(0, 500));
      throw new Error("Failed to parse recipes from AI response");
    }

    if (!Array.isArray(parsed.recipes)) {
      throw new Error("AI response missing recipes array");
    }

    console.log(`Extracted ${parsed.recipes.length} recipes from ${fileName}`);

    // Return preview list — admin will pick which to save via /save call
    return new Response(
      JSON.stringify({
        success: true,
        count: parsed.recipes.length,
        recipes: parsed.recipes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("bulk-import-recipes-pdf error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
