// QA ENGINE RUNNER — service-role/secret-gated. Provisions QA users U1+U2
// and runs the v2 workout + v2 nutrition engines directly (same code path
// production functions use). Bypasses user-JWT auth — gate is x-qa-secret
// matching CRON_SECRET. For internal QA only.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  fetchExerciseLibrary, fetchBlueprints,
  buildWorkoutProfileFromQuestionnaire, runV2Workout, sessionToRows,
} from "../_shared/v2-workout-runner.ts";
import { runV2ForUser as runV2NutritionForUser } from "../_shared/v2-meal-plan-runner.ts";
import { resolveUserMacroTargets, snapDayToTargets } from "../_shared/macro-scaler.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

const USERS = [
  {
    key: "U1",
    email: "qa-u1-gym@apolloreborn.test",
    password: "QaPassU1!_2026",
    profile: { display_name: "QA U1 Gym" },
    questionnaire: {
      sex: "male", age: 30, height_inches: 70, weight_lbs: 180,
      activity_level: "active", workout_days_per_week: 4,
      training_methods: ["Barbell","Dumbbell","Cable","Bodyweight"],
      goal_next_4_weeks: "Muscle Gain",
      dietary_restrictions: [], disliked_foods: [],
      workout_duration_minutes: 45, fitness_experience: "intermediate",
      workout_environment: "Gym",
      cycle_number: 1, is_active: true, waiver_accepted: true,
    },
    fitness: {
      primary_goal: "Muscle Gain", dietary_preferences: [], allergies: [],
      meals_per_day: 4,
    },
    macros: { calorie_target: 2800, protein_grams: 200, carb_grams: 320, fat_grams: 80, goal_type: "muscle_gain" },
  },
  {
    key: "U2",
    email: "qa-u2-home@apolloreborn.test",
    password: "QaPassU2!_2026",
    profile: { display_name: "QA U2 Home" },
    questionnaire: {
      sex: "female", age: 28, height_inches: 65, weight_lbs: 150,
      activity_level: "moderate", workout_days_per_week: 3,
      training_methods: ["Bodyweight","Dumbbell"],
      goal_next_4_weeks: "Fat Loss",
      dietary_restrictions: ["vegan"], disliked_foods: [],
      workout_duration_minutes: 30, fitness_experience: "beginner",
      workout_environment: "At Home",
      cycle_number: 1, is_active: true, waiver_accepted: true,
    },
    fitness: {
      primary_goal: "Fat Loss",
      dietary_preferences: ["vegan"],
      allergies: ["Nuts"],
      meals_per_day: 4,
    },
    macros: { calorie_target: 1700, protein_grams: 130, carb_grams: 180, fat_grams: 55, goal_type: "fat_loss" },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // One-shot QA gating: hardcoded long token. Function will be deleted post-QA.
  const QA_TOKEN = "qa-7c2a4f9e-31b8-4d6c-9a0e-apollo-T1T4-rerun-2026";
  const secret = req.headers.get("x-qa-secret");
  if (secret !== QA_TOKEN) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: cors });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const url = new URL(req.url);
  // P0 debug endpoint — accept params in POST body (root-cause fix #1).
  // Body: { user_id: string, macros?: {...}, mode: "debug-profile" }
  if (url.searchParams.get("mode") === "debug-profile" || req.method === "POST") {
    let body: any = {};
    try { body = req.method === "POST" ? await req.json() : {}; } catch { /* noop */ }
    if ((body?.mode ?? url.searchParams.get("mode")) === "debug-profile") {
      const userId = body.user_id ?? "b0cc3e18-9437-48ec-885e-88723630c9af";
      const macros = body.macros ?? { calorie_target: 1700, protein_grams: 130, carb_grams: 180, fat_grams: 55 };

      // Mirror runV2ForUser exactly to dump the resolved Profile.
      const { data: q, error: qErr } = await admin.from("client_questionnaires")
        .select("dietary_restrictions, disliked_foods, weekly_food_budget, goal_next_4_weeks")
        .eq("user_id", userId).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: nq, error: nqErr } = await admin.from("client_nutrition_questionnaires")
        .select("allergies, dietary_restrictions, meals_per_day, grocery_budget_weekly")
        .eq("user_id", userId).maybeSingle();
      const { data: fitness, error: fErr } = await admin.from("user_fitness_profile")
        .select("primary_goal, dietary_preferences, allergies, disliked_foods, meals_per_day, weekly_food_budget")
        .eq("user_id", userId).maybeSingle();

      const { fetchMealLibrary } = await import("../_shared/v2-meal-plan-runner.ts");
      const { buildProfile } = await import("../_shared/meal-plan-engine.ts");
      const nz = <T,>(v: T[] | null | undefined): T[] | null => (v && v.length > 0 ? v : null);
      const profileInput = {
        goal: fitness?.primary_goal ?? q?.goal_next_4_weeks ?? null,
        daily_calories: macros.calorie_target, protein_target: macros.protein_grams,
        carb_target: macros.carb_grams, fat_target: macros.fat_grams,
        dietary_preferences:
          nz(fitness?.dietary_preferences) ?? nz(q?.dietary_restrictions) ?? nz(nq?.dietary_restrictions) ?? [],
        allergies: nz(fitness?.allergies) ?? nz(nq?.allergies) ?? [],
        foods_disliked: nz(fitness?.disliked_foods) ?? nz(q?.disliked_foods) ?? [],
        meals_per_day: fitness?.meals_per_day ?? nq?.meals_per_day ?? 4,
        cooking_skill: "Medium", prep_time_pref: "Standard",
        household_size: 1, budget_help_needed: false, weekly_budget: null,
      };
      const profile = buildProfile(profileInput as any);
      const meals = await fetchMealLibrary(admin);
      const allowed = meals.filter((m: any) => {
        const dietOk =
          profile.dietary_preference === "Standard" ? true :
          profile.dietary_preference === "Vegan" ? m.is_vegan :
          profile.dietary_preference === "Vegetarian" ? m.is_vegetarian :
          profile.dietary_preference === "Pescatarian" ? m.is_pescatarian : true;
        const tags = (m.allergy_tags || []).map((t: string) => String(t).toLowerCase());
        const blocked = profile.allergies.map((a) => a.toLowerCase());
        const allergyHit = tags.some((t: string) => blocked.some((b) => t === b || t.includes(b) || b.includes(t)));
        return dietOk && !allergyHit;
      });
      return new Response(JSON.stringify({
        user_id: userId,
        rawRows: { q, qErr, nq, nqErr, fitness, fErr },
        profileInput, resolvedProfile: profile,
        libCount: meals.length, allowedCount: allowed.length,
        allowedByType: {
          breakfast: allowed.filter((m: any) => m.meal_type === "Breakfast").length,
          lunch: allowed.filter((m: any) => m.meal_type === "Lunch").length,
          dinner: allowed.filter((m: any) => m.meal_type === "Dinner").length,
          snack: allowed.filter((m: any) => m.meal_type === "Snack").length,
        },
        allowedSample: allowed.slice(0, 8).map((m: any) => ({ code: m.meal_code, name: m.meal_name, type: m.meal_type })),
      }, null, 2), { headers: { ...cors, "Content-Type": "application/json" } });
    }
  }


  const out: any = { users: [], workout: [], nutrition: [] };

  try {
    // 1) Provision users
    for (const u of USERS) {
      // Check if user already exists
      const { data: existing } = await admin.auth.admin.listUsers();
      let userId = existing?.users.find((x: any) => x.email === u.email)?.id;
      if (!userId) {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: u.email, password: u.password, email_confirm: true,
          user_metadata: u.profile,
        });
        if (cErr) throw new Error(`create ${u.key}: ${cErr.message}`);
        userId = created.user!.id;
      }
      out.users.push({ key: u.key, user_id: userId, email: u.email });

      // Archive prior plans
      await admin.from("client_training_plans").update({ status: "archived" })
        .eq("user_id", userId).eq("status", "active");
      await admin.from("nutrition_plans").update({ status: "archived" })
        .eq("user_id", userId).eq("status", "active");

      // Upsert macros
      await admin.from("user_macro_targets").upsert({
        user_id: userId, ...u.macros, source: "qa-seed",
      }, { onConflict: "user_id" });

      // Upsert fitness profile (drives meal engine inputs)
      await admin.from("user_fitness_profile").upsert({
        user_id: userId, sex: u.questionnaire.sex, age: u.questionnaire.age,
        height_inches: u.questionnaire.height_inches, weight_lbs: u.questionnaire.weight_lbs,
        activity_level: u.questionnaire.activity_level,
        training_days_per_week: u.questionnaire.workout_days_per_week,
        workout_duration_minutes: u.questionnaire.workout_duration_minutes,
        workout_environment: u.questionnaire.workout_environment,
        training_experience: u.questionnaire.fitness_experience,
        ...u.fitness,
        onboarding_completed: true, nutrition_completed: true,
      }, { onConflict: "user_id" });

      // Insert questionnaire (fresh, deactivate old)
      await admin.from("client_questionnaires").update({ is_active: false })
        .eq("user_id", userId).eq("is_active", true);
      const { data: qRow, error: qErr } = await admin.from("client_questionnaires")
        .insert({ user_id: userId, ...u.questionnaire })
        .select().single();
      if (qErr) throw new Error(`q insert ${u.key}: ${qErr.message}`);
      (u as any).questionnaireId = qRow.id;
      (u as any).userId = userId;
    }

    // 2) Run v2 workout engine for both
    const [library, blueprints] = await Promise.all([
      fetchExerciseLibrary(admin), fetchBlueprints(admin),
    ]);

    for (const u of USERS) {
      const profile = buildWorkoutProfileFromQuestionnaire(u.questionnaire);
      const v2 = runV2Workout(profile, blueprints, library);
      const { data: plan, error: pErr } = await admin.from("client_training_plans")
        .insert({
          user_id: (u as any).userId, questionnaire_id: (u as any).questionnaireId,
          title: `QA ${u.key} ${u.questionnaire.goal_next_4_weeks} - 4wk`,
          cycle_number: 1, workout_days_per_week: profile.days_per_week,
          duration_weeks: 4, status: "active",
          program_slug: v2.program_slug, generator_version: "v2",
          needs_review: v2.needs_review, gap_reason: v2.gap_reason,
        }).select().single();
      if (pErr) throw new Error(`plan ${u.key}: ${pErr.message}`);

      for (let w = 0; w < v2.weeks.length; w++) {
        for (let d = 0; d < v2.weeks[w].length; d++) {
          const sess = v2.weeks[w][d];
          const { data: dayRow } = await admin.from("training_plan_days")
            .insert({ plan_id: plan.id, day_number: w * 7 + d + 1,
              day_label: `Week ${w + 1} - ${sess.day_focus}`, focus: sess.day_focus })
            .select().single();
          const rows = sessionToRows(sess).map((r) => ({ ...r, day_id: dayRow!.id }));
          if (rows.length) await admin.from("training_plan_exercises").insert(rows);
        }
      }
      out.workout.push({
        key: u.key, user_id: (u as any).userId, plan_id: plan.id,
        program_slug: v2.program_slug, needs_review: v2.needs_review,
        gap_reason: v2.gap_reason, weeks: v2.weeks.length, days_per_week: v2.weeks[0]?.length ?? 0,
      });
    }

    // 3) Run v2 nutrition engine for both
    for (const u of USERS) {
      const userId = (u as any).userId;
      const targets = await resolveUserMacroTargets(admin, userId);
      const v2n = await runV2NutritionForUser(admin, userId, targets, 4);

      const { data: np, error: npErr } = await admin.from("nutrition_plans")
        .insert({
          user_id: userId, created_by: userId,
          title: `QA ${u.key} ${u.questionnaire.goal_next_4_weeks} Meal Plan`,
          daily_calories: targets.calorie_target,
          protein_grams: targets.protein_grams,
          carbs_grams: targets.carb_grams,
          fat_grams: targets.fat_grams,
          duration_weeks: 4, status: "active",
          needs_review: v2n.needs_review, gap_reason: v2n.gap_reason,
          generator_version: v2n.generator_version,
        }).select().single();
      if (npErr) throw new Error(`nplan ${u.key}: ${npErr.message}`);

      const allMeals: any[] = [];
      for (const day of v2n.days) {
        // P4 FIX: do NOT call snapDayToTargets here — v2 already scales
        // serving sizes via the engine. snap would overwrite per-meal macros
        // with target-derived numbers; we want displayed macros to be the
        // real sum of the meals chosen for the day.
        for (const meal of day.meals) {
          allMeals.push({
            plan_id: np.id, day_number: day.day_number,
            meal_type: meal.meal_type, meal_name: meal.meal_name,
            description: meal.description, ingredients: meal.ingredients,
            calories: meal.calories, protein_grams: meal.protein_grams,
            carbs_grams: meal.carbs_grams, fat_grams: meal.fat_grams,
            meal_id: (meal as any).meal_id ?? null,
            sort_order: meal.meal_type === "breakfast" ? 0 : meal.meal_type === "lunch" ? 1 : meal.meal_type === "dinner" ? 2 : 3,
          });
        }
      }
      await admin.from("nutrition_plan_meals").insert(allMeals);
      await admin.from("meal_plan_generation_log").insert({
        user_id: userId, plan_id: np.id, generator_version: v2n.generator_version,
        status: "success", needs_review: v2n.needs_review, gap_reason: v2n.gap_reason,
        details: { meal_count: allMeals.length, days: v2n.days.length, source: "qa-run-engines", targets },
      });

      out.nutrition.push({
        key: u.key, user_id: userId, plan_id: np.id,
        generator_version: v2n.generator_version, needs_review: v2n.needs_review,
        gap_reason: v2n.gap_reason, days: v2n.days.length, meal_count: allMeals.length,
        targets,
      });
    }

    return new Response(JSON.stringify(out, null, 2), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), partial: out }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
