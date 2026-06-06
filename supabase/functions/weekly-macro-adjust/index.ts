// Weekly adjustment engine — runs on cron every day, but only adjusts users
// whose last adjustment was ≥14 days ago. Compares latest body_metrics weight
// to the weight from ~14 days prior and nudges calories ±150 if progress is
// stalled toward the user's stated goal.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";
import { recalcAndPersistMacros } from "../_shared/macro-engine.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Cron auth — accept either CRON_SECRET header OR service-role JWT
  const auth = req.headers.get("Authorization") ?? "";
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  if (CRON_SECRET && cronHeader !== CRON_SECRET && !auth.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // All users with macro targets older than 14 days
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: targets } = await admin
    .from("user_macro_targets")
    .select("user_id, calorie_target, goal_type, updated_at")
    .lte("updated_at", cutoff);

  const adjustments: any[] = [];

  for (const t of targets ?? []) {
    // Latest weight & weight ~14 days ago
    const { data: weights } = await admin
      .from("body_metrics")
      .select("body_weight_lbs, recorded_at")
      .eq("user_id", t.user_id)
      .not("body_weight_lbs", "is", null)
      .order("recorded_at", { ascending: false })
      .limit(30);

    if (!weights || weights.length < 2) continue;

    const latest = Number(weights[0].body_weight_lbs);
    const cutoffDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const old = weights.find((w) => new Date(w.recorded_at) <= cutoffDate)
      ?? weights[weights.length - 1];
    const prev = Number(old.body_weight_lbs);
    if (!latest || !prev) continue;

    const delta = latest - prev;
    let calAdjust = 0;
    const goal = t.goal_type;

    if (goal === "fat_loss" && delta > -1.0) calAdjust = -150;   // not losing ≥0.5/wk avg
    else if (goal === "muscle_gain" && delta < 0.5) calAdjust = +150; // not gaining ≥0.25/wk avg

    if (calAdjust === 0) continue;

    // Mirror weight into fitness profile so engine recomputes off the truth
    await admin
      .from("user_fitness_profile")
      .update({ weight_lbs: latest, updated_at: new Date().toISOString() })
      .eq("user_id", t.user_id);

    const recalc = await recalcAndPersistMacros(admin, t.user_id, { source: "weekly_adjust" });
    if (!recalc) continue;

    // Apply the ±150 nudge on top of recomputed baseline
    const newCal = recalc.calorie_target + calAdjust;
    const carbCals = newCal - recalc.protein_grams * 4 - recalc.fat_grams * 9;
    const newCarbs = Math.max(0, Math.round(carbCals / 4));

    await admin.from("user_macro_targets").update({
      calorie_target: newCal,
      carb_grams: newCarbs,
      source: "weekly_adjust",
    }).eq("user_id", t.user_id);

    await admin.from("user_fitness_profile").update({
      calorie_target: newCal,
      carb_target_g: newCarbs,
      updated_at: new Date().toISOString(),
    }).eq("user_id", t.user_id);

    adjustments.push({ user_id: t.user_id, delta, calAdjust, newCal });
  }

  return new Response(JSON.stringify({ ok: true, adjusted: adjustments.length, details: adjustments }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
