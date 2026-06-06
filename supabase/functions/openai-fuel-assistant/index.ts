// Apollo Fuel Assistant — OpenAI-powered nutrition helper.
// Server-only. Reads user profile + macro targets + today's food log,
// asks OpenAI for a structured recommendation, logs usage, returns JSON.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const OPENAI_MAX_OUTPUT_TOKENS = Number(Deno.env.get("OPENAI_MAX_OUTPUT_TOKENS") ?? "700");
const DAILY_LIMIT = Number(Deno.env.get("FUEL_ASSISTANT_DAILY_LIMIT") ?? "20");

type AssistantMode =
  | "meal_idea"
  | "food_swap"
  | "grocery_help"
  | "macro_explanation"
  | "what_to_eat_next"
  | "meal_prep";

const VALID_MODES: AssistantMode[] = [
  "meal_idea", "food_swap", "grocery_help",
  "macro_explanation", "what_to_eat_next", "meal_prep",
];

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
          ingredients: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
        },
        required: ["name", "calories", "protein", "carbs", "fat", "ingredients", "notes"],
      },
    },
    disclaimer: { type: "string" },
  },
  required: ["title", "summary", "recommendations", "disclaimer"],
} as const;

const SAFETY_RULES = `You are Apollo Fuel Assistant — a friendly, practical nutrition helper inside the Apollo Reborn fitness app.
HARD RULES (never break):
- Never give medical, clinical, or diagnostic advice.
- Never encourage extreme calorie restriction, purging, fasting protocols, or eating-disorder behaviors.
- Never recommend supplements, steroids, peptides, or prescription drugs.
- Never override the user's calorie or macro targets — Apollo's backend computes those. Explain or work within them.
- If the user asks for any of the above, respond ONLY with a recommendation whose summary is:
  "I can help with general nutrition support, but I can't provide unsafe or medical guidance."
  and return an empty recommendations array.
- Always include a disclaimer field: "Nutrition suggestions are estimates and not medical advice."
- Keep meals realistic, simple, and aligned with the user's dietary preferences, allergies, and disliked foods.
- Use the user's REMAINING macros when suggesting "what to eat next".`;

function modeInstruction(mode: AssistantMode): string {
  switch (mode) {
    case "meal_idea": return "Suggest 1-2 meal ideas that fit the user's daily macro targets.";
    case "food_swap": return "Suggest 1-3 swaps for the food the user mentions, matching macros and dietary needs.";
    case "grocery_help": return "Suggest a short grocery list that helps the user hit their weekly nutrition goals.";
    case "macro_explanation": return "Explain the user's calorie and macro targets in plain language. Return one recommendation whose name is 'Your Targets' and ingredients is an empty array.";
    case "what_to_eat_next": return "Use the user's REMAINING macros today to suggest 1-2 specific meals or snacks.";
    case "meal_prep": return "Suggest 1-3 prep-friendly meals that scale across multiple days.";
    default: return "Help the user with their nutrition question.";
  }
}

