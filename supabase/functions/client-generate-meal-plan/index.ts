// Client-callable meal plan generator. Runs the v2 deterministic engine for
// the *authenticated caller* — no admin role required. This is what the Fuel
// tab auto-trigger uses so clients don't sit forever on "Plan Being Prepared".
//
// Safety belt: post-generation validator (in v2-meal-plan-runner) drops any
// meal whose dietary/allergy flags violate the caller's profile.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { resolveUserMacroTargets } from "../_shared/macro-scaler.ts";
import { runV2ForUser } from "../_shared/v2-meal-plan-runner.ts";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { requirePremium } from "../_shared/entitlement.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const pre = handlePreflight(req); if (pre) return pre;
  const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "Invalid token" }, 401);
    const userId = userData.user.id;

    // Entitlement gate: meal plan generation is a premium feature.
    const denied = await requirePremium(userId, corsHeaders);
    if (denied) return denied;

    // Rate limit: 5 generations / user / day. Plenty for retries; blocks abuse.
    const allowed = await checkRateLimit(userId, "client-generate-meal-plan", 5, 1440);
    if (!allowed) return rateLimitResponse(corsHeaders);

    // Privacy opt-out: respect AI personalization toggle.
    const { data: privacy } = await supabaseAdmin
      .from("user_privacy_preferences")
      .select("ai_personalization_opted_out")
      .eq("user_id", userId)
      .maybeSingle();
    if (privacy?.ai_personalization_opted_out) {
      return json({ error: "AI personalization is disabled in your privacy settings." }, 403);
    }

    // Canonical macros — same source as the dashboard "Today's Nutrition" tiles.
    let targets;
    try {
      targets = await resolveUserMacroTargets(supabaseAdmin, userId);
    } catch (e: any) {
      return json({
        error: "missing_macros",
        message: "Complete your fuel questionnaire so we can calculate your targets first.",
        detail: e?.message ?? null,
      }, 412);
    }
    if (!targets?.calorie_target || !targets?.protein_grams) {
      return json({
        error: "missing_macros",
        message: "Complete your fuel questionnaire so we can calculate your targets first.",
      }, 412);
    }

    // Pause any pre-existing active plan so we don't keep stale meals around.
    await supabaseAdmin
      .from("nutrition_plans")
      .update({ status: "archived" })
      .eq("user_id", userId)
      .eq("status", "active");

    // Run the deterministic library engine — diet + allergy filtered.
    const v2 = await runV2ForUser(supabaseAdmin, userId, targets, 4);

    if (!v2.days.length || v2.days.every((d) => d.meals.length === 0)) {
      // Restore previous plan rather than leave the user planless.
      await supabaseAdmin
        .from("nutrition_plans")
        .update({ status: "active" })
        .eq("user_id", userId)
        .eq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(1);
      return json({
        error: "engine_empty",
        message: "We couldn't build a plan from the current meal library for your dietary profile. A coach will follow up.",
        gap_reason: v2.gap_reason,
      }, 422);
    }

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("nutrition_plans")
      .insert({
        user_id: userId,
        created_by: userId,
        title: "Your Meal Plan",
        daily_calories: targets.calorie_target,
        protein_grams: targets.protein_grams,
        carbs_grams: targets.carb_grams,
        fat_grams: targets.fat_grams,
        duration_weeks: 4,
        status: "active",
        needs_review: v2.needs_review,
        gap_reason: v2.gap_reason,
        generator_version: v2.generator_version,
      })
      .select()
      .single();
    if (planErr || !plan) throw new Error(`plan insert failed: ${planErr?.message}`);

    const rows: any[] = [];
    for (const day of v2.days) {
      for (const meal of day.meals) {
        rows.push({
          plan_id: plan.id,
          day_number: day.day_number,
          meal_type: meal.meal_type,
          meal_name: meal.meal_name,
          description: meal.description,
          ingredients: meal.ingredients,
          calories: meal.calories,
          protein_grams: meal.protein_grams,
          carbs_grams: meal.carbs_grams,
          fat_grams: meal.fat_grams,
          meal_id: (meal as any).meal_id ?? null,
          sort_order:
            meal.meal_type === "breakfast" ? 0 :
            meal.meal_type === "lunch" ? 1 :
            meal.meal_type === "dinner" ? 2 : 3,
        });
      }
    }

    const { error: mealsErr } = await supabaseAdmin
      .from("nutrition_plan_meals")
      .insert(rows);
    if (mealsErr) {
      await supabaseAdmin.from("nutrition_plans").delete().eq("id", plan.id);
      throw new Error(`meals insert failed: ${mealsErr.message}`);
    }

    await supabaseAdmin.from("meal_plan_generation_log").insert({
      user_id: userId,
      plan_id: plan.id,
      generator_version: v2.generator_version,
      status: "success",
      needs_review: v2.needs_review,
      gap_reason: v2.gap_reason,
      details: {
        meal_count: rows.length,
        days: v2.days.length,
        source: "client-generate-meal-plan",
        macros: targets,
      },
    });

    return json({
      success: true,
      plan,
      mealsCount: rows.length,
      generator_version: v2.generator_version,
      needs_review: v2.needs_review,
      gap_reason: v2.gap_reason,
    });
  } catch (e: any) {
    console.error("[client-generate-meal-plan] error:", e);
    return json({ error: e?.message ?? "Unknown error" }, 500);
  }
});
