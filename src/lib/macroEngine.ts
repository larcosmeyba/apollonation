// Mifflin-St Jeor BMR + TDEE + Apollo macro split.
// MIRROR of supabase/functions/_shared/macro-engine.ts — keep in sync.
// This is the client-side calculator used for instant previews; the backend
// engine is the source of truth and persists to user_macro_targets.

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active" | "athlete";
export type GoalType = "fat_loss" | "maintenance" | "muscle_gain" | "recomposition" | "endurance";
export type GoalIntensity = "mild" | "standard" | "aggressive" | "lean" | "none";

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  athlete: 1.9,
};

const CAL_DELTA: Record<GoalIntensity, number> = {
  mild: 250, standard: 500, aggressive: 750, lean: 250, none: 0,
};

export interface MacroInput {
  sex: Sex;
  age: number;
  height_inches: number;
  weight_lbs: number;
  activity_level: ActivityLevel;
  goal: GoalType;
  goal_intensity?: GoalIntensity;
  is_athlete?: boolean;
}

export interface MacroResult {
  bmr: number;
  tdee: number;
  maintenance_calories: number;
  calorie_target: number;
  protein_grams: number;
  carb_grams: number;
  fat_grams: number;
}

export function calculateMacros(input: MacroInput): MacroResult {
  const sex = input.sex === "female" ? "female" : "male";
  const weightKg = input.weight_lbs * 0.453592;
  const heightCm = input.height_inches * 2.54;
  const bmr = Math.round(
    10 * weightKg + 6.25 * heightCm - 5 * input.age + (sex === "male" ? 5 : -161),
  );
  const tdee = Math.round(bmr * ACTIVITY_MULT[input.activity_level]);

  const goal = input.goal;
  const intensity: GoalIntensity = input.goal_intensity
    ?? (goal === "fat_loss" || goal === "muscle_gain" ? "standard" : "none");

  let calorie_target = tdee;
  if (goal === "fat_loss") calorie_target = tdee - CAL_DELTA[intensity];
  else if (goal === "muscle_gain") calorie_target = tdee + CAL_DELTA[intensity];
  else if (goal === "recomposition") calorie_target = tdee - 100;

  let proteinPerLb = 0.9;
  if (goal === "fat_loss" || goal === "muscle_gain") proteinPerLb = 1.0;
  else if (goal === "recomposition") proteinPerLb = 1.1;
  else if (goal === "endurance") proteinPerLb = 0.8;
  if (input.is_athlete) proteinPerLb = Math.max(proteinPerLb, 1.1);
  let protein_grams = Math.round(input.weight_lbs * proteinPerLb);

  let fatPerLb = 0.35;
  if (goal === "fat_loss" || goal === "endurance") fatPerLb = 0.30;
  else if (goal === "muscle_gain") fatPerLb = 0.40;
  let fat_grams = Math.round(input.weight_lbs * fatPerLb);

  // Apollo minimums
  const calMin = sex === "female" ? 1200 : 1500;
  if (calorie_target < calMin) calorie_target = calMin;
  if (protein_grams < 120) protein_grams = 120;
  if (fat_grams < 40) fat_grams = 40;

  const carbCalories = calorie_target - protein_grams * 4 - fat_grams * 9;
  const carb_grams = Math.max(0, Math.round(carbCalories / 4));

  return {
    bmr, tdee, maintenance_calories: tdee,
    calorie_target, protein_grams, carb_grams, fat_grams,
  };
}

export function inferGoal(goalText?: string | null): GoalType {
  if (!goalText) return "maintenance";
  const g = goalText.toLowerCase();
  if (g.includes("recomp")) return "recomposition";
  if (g.includes("endur")) return "endurance";
  if (g.includes("lose") || g.includes("fat") || g.includes("cut")) return "fat_loss";
  if (g.includes("muscle") || g.includes("bulk") || g.includes("gain")) return "muscle_gain";
  return "maintenance";
}

export function normalizeActivity(level?: string | null): ActivityLevel {
  if (!level) return "moderate";
  const l = level.toLowerCase();
  if (l.includes("sed")) return "sedentary";
  if (l.includes("light")) return "light";
  if (l.includes("very") || l.includes("heavy")) return "very_active";
  if (l.includes("athlete") || l.includes("extreme")) return "athlete";
  return "moderate";
}
