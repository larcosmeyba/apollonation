// Helpers around the master user_fitness_profile.
import type { FitnessProfile } from "@/hooks/useFitnessProfile";

// Core identity fields the user should never be re-asked for if already saved.
export const CORE_IDENTITY_FIELDS: (keyof FitnessProfile)[] = [
  "height_inches",
  "weight_lbs",
  "age",
  "sex",
  "primary_goal",
  "activity_level",
];

export function hasCoreIdentity(p: FitnessProfile | null): boolean {
  if (!p) return false;
  return CORE_IDENTITY_FIELDS.every((k) => {
    const v = (p as any)[k];
    return v !== null && v !== undefined && v !== "";
  });
}

// Fields the Fuel intake needs in addition to core identity.
export interface MissingNutrition {
  meals_per_day: boolean;
  dietary_preferences: boolean;
  allergies: boolean;
  disliked_foods: boolean;
  weekly_food_budget: boolean;
  macros: boolean;
}

export function getMissingNutritionFields(p: FitnessProfile | null): MissingNutrition {
  if (!p) {
    return {
      meals_per_day: true,
      dietary_preferences: true,
      allergies: true,
      disliked_foods: true,
      weekly_food_budget: true,
      macros: true,
    };
  }
  return {
    meals_per_day: p.meals_per_day == null,
    dietary_preferences: !p.dietary_preferences || p.dietary_preferences.length === 0,
    allergies: !p.allergies || p.allergies.length === 0,
    disliked_foods: !p.disliked_foods || p.disliked_foods.length === 0,
    weekly_food_budget: p.weekly_food_budget == null,
    macros:
      p.calorie_target == null ||
      p.protein_target_g == null ||
      p.carb_target_g == null ||
      p.fat_target_g == null,
  };
}

// Fields the coach intake needs in addition to core identity.
export interface MissingCoach {
  injuries: boolean;
  equipment_available: boolean;
  training_days_per_week: boolean;
}

export function getMissingCoachFields(p: FitnessProfile | null): MissingCoach {
  if (!p) {
    return { injuries: true, equipment_available: true, training_days_per_week: true };
  }
  return {
    injuries: p.injuries == null,
    equipment_available: !p.equipment_available || p.equipment_available.length === 0,
    training_days_per_week: p.training_days_per_week == null,
  };
}
