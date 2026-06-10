// Apollo Reborn — bridge between Supabase + the pure v2 engine.
// Used by generate-meal-plan and weekly-meal-plan-refresh when
// NUTRITION_GENERATOR_V2=true. Returns the same shape both functions
// previously got from the AI gateway so the downstream insert logic
// (incl. snapDayToTargets) stays unchanged.

import { buildProfile, generateWeek, type MealRow, type Profile } from "./meal-plan-engine.ts";

export const isV2Enabled = (): boolean =>
  (Deno.env.get("NUTRITION_GENERATOR_V2") ?? "false").toLowerCase() === "true";

export const isV2ForcedForTest = (req: Request): boolean => {
  const hdr = req.headers.get("x-nutrition-generator") ?? "";
  return hdr.toLowerCase() === "v2";
};

// Coerce one meal_library row into the engine's MealRow type. Tolerates
// the half-typed JSON we get from the REST client (arrays may be string
// or array).
const toMealRow = (r: any): MealRow => ({
  meal_code: r.meal_code,
  meal_name: r.meal_name,
  meal_type: r.meal_type,
  calories: Number(r.calories ?? 0),
  protein_grams: Number(r.protein_grams ?? 0),
  carbs_grams: Number(r.carbs_grams ?? 0),
  fat_grams: Number(r.fat_grams ?? 0),
  fiber_grams: r.fiber_grams != null ? Number(r.fiber_grams) : null,
  ingredients: r.ingredients ?? "",
  instructions: r.instructions ?? "",
  prep_time: String(r.prep_time ?? ""),
  cook_time: String(r.cook_time ?? ""),
  serving_size: Number(r.serving_size ?? 1),
  difficulty: r.difficulty ?? "Medium",
  goal_tags: r.goal_tags ?? [],
  dietary_tags: r.dietary_tags ?? [],
  allergy_tags: r.allergy_tags ?? [],
  budget_level: r.budget_level ?? "Mid",
  is_high_protein: !!r.is_high_protein,
  is_vegan: !!r.is_vegan,
  is_vegetarian: !!r.is_vegetarian,
  is_kosher_friendly: !!r.is_kosher_friendly,
  is_gluten_free: !!r.is_gluten_free,
  is_dairy_free: !!r.is_dairy_free,
  is_pescatarian: !!r.is_pescatarian,
});

export async function fetchMealLibrary(supabaseAdmin: any): Promise<MealRow[]> {
  const { data, error } = await supabaseAdmin.from("meal_library").select("*");
  if (error) throw new Error(`meal_library fetch failed: ${error.message}`);
  return (data ?? []).map(toMealRow);
}

// Result shape compatible with what the legacy AI path produced, so the
// surrounding snap/insert logic continues to work unchanged.
export type V2DayMeal = {
  meal_type: string;
  meal_name: string;
  description: string;
  ingredients: string[];
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  meal_id?: string; // for traceability — meal_code from library
};

export type V2Result = {
  days: Array<{ day_number: number; meals: V2DayMeal[] }>;
  needs_review: boolean;
  gap_reason: string | null;
  generator_version: "v2";
};

const SLOT_TO_TYPE = (slot: string): string => {
  if (slot === "Breakfast") return "breakfast";
  if (slot === "Lunch") return "lunch";
  if (slot === "Dinner") return "dinner";
  return "snack";
};

// ---- P0 safety belt: hard post-generation validator ----
// Even if the engine pool filter is bypassed (data bug, library mistag),
// refuse to emit any meal violating dietary_preference or allergies.
import { type DietPref } from "./meal-plan-engine.ts";

const _dietOk = (m: any, p: DietPref) => {
  switch (p) {
    case "Vegan": return !!m.is_vegan;
    case "Vegetarian": return !!m.is_vegetarian;
    case "Pescatarian": return !!m.is_pescatarian;
    case "Kosher Friendly": return !!m.is_kosher_friendly;
    case "Gluten Free": return !!m.is_gluten_free;
    case "Dairy Free": return !!m.is_dairy_free;
    default: return true;
  }
};
const _allergensOverlap = (allergyTags: string[] | null | undefined, allergies: string[]) => {
  if (!allergies?.length) return false;
  const tags = (allergyTags || []).map((s) => String(s).toLowerCase()).filter((t) => t && t !== "none");
  const blocked = allergies.map((s) => String(s).toLowerCase());
  return tags.some((t) => blocked.some((b) => t === b || t.includes(b) || b.includes(t)));
};

