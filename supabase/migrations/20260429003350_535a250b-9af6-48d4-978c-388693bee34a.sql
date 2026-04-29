ALTER TABLE public.nutrition_plans
  ADD COLUMN IF NOT EXISTS weekly_budget_cents integer;

COMMENT ON COLUMN public.nutrition_plans.weekly_budget_cents IS
  'Optional per-plan override of the user weekly food budget, stored in cents. NULL means inherit from user_food_budgets.weekly_budget, then client_questionnaires.weekly_food_budget.';