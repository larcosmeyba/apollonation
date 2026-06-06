// APOLLO REBORN — Canonical Macro Calculation Engine
// Single source of truth used by every backend function (and mirrored in
// src/lib/macroEngine.ts for the client). All consumers MUST use this.

export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active"
  | "athlete";
export type GoalType =
  | "fat_loss"
  | "maintenance"
  | "muscle_gain"
  | "recomposition"
  | "endurance";
export type GoalIntensity =
  | "mild"
  | "standard"
  | "aggressive"
  | "lean"
  | "none";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

const CAL_DELTA: Record<GoalIntensity, number> = {
  mild: 250,
  standard: 500,
  aggressive: 750,
  lean: 250,
  none: 0,
};

export interface MacroInput {
  sex: Sex;
  age: number;
  height_inches: number;
  weight_lbs: number;
  activity_level: ActivityLevel;
  goal: GoalType;
  goal_intensity?: GoalIntensity; // defaults to "standard" for fat_loss/muscle_gain
  is_athlete?: boolean; // protein bump
}

export interface MacroResult {
  bmr: number;
  tdee: number;          // maintenance_calories
  maintenance_calories: number;
  calorie_target: number;
  protein_grams: number;
  carb_grams: number;
  fat_grams: number;
  goal: GoalType;
  goal_intensity: GoalIntensity;
  applied_minimums: string[];
}

// --- Normalizers --------------------------------------------------------------

export function normalizeSex(v: unknown): Sex {
  return String(v ?? "male").toLowerCase().startsWith("f") ? "female" : "male";
}

export function normalizeActivity(v: unknown): ActivityLevel {
  const s = String(v ?? "").toLowerCase().trim();
  if (s.includes("sedent")) return "sedentary";
  if (s.includes("very") || s.includes("heavy")) return "very_active";
  if (s.includes("athlet") || s.includes("extreme")) return "athlete";
  if (s.includes("light")) return "light";
  return "moderate";
}

export function normalizeGoal(v: unknown): GoalType {
  const g = String(v ?? "").toLowerCase();
  if (g.includes("recomp")) return "recomposition";
  if (g.includes("endur")) return "endurance";
  if (g.includes("lose") || g.includes("fat") || g.includes("cut")) return "fat_loss";
  if (g.includes("muscle") || g.includes("bulk") || g.includes("gain") || g.includes("mass")) return "muscle_gain";
  return "maintenance";
}

export function normalizeIntensity(v: unknown, goal: GoalType): GoalIntensity {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("mild") || s.includes("lean")) return goal === "muscle_gain" ? "lean" : "mild";
  if (s.includes("aggress")) return "aggressive";
  if (s.includes("standard") || s.includes("moderate")) return "standard";
  if (goal === "fat_loss" || goal === "muscle_gain") return "standard";
  return "none";
}

// --- Core math ----------------------------------------------------------------

export function calculateBMR(input: Pick<MacroInput, "sex" | "age" | "height_inches" | "weight_lbs">): number {
  const weightKg = input.weight_lbs * 0.453592;
  const heightCm = input.height_inches * 2.54;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * input.age;
  return Math.round(input.sex === "male" ? base + 5 : base - 161);
}