export async function runV2ForUser(
  supabaseAdmin: any,
  userId: string,
  macros: { calorie_target: number; protein_grams: number; carb_grams: number; fat_grams: number },
  weeks = 4,
): Promise<V2Result> {
  // P0 ROOT-CAUSE FIX: previously these SELECTs included `household_size`,
  // which does NOT exist on any of these three tables. PostgREST returned
  // an error, `data` came back null, and dietary_preferences/allergies
  // silently fell back to defaults (Standard, none). That is why U2's
  // vegan + nut-allergy plan included chicken/turkey/almond butter.
  // Column removed. Errors are now logged instead of swallowed.
  const { data: q, error: qErr } = await supabaseAdmin
    .from("client_questionnaires")
    .select("dietary_restrictions, disliked_foods, weekly_food_budget, goal_next_4_weeks")
    .eq("user_id", userId).eq("is_active", true)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (qErr) console.error("[v2-meal] client_questionnaires error:", qErr.message);

  const { data: nq, error: nqErr } = await supabaseAdmin
    .from("client_nutrition_questionnaires")
    .select("allergies, dietary_restrictions, meals_per_day, grocery_budget_weekly")
    .eq("user_id", userId).maybeSingle();
  if (nqErr) console.error("[v2-meal] client_nutrition_questionnaires error:", nqErr.message);

  const { data: fitness, error: fErr } = await supabaseAdmin
    .from("user_fitness_profile")
    .select("primary_goal, dietary_preferences, allergies, disliked_foods, meals_per_day, weekly_food_budget")
    .eq("user_id", userId).maybeSingle();
  if (fErr) console.error("[v2-meal] user_fitness_profile error:", fErr.message);

  // Treat empty arrays as "not provided" so the cascade reaches the next source.
  const nz = <T>(v: T[] | null | undefined): T[] | null => (v && v.length > 0 ? v : null);
  const profileInput = {
    goal: fitness?.primary_goal ?? q?.goal_next_4_weeks ?? null,
    daily_calories: macros.calorie_target,
    protein_target: macros.protein_grams,
    carb_target: macros.carb_grams,
    fat_target: macros.fat_grams,
    dietary_preferences:
      nz(fitness?.dietary_preferences) ?? nz(q?.dietary_restrictions) ?? nz(nq?.dietary_restrictions) ?? [],
    allergies: nz(fitness?.allergies) ?? nz(nq?.allergies) ?? [],
    foods_disliked: nz(fitness?.disliked_foods) ?? nz(q?.disliked_foods) ?? [],
    meals_per_day: fitness?.meals_per_day ?? nq?.meals_per_day ?? 4,
    cooking_skill: "Medium",
    prep_time_pref: "Standard",
    household_size: 1,
    budget_help_needed: !!(q?.weekly_food_budget ?? nq?.grocery_budget_weekly ?? fitness?.weekly_food_budget),
    weekly_budget: q?.weekly_food_budget ?? nq?.grocery_budget_weekly ?? fitness?.weekly_food_budget ?? null,
  };
  const profile: Profile = buildProfile(profileInput);
  console.log(`[v2-meal] user=${userId} diet=${profile.dietary_preference} allergies=${JSON.stringify(profile.allergies)}`);

  const meals = await fetchMealLibrary(supabaseAdmin);
  const codeMap = new Map(meals.map((m) => [m.meal_code, m]));
  const week = generateWeek(meals, profile);

  const days: V2Result["days"] = [];
  let violationsCount = 0;
  const violationSamples: any[] = [];

  for (let w = 0; w < weeks; w++) {
    for (const d of week.days) {
      const kept: V2DayMeal[] = [];
      for (const m of d.meals) {
        const lib = codeMap.get(m.meal_code);
        const dietBad = lib ? !_dietOk(lib, profile.dietary_preference) : false;
        const allergyBad = lib ? _allergensOverlap(lib.allergy_tags, profile.allergies) : false;
        if (dietBad || allergyBad) {
          violationsCount++;
          if (violationSamples.length < 10) {
            violationSamples.push({ day: w * 7 + d.day_number, meal_id: m.meal_code, meal_name: m.meal_name,
              reasons: [dietBad && `diet:${profile.dietary_preference}`, allergyBad && `allergy`].filter(Boolean) });
          }
          continue; // DROP — never persist a forbidden meal.
        }
        kept.push({
          meal_type: SLOT_TO_TYPE(m.slot),
          meal_name: m.meal_name,
          description: m.instructions || "",
          ingredients: typeof m.ingredients === "string"
            ? m.ingredients.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
            : (m.ingredients as any),
          calories: m.scaled_calories,
          protein_grams: m.scaled_protein,
          carbs_grams: m.scaled_carbs,
          fat_grams: m.scaled_fat,
          meal_id: m.meal_code,
        });
      }
      days.push({ day_number: w * 7 + d.day_number, meals: kept });
    }
  }
  if (violationsCount > 0) {
    console.error(`[v2-meal] POST-GEN VALIDATOR dropped ${violationsCount} forbidden meals`,
      JSON.stringify(violationSamples));
  }

  return {
    days,
    needs_review: week.needs_review || violationsCount > 0,
    gap_reason: violationsCount > 0
      ? `post-gen validator dropped ${violationsCount} forbidden meals (${week.gap_reasons[0] ?? "ok"})`
      : (week.gap_reasons[0] ?? null),
    generator_version: "v2",
  };
}
