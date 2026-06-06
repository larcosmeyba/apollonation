// Shared helper for meal-plan generation functions.
// 1) Resolves the user's canonical daily macro targets — the SAME numbers the
//    client dashboard reads from `user_macro_targets` and displays on "Today's
//    Nutrition". Falls back to a Mifflin-St Jeor calc from the active
//    questionnaire when no stored row exists yet.
// 2) Provides `snapDayToTargets()` which proportionally scales every meal in a
//    given day so the day's totals EXACTLY equal the calorie / protein / carb
//    / fat targets (rounding remainders are absorbed by the largest meal so
//    the sum is exact, never below or above).

export interface MacroTargets {
  calorie_target: number;
  protein_grams: number;
  carb_grams: number;
  fat_grams: number;
}

export interface DailyMeal {
  meal_type: string;
  meal_name?: string;
  description?: string;
  ingredients?: string[];
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  [k: string]: any;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function normalizeActivity(v: any): string {
  const s = String(v ?? "").toLowerCase().trim();
  if (s in ACTIVITY_MULTIPLIERS) return s;
  if (s.includes("sedent")) return "sedentary";
  if (s.includes("very")) return "very_active";
  if (s.includes("active") || s.includes("athlete")) return "active";
  if (s.includes("light")) return "light";
  return "moderate";
}

function inferGoalDelta(goal: any): number {
  const g = String(goal ?? "").toLowerCase();
  if (g.includes("lose") || g.includes("cut") || g.includes("fat")) return -500;
  if (g.includes("gain") || g.includes("bulk") || g.includes("muscle") || g.includes("mass")) return 300;
  return 0;
}

/**
 * Returns the macro targets that drive the client's dashboard.
 * Reads `user_macro_targets` first (the single source of truth for
 * "Today's Nutrition"); falls back to Mifflin-St Jeor from the
 * active questionnaire if no stored row exists.
 */
export async function resolveUserMacroTargets(
  supabaseAdmin: any,
  userId: string,
): Promise<MacroTargets> {
  // 1) Prefer the canonical stored row (matches what the dashboard reads).
  const { data: stored } = await supabaseAdmin
    .from("user_macro_targets")
    .select("calorie_target, protein_grams, carb_grams, fat_grams")
    .eq("user_id", userId)
    .maybeSingle();

  if (stored && Number(stored.calorie_target) > 0) {
    return {
      calorie_target: Math.round(Number(stored.calorie_target)),
      protein_grams: Math.round(Number(stored.protein_grams)),
      carb_grams: Math.round(Number(stored.carb_grams)),
      fat_grams: Math.round(Number(stored.fat_grams)),
    };
  }

  // 2) Fall back to the canonical Apollo macro engine (computes + persists).
  try {
    const { recalcAndPersistMacros } = await import("./macro-engine.ts");
    const r = await recalcAndPersistMacros(supabaseAdmin, userId, { source: "auto" });
    if (r) {
      return {
        calorie_target: r.calorie_target,
        protein_grams: r.protein_grams,
        carb_grams: r.carb_grams,
        fat_grams: r.fat_grams,
      };
    }
  } catch (e) {
    console.error("[macro-scaler] engine fallback failed", (e as any)?.message ?? e);
  }

  // 3) Last-resort safe defaults so meal-plan generation never crashes.
  return { calorie_target: 2200, protein_grams: 165, carb_grams: 220, fat_grams: 70 };
}

/**
 * Scales every meal in `meals` so the day's totals EXACTLY equal `targets`.
 * Uses one proportional scale per macro, then absorbs the rounding remainder
 * into the largest meal so totals match to the integer.
 */
export function snapDayToTargets(meals: DailyMeal[], targets: MacroTargets): DailyMeal[] {
  if (!meals?.length) return meals;

  const sum = (key: keyof DailyMeal) =>
    meals.reduce((acc, m) => acc + (Number(m[key]) || 0), 0);

  const totals = {
    calories: sum("calories") || 1,
    protein: sum("protein_grams") || 1,
    carbs: sum("carbs_grams") || 1,
    fat: sum("fat_grams") || 1,
  };

  const ratios = {
    cal: targets.calorie_target / totals.calories,
    pro: targets.protein_grams / totals.protein,
    car: targets.carb_grams / totals.carbs,
    fat: targets.fat_grams / totals.fat,
  };

  // First pass: proportional scale + integer round
  const scaled = meals.map((m) => ({
    ...m,
    calories: Math.max(0, Math.round((Number(m.calories) || 0) * ratios.cal)),
    protein_grams: Math.max(0, Math.round((Number(m.protein_grams) || 0) * ratios.pro)),
    carbs_grams: Math.max(0, Math.round((Number(m.carbs_grams) || 0) * ratios.car)),
    fat_grams: Math.max(0, Math.round((Number(m.fat_grams) || 0) * ratios.fat)),
  }));

  // Second pass: absorb rounding remainder into the largest meal so the
  // day's totals EXACTLY equal the targets (never under, never over).
  const adjust = (key: "calories" | "protein_grams" | "carbs_grams" | "fat_grams", target: number) => {
    const current = scaled.reduce((a, m) => a + m[key], 0);
    const diff = target - current;
    if (diff === 0) return;
    let idx = 0;
    let max = -1;
    scaled.forEach((m, i) => {
      if (m[key] > max) { max = m[key]; idx = i; }
    });
    scaled[idx][key] = Math.max(0, scaled[idx][key] + diff);
  };

  adjust("calories", targets.calorie_target);
  adjust("protein_grams", targets.protein_grams);
  adjust("carbs_grams", targets.carb_grams);
  adjust("fat_grams", targets.fat_grams);

  return scaled;
}