export function calculateMacros(raw: MacroInput): MacroResult {
  const sex = normalizeSex(raw.sex);
  const goal = normalizeGoal(raw.goal);
  const activity = raw.activity_level && ACTIVITY_MULTIPLIERS[raw.activity_level]
    ? raw.activity_level
    : normalizeActivity(raw.activity_level);
  const intensity = normalizeIntensity(raw.goal_intensity, goal);

  const bmr = calculateBMR({ sex, age: raw.age, height_inches: raw.height_inches, weight_lbs: raw.weight_lbs });
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);

  // Goal calories
  const delta = CAL_DELTA[intensity];
  let calorie_target = tdee;
  if (goal === "fat_loss") calorie_target = tdee - delta;
  else if (goal === "muscle_gain") calorie_target = tdee + delta;
  else if (goal === "recomposition") calorie_target = tdee - 100;
  // endurance & maintenance => tdee

  // Protein (g per lb)
  let proteinPerLb = 0.9;
  if (goal === "fat_loss") proteinPerLb = 1.0;
  else if (goal === "muscle_gain") proteinPerLb = 1.0;
  else if (goal === "recomposition") proteinPerLb = 1.1;
  else if (goal === "endurance") proteinPerLb = 0.8;
  if (raw.is_athlete) proteinPerLb = Math.max(proteinPerLb, 1.1);
  let protein_grams = Math.round(raw.weight_lbs * proteinPerLb);

  // Fat (g per lb)
  let fatPerLb = 0.35;
  if (goal === "fat_loss") fatPerLb = 0.30;
  else if (goal === "muscle_gain") fatPerLb = 0.40;
  else if (goal === "endurance") fatPerLb = 0.30;
  let fat_grams = Math.round(raw.weight_lbs * fatPerLb);

  // Apollo minimums (enforced BEFORE carbs so carbs absorb the remainder)
  const applied_minimums: string[] = [];
  const calMin = sex === "female" ? 1200 : 1500;
  if (calorie_target < calMin) {
    calorie_target = calMin;
    applied_minimums.push("calorie_min");
  }
  if (protein_grams < 120) {
    protein_grams = 120;
    applied_minimums.push("protein_min");
  }
  if (fat_grams < 40) {
    fat_grams = 40;
    applied_minimums.push("fat_min");
  }

  // Carbs = remainder
  const carbCalories = calorie_target - protein_grams * 4 - fat_grams * 9;
  let carb_grams = Math.max(0, Math.round(carbCalories / 4));

  // Endurance bias: ensure carbs aren't accidentally crushed under fat-min
  if (goal === "endurance" && carb_grams * 4 < calorie_target * 0.5) {
    // Bump carbs to ≥50% kcal by raising calorie_target if needed
    const target_carb_cal = Math.round(calorie_target * 0.5);
    carb_grams = Math.max(carb_grams, Math.round(target_carb_cal / 4));
  }

  return {
    bmr,
    tdee,
    maintenance_calories: tdee,
    calorie_target,
    protein_grams,
    carb_grams,
    fat_grams,
    goal,
    goal_intensity: intensity,
    applied_minimums,
  };
}

// --- DB convenience -----------------------------------------------------------
// Resolve inputs from user_fitness_profile (preferred) → client_questionnaires.
export async function loadMacroInputs(
  supabaseAdmin: any,
  userId: string,
): Promise<MacroInput | null> {
  const { data: p } = await supabaseAdmin
    .from("user_fitness_profile")
    .select(
      "sex, age, height_inches, weight_lbs, activity_level, primary_goal, training_experience"
    )
    .eq("user_id", userId)
    .maybeSingle();

  let row: any = p;
  if (!row?.weight_lbs || !row?.height_inches || !row?.age) {
    const { data: q } = await supabaseAdmin
      .from("client_questionnaires")
      .select("sex, age, height_inches, weight_lbs, activity_level, goal_next_4_weeks, fitness_experience")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!q) return null;
    row = {
      sex: q.sex,
      age: q.age,
      height_inches: q.height_inches,
      weight_lbs: q.weight_lbs,
      activity_level: q.activity_level,
      primary_goal: q.goal_next_4_weeks,
      training_experience: q.fitness_experience,
    };
  }

  if (!row?.weight_lbs || !row?.height_inches || !row?.age) return null;

  return {
    sex: normalizeSex(row.sex),
    age: Number(row.age),
    height_inches: Number(row.height_inches),
    weight_lbs: Number(row.weight_lbs),
    activity_level: normalizeActivity(row.activity_level),
    goal: normalizeGoal(row.primary_goal),
    is_athlete: String(row.training_experience ?? "").toLowerCase().includes("athlete"),
  };
}

// Compute + persist canonical macros to user_macro_targets AND mirror to
// user_fitness_profile so every consumer (Fuel, meal plan, grocery list,
// coaching dashboard) reads the same numbers.
export async function recalcAndPersistMacros(
  supabaseAdmin: any,
  userId: string,
  opts?: { source?: string; intensity?: GoalIntensity },
): Promise<MacroResult | null> {
  const input = await loadMacroInputs(supabaseAdmin, userId);
  if (!input) return null;
  if (opts?.intensity) input.goal_intensity = opts.intensity;

  const r = calculateMacros(input);

  await supabaseAdmin
    .from("user_macro_targets")
    .upsert(
      {
        user_id: userId,
        calorie_target: r.calorie_target,
        protein_grams: r.protein_grams,
        carb_grams: r.carb_grams,
        fat_grams: r.fat_grams,
        bmr: r.bmr,
        tdee: r.tdee,
        goal_type: r.goal,
        source: opts?.source ?? "auto",
      },
      { onConflict: "user_id" },
    );

  await supabaseAdmin
    .from("user_fitness_profile")
    .update({
      calorie_target: r.calorie_target,
      protein_target_g: r.protein_grams,
      carb_target_g: r.carb_grams,
      fat_target_g: r.fat_grams,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return r;
}