function missingProfileFields(p: any, targets: any): string[] {
  const missing: string[] = [];
  if (!p?.weight_lbs) missing.push("weight");
  if (!p?.height_inches) missing.push("height");
  if (!p?.age) missing.push("age");
  if (!p?.sex) missing.push("gender");
  if (!p?.primary_goal) missing.push("goal");
  if (!targets?.calorie_target) missing.push("macro_targets");
  return missing;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "openai_not_configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const userMessage = String(body?.user_message ?? "").trim().slice(0, 1500);
    const mode = (VALID_MODES.includes(body?.assistant_mode) ? body.assistant_mode : "meal_idea") as AssistantMode;

    if (!userMessage) {
      return new Response(JSON.stringify({ error: "empty_message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Daily rate limit per user
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("openai_request_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature_area", "fuel_assistant")
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return new Response(JSON.stringify({
        error: "rate_limit",
        message: `You've reached your daily Fuel Assistant limit (${DAILY_LIMIT}). Try again tomorrow.`,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load profile + canonical macro targets + today's food log
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: profile }, { data: targets }, { data: todaysLogs }] = await Promise.all([
      admin.from("user_fitness_profile").select(
        "weight_lbs, height_inches, age, sex, primary_goal, activity_level, nutrition_goal, dietary_preferences, allergies, disliked_foods, meals_per_day",
      ).eq("user_id", user.id).maybeSingle(),
      admin.from("user_macro_targets").select(
        "calorie_target, protein_grams, carb_grams, fat_grams, goal_type",
      ).eq("user_id", user.id).maybeSingle(),
      admin.from("macro_logs").select("calories, protein_grams, carbs_grams, fat_grams")
        .eq("user_id", user.id).eq("log_date", today),
    ]);

    const missing = missingProfileFields(profile, targets);
    if (missing.length) {
      return new Response(JSON.stringify({
        error: "profile_incomplete",
        message: "Please complete your Fuel setup first.",
        missing,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const eaten = (todaysLogs ?? []).reduce((acc, r: any) => ({
      cal: acc.cal + (Number(r.calories) || 0),
      pro: acc.pro + (Number(r.protein_grams) || 0),
      car: acc.car + (Number(r.carbs_grams) || 0),
      fat: acc.fat + (Number(r.fat_grams) || 0),
    }), { cal: 0, pro: 0, car: 0, fat: 0 });

    const remaining = {
      calories: Math.max(0, (targets!.calorie_target ?? 0) - eaten.cal),
      protein: Math.max(0, (targets!.protein_grams ?? 0) - eaten.pro),
      carbs: Math.max(0, (targets!.carb_grams ?? 0) - eaten.car),
      fat: Math.max(0, (targets!.fat_grams ?? 0) - eaten.fat),
    };

    const profileContext = {
      goal: profile!.primary_goal,
      activity: profile!.activity_level,
      dietary_preferences: profile!.dietary_preferences ?? [],
      allergies: profile!.allergies ?? [],
      disliked_foods: profile!.disliked_foods ?? [],
      meals_per_day: profile!.meals_per_day,
      targets: {
        calories: targets!.calorie_target,
        protein_g: targets!.protein_grams,
        carbs_g: targets!.carb_grams,
        fat_g: targets!.fat_grams,
      },
      eaten_today: eaten,
      remaining_today: remaining,
    };

    const systemPrompt = `${SAFETY_RULES}\n\nMODE: ${mode}\n${modeInstruction(mode)}\n\nUSER CONTEXT (JSON):\n${JSON.stringify(profileContext)}`;

    // OpenAI Chat Completions with strict JSON schema
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: OPENAI_MAX_OUTPUT_TOKENS,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "fuel_response", strict: true, schema: RESPONSE_SCHEMA },
        },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("[fuel-assistant] OpenAI error", openaiRes.status, errText);
      await admin.from("openai_request_logs").insert({
        user_id: user.id, feature_area: "fuel_assistant", assistant_mode: mode,
        model: OPENAI_MODEL, status: "error",
        error_message: `OpenAI ${openaiRes.status}: ${errText.slice(0, 500)}`,
      });
      return new Response(JSON.stringify({
        error: "assistant_unavailable",
        message: "Apollo Fuel Assistant is temporarily unavailable. Your macros and meal plan are still available.",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const completion = await openaiRes.json();
    const content = completion?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = null; }

    if (!parsed?.title) {
      await admin.from("openai_request_logs").insert({
        user_id: user.id, feature_area: "fuel_assistant", assistant_mode: mode,
        model: OPENAI_MODEL, status: "error", error_message: "invalid_response_shape",
      });
      return new Response(JSON.stringify({
        error: "assistant_unavailable",
        message: "Apollo Fuel Assistant is temporarily unavailable. Your macros and meal plan are still available.",
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure disclaimer
    if (!parsed.disclaimer) {
      parsed.disclaimer = "Nutrition suggestions are estimates and not medical advice.";
    }

    // Log usage. Rough cost estimate for gpt-4o-mini: $0.15/M input + $0.60/M output.
    const usage = completion?.usage ?? {};
    const inTok = Number(usage.prompt_tokens ?? 0);
    const outTok = Number(usage.completion_tokens ?? 0);
    const estCost = (inTok / 1_000_000) * 0.15 + (outTok / 1_000_000) * 0.60;

    await admin.from("openai_request_logs").insert({
      user_id: user.id,
      feature_area: "fuel_assistant",
      assistant_mode: mode,
      model: OPENAI_MODEL,
      request_tokens: inTok,
      response_tokens: outTok,
      estimated_cost: Number(estCost.toFixed(6)),
      status: "ok",
    });

    return new Response(JSON.stringify({ ok: true, mode, response: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[fuel-assistant] unhandled", e?.message ?? e);
    return new Response(JSON.stringify({
      error: "assistant_unavailable",
      message: "Apollo Fuel Assistant is temporarily unavailable. Your macros and meal plan are still available.",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
