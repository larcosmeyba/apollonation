
-- Add meal_id to nutrition_plan_meals so v2 meals can reference meal_library.meal_code
ALTER TABLE public.nutrition_plan_meals
  ADD COLUMN IF NOT EXISTS meal_id text;

CREATE INDEX IF NOT EXISTS idx_nutrition_plan_meals_meal_id
  ON public.nutrition_plan_meals(plan_id, meal_id);

-- Add suggested_load to training_plan_exercises so v2 progression is persisted
ALTER TABLE public.training_plan_exercises
  ADD COLUMN IF NOT EXISTS suggested_load text;
