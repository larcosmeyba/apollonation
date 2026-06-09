// Apollo Reborn — library-driven meal plan generator (v2).
// Implements the selection pseudocode, fallback ladder, and N1–N17 rules
// from Apollo_Meal_Generator_Spec.md. Pure functions: no I/O beyond a
// supplied Supabase client. Both generate-meal-plan and
// weekly-meal-plan-refresh use this so the legacy free-form AI path can
// stay behind the NUTRITION_GENERATOR_V2 flag as a rollback.

export type MealRow = {
  meal_code: string; meal_name: string; meal_type: string;
  calories: number; protein_grams: number; carbs_grams: number; fat_grams: number;
  fiber_grams: number | null; ingredients: string; instructions: string;
  prep_time: string; cook_time: string; serving_size: number; difficulty: string;
  goal_tags: string[]; dietary_tags: string[]; allergy_tags: string[];
  budget_level: string; is_high_protein: boolean; is_vegan: boolean;
  is_vegetarian: boolean; is_kosher_friendly: boolean; is_gluten_free: boolean;
  is_dairy_free: boolean; is_pescatarian: boolean;
};

export type DietPref = "Standard" | "Vegan" | "Vegetarian" | "Pescatarian"
  | "Kosher Friendly" | "Gluten Free" | "Dairy Free";

export type Profile = {
  goal: string;
  daily_calories: number;
  protein_target: number;
  carb_target: number;
  fat_target: number;
  dietary_preference: DietPref;       // single primary diet
  allergies: string[];                 // ['Dairy','Soy','Nuts','Eggs','Gluten','Shellfish','Fish']
  foods_disliked: string[];
  meals_per_day: number;               // 3..5
  cooking_skill: "Easy" | "Medium" | "Hard";
  prep_time_pref: "Quick" | "Standard" | "Any";
  household_size: number;
  budget_help_needed: boolean;
  weekly_budget?: number | null;
};

export type GeneratedMeal = MealRow & {
  servings: number;
  scaled_calories: number;
  scaled_protein: number;
  scaled_carbs: number;
  scaled_fat: number;
  slot: string;
};

