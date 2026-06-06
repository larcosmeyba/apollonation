// Apollo Workout Swap — OpenAI-powered workout alternative picker.
// Given a current workout the user wants to swap, returns 1-3 alternates
// from the published workouts library that match category/duration/intent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const DAILY_LIMIT = Number(Deno.env.get("WORKOUT_SWAP_DAILY_LIMIT") ?? "20");

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    swaps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          workout_id: { type: "string" },
          title: { type: "string" },
          duration_minutes: { type: "number" },
          category: { type: "string" },
          reason: { type: "string" },
        },
        required: ["workout_id", "title", "duration_minutes", "category", "reason"],
      },
    },
    disclaimer: { type: "string" },
  },
  required: ["headline", "swaps", "disclaimer"],
} as const;

const SAFETY_RULES = `You are Apollo Workout Swap Coach. Suggest alternative workouts that preserve training intent.
HARD RULES:
- Pick ONLY from the provided workout library. Use the EXACT workout_id.
- Match category and stay within ±15 minutes of the original duration when possible.
- Honor user injuries — avoid workouts that aggravate listed limitations.
- Return 1–3 swaps. Never invent workouts.
- Always include disclaimer: "Workout swaps are guidance, not medical advice."`;

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
    const currentWorkoutId = String(body?.workout_id ?? "").trim();
    const reasonForSwap = String(body?.reason ?? "").trim().slice(0, 500);
    const preferredCategory = body?.preferred_category ? String(body.preferred_category) : null;

    if (!currentWorkoutId) {
      return new Response(JSON.stringify({ error: "missing_workout_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Daily limit
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("openai_request_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature_area", "workout_swap")
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return new Response(JSON.stringify({
        error: "rate_limit",
        message: `Daily workout swap limit reached (${DAILY_LIMIT}). Try again tomorrow.`,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: current }, { data: profile }, { data: library }] = await Promise.all([
      admin.from("workouts").select("id, title, category, duration_minutes, description")
        .eq("id", currentWorkoutId).maybeSingle(),
      admin.from("user_fitness_profile").select(
        "primary_goal, training_experience, injuries, workout_environment, workout_duration_minutes",
      ).eq("user_id", user.id).maybeSingle(),
      admin.from("workouts").select("id, title, category, duration_minutes")
        .eq("is_published", true),
    ]);

    if (!current) {
      return new Response(JSON.stringify({ error: "workout_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidates = (library ?? []).filter((w: any) => w.id !== currentWorkoutId);
    const libStr = candidates.map((w: any) =>
      `- id=${w.id} | ${w.title} | category=${w.category ?? "n/a"} | ${w.duration_minutes ?? "?"}min`
    ).join("\n");

    const context = {
      current_workout: current,
      preferred_category: preferredCategory,
      swap_reason: reasonForSwap,
      profile: profile ?? {},
    };

    const systemPrompt = `${SAFETY_RULES}\n\nCONTEXT (JSON):\n${JSON.stringify(context)}\n\nAVAILABLE WORKOUTS:\n${libStr}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: 700,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Suggest the best alternative workouts for me." },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "workout_swap", strict: true, schema: RESPONSE_SCHEMA },
        },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("[workout-swap] OpenAI error", openaiRes.status, errText);
      await admin.from("openai_request_logs").insert({
        user_id: user.id, feature_area: "workout_swap",
        model: OPENAI_MODEL, status: "error",
        error_message: `OpenAI ${openaiRes.status}: ${errText.slice(0, 500)}`,
      });
      return new Response(JSON.stringify({
        error: "assistant_unavailable",
        message: "Swap coach temporarily unavailable.",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const completion = await openaiRes.json();
    const content = completion?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = null; }

    const validIds = new Set(candidates.map((w: any) => w.id));
    if (parsed?.swaps) {
      parsed.swaps = parsed.swaps.filter((s: any) => validIds.has(s.workout_id));
    }

    if (!parsed?.headline || !parsed?.swaps?.length) {
      return new Response(JSON.stringify({
        error: "assistant_unavailable",
        message: "No valid swaps could be generated.",
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!parsed.disclaimer) parsed.disclaimer = "Workout swaps are guidance, not medical advice.";

    const usage = completion?.usage ?? {};
    const inTok = Number(usage.prompt_tokens ?? 0);
    const outTok = Number(usage.completion_tokens ?? 0);
    const estCost = (inTok / 1_000_000) * 0.15 + (outTok / 1_000_000) * 0.60;

    await admin.from("openai_request_logs").insert({
      user_id: user.id,
      feature_area: "workout_swap",
      model: OPENAI_MODEL,
      request_tokens: inTok,
      response_tokens: outTok,
      estimated_cost: Number(estCost.toFixed(6)),
      status: "ok",
    });

    return new Response(JSON.stringify({ ok: true, response: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[workout-swap] unhandled", e?.message ?? e);
    return new Response(JSON.stringify({
      error: "assistant_unavailable",
      message: "Swap coach temporarily unavailable.",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
