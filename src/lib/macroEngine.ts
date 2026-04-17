// Mifflin-St Jeor BMR + TDEE + macro split.
// Inputs in imperial; we convert internally.

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "heavy" | "athlete";
export type GoalType = "fat_loss" | "muscle_gain" | "maintenance" | "recomposition";

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
  athlete: 1.9,
};

const GOAL_ADJUST: Record<GoalType, number> = {
  fat_loss: -0.20,
  muscle_gain: 0.10,
  maintenance: 0,
  recomposition: -0.05,
};

// Protein g per lb bodyweight
const PROTEIN_FACTOR: Record<GoalType, number> = {
  fat_loss: 1.0,
  muscle_gain: 1.0,
  maintenance: 0.8,
  recomposition: 1.0,
};

export interface MacroInput {
  sex: Sex;
  age: number;
  height_inches: number;
  weight_lbs: number;
  activity_level: ActivityLevel;
  goal: GoalType;
}

export interface MacroResult {
  bmr: number;
  tdee: number;
  calorie_target: number;
  protein_grams: number;
  carb_grams: number;
  fat_grams: number;
}

export function calculateMacros(input: MacroInput): MacroResult {
  const weightKg = input.weight_lbs * 0.453592;
  const heightCm = input.height_inches * 2.54;

  const base =
    10 * weightKg + 6.25 * heightCm - 5 * input.age + (input.sex === "male" ? 5 : -161);
  const bmr = Math.round(base);
  const tdee = Math.round(bmr * ACTIVITY_MULT[input.activity_level]);
  const calorie_target = Math.round(tdee * (1 + GOAL_ADJUST[input.goal]));

  const protein_grams = Math.round(input.weight_lbs * PROTEIN_FACTOR[input.goal]);
  // Fat = 25% of calories
  const fat_grams = Math.round((calorie_target * 0.25) / 9);
  // Remaining calories → carbs
  const remainingCals = calorie_target - protein_grams * 4 - fat_grams * 9;
  const carb_grams = Math.max(0, Math.round(remainingCals / 4));

  return { bmr, tdee, calorie_target, protein_grams, carb_grams, fat_grams };
}

// Map questionnaire goal text → goal type
export function inferGoal(goalText?: string | null): GoalType {
  if (!goalText) return "maintenance";
  const g = goalText.toLowerCase();
  if (g.includes("lose") || g.includes("fat") || g.includes("cut")) return "fat_loss";
  if (g.includes("muscle") || g.includes("bulk") || g.includes("gain")) return "muscle_gain";
  if (g.includes("recomp")) return "recomposition";
  return "maintenance";
}

// Map activity_level string from questionnaire → ActivityLevel
export function normalizeActivity(level?: string | null): ActivityLevel {
  if (!level) return "moderate";
  const l = level.toLowerCase();
  if (l.includes("sed")) return "sedentary";
  if (l.includes("light")) return "light";
  if (l.includes("heavy") || l.includes("very")) return "heavy";
  if (l.includes("athlete") || l.includes("extreme")) return "athlete";
  return "moderate";
}