export type GeneratedDay = {
  day_number: number;
  meals: GeneratedMeal[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  needs_review: boolean;
  gap_reason: string | null;
};

export type GeneratedWeek = {
  days: GeneratedDay[];
  needs_review: boolean;
  gap_reasons: string[];
};

// ------------------- Helpers -------------------
const dietOk = (m: MealRow, p: DietPref) => {
  switch (p) {
    case "Vegan": return m.is_vegan;
    case "Vegetarian": return m.is_vegetarian;
    case "Pescatarian": return m.is_pescatarian;
    case "Kosher Friendly": return m.is_kosher_friendly;
    case "Gluten Free": return m.is_gluten_free;
    case "Dairy Free": return m.is_dairy_free;
    default: return true; // Standard
  }
};

const norm = (s: string) => s.trim().toLowerCase();

const allergensOverlap = (m: MealRow, allergies: string[]) => {
  if (!allergies?.length) return false;
  const tags = (m.allergy_tags || []).map(norm).filter((t) => t && t !== "none");
  const blocked = allergies.map(norm);
  return tags.some((t) => blocked.some((b) => t === b || t.includes(b) || b.includes(t)));
};

const dislikesContained = (m: MealRow, disliked: string[]) => {
  if (!disliked?.length) return false;
  const text = `${m.meal_name} ${m.ingredients}`.toLowerCase();
  return disliked.some((d) => d && text.includes(norm(d)));
};

const difficultyRank: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
const skillCap = (skill: Profile["cooking_skill"]) => difficultyRank[skill];

const timeCap = (pref: Profile["prep_time_pref"]) =>
  pref === "Quick" ? 15 : pref === "Standard" ? 40 : Infinity;

const minutes = (s: string) => parseInt((s || "0").replace(/[^0-9]/g, "") || "0", 10);
const totalTime = (m: MealRow) => minutes(m.prep_time) + minutes(m.cook_time);

// Per-meal calorie split by slot count (N2 distribution).
const calorieSplits: Record<number, Record<string, number>> = {
  3: { Breakfast: 0.30, Lunch: 0.35, Dinner: 0.35 },
  4: { Breakfast: 0.25, Lunch: 0.30, Dinner: 0.30, Snack: 0.15 },
  5: { Breakfast: 0.22, Lunch: 0.28, Dinner: 0.28, Snack: 0.11, "Snack 2": 0.11 },
};

const slotsFor = (n: number): string[] =>
  n <= 3 ? ["Breakfast", "Lunch", "Dinner"]
    : n === 4 ? ["Breakfast", "Lunch", "Dinner", "Snack"]
      : ["Breakfast", "Lunch", "Dinner", "Snack", "Snack 2"];

const slotType = (slot: string) => (slot.startsWith("Snack") ? "Snack" : slot);

const roundHalf = (n: number) => Math.round(n * 2) / 2;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const scale = (m: MealRow, slot: string, target: number): GeneratedMeal => {
  const servings = clamp(roundHalf(target / m.calories), 0.5, 2.0);
  return {
    ...m, slot, servings,
    scaled_calories: Math.round(m.calories * servings),
    scaled_protein: Math.round(m.protein_grams * servings),
    scaled_carbs: Math.round(m.carbs_grams * servings),
    scaled_fat: Math.round(m.fat_grams * servings),
  };
};

// ------------------- Core selection -------------------
function buildPool(
  meals: MealRow[],
  p: Profile,
  opts: { skillCap?: number; timeCap?: number } = {},
): MealRow[] {
  const sCap = opts.skillCap ?? skillCap(p.cooking_skill);
  const tCap = opts.timeCap ?? timeCap(p.prep_time_pref);
  return meals.filter((m) =>
    dietOk(m, p.dietary_preference)            // N5–N11 HARD
    && !allergensOverlap(m, p.allergies)       // N4 HARD
    && !dislikesContained(m, p.foods_disliked) // N15 HARD
    && (difficultyRank[m.difficulty] ?? 1) <= sCap
    && totalTime(m) <= tCap
  );
}

function pickForSlot(
  candidates: MealRow[],
  targetCal: number,
  recentCodes: Set<string>,
): MealRow | null {
  let pool = candidates.filter((m) => !recentCodes.has(m.meal_code));
  if (pool.length === 0) pool = candidates; // N16 relax within-day
  if (pool.length === 0) return null;
  // N1 protein-first: max protein/cal, tie-break closest calories.
  pool.sort((a, b) => {
    const pa = a.protein_grams / Math.max(1, a.calories);
    const pb = b.protein_grams / Math.max(1, b.calories);
    if (pb !== pa) return pb - pa;
    return Math.abs(a.calories - targetCal) - Math.abs(b.calories - targetCal);
  });
  return pool[0];
}

function sumDay(meals: GeneratedMeal[]) {
  return meals.reduce((acc, m) => ({
    calories: acc.calories + m.scaled_calories,
    protein: acc.protein + m.scaled_protein,
    carbs: acc.carbs + m.scaled_carbs,
    fat: acc.fat + m.scaled_fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

// One day, with fallback ladder.
export function generateDailyPlan(
  meals: MealRow[],
  p: Profile,
  dayNumber: number,
  history: Set<string>,
): GeneratedDay {
  const slots = slotsFor(p.meals_per_day);
  const split = calorieSplits[Math.min(5, Math.max(3, p.meals_per_day))];
  const targets = Object.fromEntries(slots.map((s) => [s, p.daily_calories * (split[s] ?? 0.2)]));

  const fallbackSteps: Array<{ skill?: number; time?: number; widenCalTol?: boolean; allowWithinDayRepeat?: boolean; label: string }> = [
    { label: "baseline" },
    { time: Infinity, label: "relaxed prep time" },
    { time: Infinity, skill: 3, label: "raised cooking skill" },
    { time: Infinity, skill: 3, allowWithinDayRepeat: true, label: "allow within-day repeat" },
    { time: Infinity, skill: 3, allowWithinDayRepeat: true, widenCalTol: true, label: "±8% cal tolerance" },
  ];

  let chosen: GeneratedMeal[] = [];
  let gap: string | null = null;
  let needsReview = false;

  for (const step of fallbackSteps) {
    const pool = buildPool(meals, p, { skillCap: step.skill, timeCap: step.time });
    chosen = [];
    const usedThisDay = new Set<string>();
    let missing = false;
    for (const slot of slots) {
      const t = slotType(slot);
      const cands = pool.filter((m) => m.meal_type === t);
      if (cands.length === 0) { missing = true; break; }
      const pick = pickForSlot(cands, targets[slot], step.allowWithinDayRepeat ? history : new Set([...history, ...usedThisDay]));
      if (!pick) { missing = true; break; }
      usedThisDay.add(pick.meal_code);
      chosen.push(scale(pick, slot, targets[slot]));
    }
    if (!missing) {
      const totals = sumDay(chosen);
      const tol = step.widenCalTol ? 0.08 : 0.05;
      const calOk = Math.abs(totals.calories - p.daily_calories) <= tol * p.daily_calories;
      const protOk = totals.protein >= p.protein_target - 10;
      if (calOk && protOk) {
        needsReview = step.widenCalTol === true;
        gap = step.label === "baseline" ? null : `fallback: ${step.label}`;
        // Add history
        chosen.forEach((m) => history.add(m.meal_code));
        return { day_number: dayNumber, meals: chosen, totals, needs_review: needsReview, gap_reason: gap };
      }
      // Continue to next fallback step to try to satisfy SOFT validation.
      needsReview = true;
      gap = `soft miss (${step.label}): cal=${totals.calories}/${p.daily_calories}, protein=${totals.protein}/${p.protein_target}`;
    }
  }

  // Insufficient library coverage — return closest partial.
  const totals = sumDay(chosen);
  chosen.forEach((m) => history.add(m.meal_code));
  return {
    day_number: dayNumber,
    meals: chosen,
    totals,
    needs_review: true,
    gap_reason: gap || "insufficient library coverage",
  };
}

export function generateWeek(meals: MealRow[], p: Profile): GeneratedWeek {
  const history = new Set<string>();
  const days: GeneratedDay[] = [];
  for (let d = 1; d <= 7; d++) {
    // Sliding window: forget meals older than 2 days
    if (d > 2) {
      const old = days[d - 3];
      old?.meals.forEach((m) => history.delete(m.meal_code));
    }
    days.push(generateDailyPlan(meals, p, d, history));
  }
  const gap_reasons = Array.from(new Set(days.map((d) => d.gap_reason).filter(Boolean) as string[]));
  return { days, needs_review: days.some((d) => d.needs_review), gap_reasons };
}

// Convert profile-ish row fragments from the various questionnaire tables
// into a canonical Profile. Tolerates nulls.
export function buildProfile(args: {
  goal?: string | null;
  daily_calories: number;
  protein_target: number;
  carb_target: number;
  fat_target: number;
  dietary_preferences?: string[] | null;
  allergies?: string[] | null;
  foods_disliked?: string[] | null;
  meals_per_day?: number | null;
  cooking_skill?: string | null;
  prep_time_pref?: string | null;
  household_size?: number | null;
  budget_help_needed?: boolean | null;
  weekly_budget?: number | null;
}): Profile {
  // Map first dietary preference into our enum; default Standard.
  const rawDiet = (args.dietary_preferences ?? [])[0] || "Standard";
  const dietMap: Record<string, DietPref> = {
    "vegan": "Vegan", "vegetarian": "Vegetarian", "pescatarian": "Pescatarian",
    "kosher": "Kosher Friendly", "kosher friendly": "Kosher Friendly",
    "gluten-free": "Gluten Free", "gluten free": "Gluten Free",
    "dairy-free": "Dairy Free", "dairy free": "Dairy Free", "standard": "Standard",
  };
  const diet = dietMap[norm(rawDiet)] ?? "Standard";

  // Allergens come tag-cased ("Dairy","Soy","Nuts") in meal_library.
  const allergyMap: Record<string, string> = {
    "dairy": "Dairy", "dairy-free": "Dairy", "lactose": "Dairy",
    "gluten": "Gluten", "gluten-free": "Gluten", "wheat": "Gluten",
    "nuts": "Nuts", "nut": "Nuts", "nut-free": "Nuts", "peanut": "Nuts", "tree nut": "Nuts",
    "soy": "Soy", "soy-free": "Soy",
    "eggs": "Eggs", "egg": "Eggs", "egg-free": "Eggs",
    "shellfish": "Shellfish", "shellfish-free": "Shellfish",
    "fish": "Fish", "fish-free": "Fish",
  };
  const allergies = (args.allergies ?? [])
    .map((a) => allergyMap[norm(a)] ?? a)
    .filter(Boolean);

  const skill = (args.cooking_skill ?? "Medium") as Profile["cooking_skill"];
  const prep = (args.prep_time_pref ?? "Standard") as Profile["prep_time_pref"];

  return {
    goal: args.goal || "Maintenance",
    daily_calories: args.daily_calories,
    protein_target: args.protein_target,
    carb_target: args.carb_target,
    fat_target: args.fat_target,
    dietary_preference: diet,
    allergies,
    foods_disliked: args.foods_disliked ?? [],
    meals_per_day: clamp(args.meals_per_day ?? 4, 3, 5),
    cooking_skill: ["Easy", "Medium", "Hard"].includes(skill) ? skill : "Medium",
    prep_time_pref: ["Quick", "Standard", "Any"].includes(prep) ? prep : "Standard",
    household_size: args.household_size ?? 1,
    budget_help_needed: !!args.budget_help_needed,
    weekly_budget: args.weekly_budget ?? null,
  };
}
