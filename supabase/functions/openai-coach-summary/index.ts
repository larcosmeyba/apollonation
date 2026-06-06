// Coach Summary — On-demand AI briefing for Coach Marcos/admins.
// Manually triggered only (no scheduling). Aggregates a client's recent data
// and returns a short structured digest. Uses OpenAI via OPENAI_API_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MODEL = "gpt-5-mini";
const FEATURE = "coach_summary";

function estimateCost(model: string, inTok: number, outTok: number): number {
  // rough $ estimate per 1k tokens
  const rates: Record<string, { in: number; out: number }> = {
    "gpt-5-mini": { in: 0.00025, out: 0.002 },
    "gpt-5": { in: 0.00125, out: 0.01 },
  };
  const r = rates[model] ?? rates["gpt-5-mini"];
  return (inTok / 1000) * r.in + (outTok / 1000) * r.out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const actor = userData.user;

    // Admin check (only admins/coaches may request a summary)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", actor.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const clientId: string | undefined = body?.client_id;
    if (!clientId) {
      return new Response(JSON.stringify({ error: "client_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate context
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const sinceDate = since.slice(0, 10);

    const [profileRes, fitnessRes, macrosRes, macroLogsRes, completionsRes, bodyRes, intakeRes, recentMsgsRes] = await Promise.all([
      admin.from("profiles").select("display_name, entitlement, subscription_tier").eq("user_id", clientId).maybeSingle(),
      admin.from("user_fitness_profile").select("sex, age, height_inches, weight_lbs, goal_weight_lbs, primary_goal, activity_level, training_days_per_week, injuries").eq("user_id", clientId).maybeSingle(),
      admin.from("user_macro_targets").select("calorie_target, protein_target_g, carb_target_g, fat_target_g, updated_at").eq("user_id", clientId).maybeSingle(),
      admin.from("macro_logs").select("log_date, calories, protein_g, carbs_g, fat_g").eq("user_id", clientId).gte("log_date", sinceDate).order("log_date", { ascending: false }).limit(14),
      admin.from("user_workout_completions").select("completed_at, duration_minutes, calories").eq("user_id", clientId).gte("completed_at", since).order("completed_at", { ascending: false }).limit(20),
      admin.from("body_metrics").select("recorded_at, weight_lbs, body_fat_percentage").eq("user_id", clientId).order("recorded_at", { ascending: false }).limit(6),
      admin.from("coach_intake_responses").select("primary_goal, biggest_obstacle, training_history, notes_for_coach, created_at").eq("user_id", clientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("messages").select("sender_id, content, created_at").or(`sender_id.eq.${clientId},recipient_id.eq.${clientId}`).order("created_at", { ascending: false }).limit(10),
    ]);

    const ctx = {
      profile: profileRes.data,
      fitness: fitnessRes.data,
      targets: macrosRes.data,
      recent_macro_logs: macroLogsRes.data ?? [],
      recent_workouts: completionsRes.data ?? [],
      body_metrics: bodyRes.data ?? [],
      intake: intakeRes.data,
      last_messages: (recentMsgsRes.data ?? []).reverse(),
    };

    const system = `You are a briefing assistant for Coach Marcos at Apollo Reborn. Produce a concise, factual digest of the client below so the coach can reply intelligently. No medical advice. No diagnoses. Flag possible eating-disorder or injury concerns ONLY by suggesting the coach check in personally — never give clinical guidance.`;

    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["client_name", "headline", "adherence", "trends", "talking_points", "flags"],
      properties: {
        client_name: { type: "string" },
        headline: { type: "string", description: "1-sentence summary of where this client is right now." },
        adherence: {
          type: "object", additionalProperties: false,
          required: ["nutrition", "training"],
          properties: {
            nutrition: { type: "string" },
            training: { type: "string" },
          },
        },
        trends: { type: "array", items: { type: "string" }, description: "Weight / body / streak observations from data only." },
        talking_points: { type: "array", items: { type: "string" }, description: "3-5 specific things Coach Marcos should mention in the next message." },
        flags: { type: "array", items: { type: "string" }, description: "Anything unusual to watch (injury mentions, missed week, big calorie swings)." },
      },
    };

    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Client data (last 14 days):\n${JSON.stringify(ctx)}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "coach_summary", strict: true, schema },
      },
    };

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify(payload),
    });

    const aiJson = await aiRes.json();
    if (!aiRes.ok) {
      await admin.from("openai_request_logs").insert({
        user_id: actor.id, feature_area: FEATURE, assistant_mode: "summary",
        model: MODEL, status: "error", error_message: JSON.stringify(aiJson).slice(0, 500),
      });
      return new Response(JSON.stringify({ error: "ai_failed", detail: aiJson }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const usage = aiJson?.usage ?? {};
    const inTok = usage.prompt_tokens ?? 0;
    const outTok = usage.completion_tokens ?? 0;

    await admin.from("openai_request_logs").insert({
      user_id: actor.id, feature_area: FEATURE, assistant_mode: "summary",
      model: MODEL, request_tokens: inTok, response_tokens: outTok,
      estimated_cost: estimateCost(MODEL, inTok, outTok), status: "success",
    });

    return new Response(JSON.stringify({ summary: parsed, client_id: clientId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
