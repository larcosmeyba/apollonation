// Apollo Program Recommendation — OpenAI-powered program picker.
// Pulls user profile + recent activity, asks OpenAI to pick from the
// active program library, returns top recommendations with reasoning.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const DAILY_LIMIT = Number(Deno.env.get("PROGRAM_REC_DAILY_LIMIT") ?? "10");

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          program_id: { type: "string" },
          program_name: { type: "string" },
          fit_score: { type: "number" },
          reason: { type: "string" },
        },
        required: ["program_id", "program_name", "fit_score", "reason"],
      },
    },
    disclaimer: { type: "string" },
  },
  required: ["headline", "recommendations", "disclaimer"],
} as const;

const SAFETY_RULES = `You are Apollo Program Coach. Recommend training programs that match the user's goal, experience, and schedule.
HARD RULES:
- Recommend ONLY programs from the provided library. Use the EXACT program_id from the library.
- Never invent programs. Never recommend medical or rehab programs.
- Pick 1–3 programs, ordered by best fit. fit_score is 0–100.
- Always include disclaimer: "Recommendations are guidance, not medical advice."`;

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

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Daily limit
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("openai_request_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature_area", "program_recommendation")
      .gte("created_at", since);
    if ((count ?? 0) >= DAILY_LIMIT) {
      return new Response(JSON.stringify({
        error: "rate_limit",
        message: `Daily program recommendation limit reached (${DAILY_LIMIT}). Try again tomorrow.`,
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: profile }, { data: programs }, { data: recent }] = await Promise.all([
      admin.from("user_fitness_profile").select(
        "primary_goal, training_experience, training_days_per_week, workout_duration_minutes, workout_environment, injuries, preferred_training_days, sex, age",
      ).eq("user_id", user.id).maybeSingle(),
      admin.from("programs").select("id, name, description, category, durations")
        .eq("is_active", true).order("sort_order", { ascending: true }),
      admin.from("user_workout_completions").select("workout_id, completed_at")
        .eq("user_id", user.id).order("completed_at", { ascending: false }).limit(20),
    ]);

    if (!programs?.length) {
      return new Response(JSON.stringify({
        error: "no_programs",
        message: "No active programs available.",
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const library = programs.map((p: any) =>
      `- id=${p.id} | ${p.name} | category=${p.category ?? "n/a"} | durations=${(p.durations ?? []).join(",")} | ${p.description ?? ""}`
    ).join("\n");

    const context = {
      profile: profile ?? {},
      recent_workouts_count: recent?.length ?? 0,
    };

    const systemPrompt = `${SAFETY_RULES}\n\nUSER CONTEXT (JSON):\n${JSON.stringify(context)}\n\nAVAILABLE PROGRAMS:\n${library}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: 800,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Recommend the best programs for me right now and briefly explain why each fits." },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "program_rec", strict: true, schema: RESPONSE_SCHEMA },
        },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("[program-rec] OpenAI error", openaiRes.status, errText);
      await admin.from("openai_request_logs").insert({
        user_id: user.id, feature_area: "program_recommendation",
        model: OPENAI_MODEL, status: "error",
        error_message: `OpenAI ${openaiRes.status}: ${errText.slice(0, 500)}`,
      });
      return new Response(JSON.stringify({
        error: "assistant_unavailable",
        message: "Program coach temporarily unavailable.",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const completion = await openaiRes.json();
    const content = completion?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch { parsed = null; }

    // Validate program_ids exist
    const validIds = new Set(programs.map((p: any) => p.id));
    if (parsed?.recommendations) {
      parsed.recommendations = parsed.recommendations.filter((r: any) => validIds.has(r.program_id));
    }

    if (!parsed?.headline || !parsed?.recommendations?.length) {
      return new Response(JSON.stringify({
        error: "assistant_unavailable",
        message: "Could not generate recommendations.",
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!parsed.disclaimer) parsed.disclaimer = "Recommendations are guidance, not medical advice.";

    const usage = completion?.usage ?? {};
    const inTok = Number(usage.prompt_tokens ?? 0);
    const outTok = Number(usage.completion_tokens ?? 0);
    const estCost = (inTok / 1_000_000) * 0.15 + (outTok / 1_000_000) * 0.60;

    await admin.from("openai_request_logs").insert({
      user_id: user.id,
      feature_area: "program_recommendation",
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
    console.error("[program-rec] unhandled", e?.message ?? e);
    return new Response(JSON.stringify({
      error: "assistant_unavailable",
      message: "Program coach temporarily unavailable.",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
