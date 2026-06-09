
-- =========================================================
-- Apollo Reborn — Meal Plan Backend (workbook source of truth)
-- =========================================================

-- 1) Master meal library
CREATE TABLE public.meal_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_code text UNIQUE NOT NULL,                    -- e.g. BR-001
  meal_name text NOT NULL,
  meal_type text NOT NULL,                           -- Breakfast | Lunch | Dinner | Snack
  calories int NOT NULL,
  protein_grams int NOT NULL,
  carbs_grams int NOT NULL,
  fat_grams int NOT NULL,
  fiber_grams int,
  ingredients text,
  instructions text,
  prep_time text,
  cook_time text,
  serving_size numeric DEFAULT 1,
  difficulty text,                                   -- Easy | Medium | Hard
  goal_tags text[] NOT NULL DEFAULT '{}',            -- Fat Loss, Maintenance, Muscle Gain, High Protein
  dietary_tags text[] NOT NULL DEFAULT '{}',
  allergy_tags text[] NOT NULL DEFAULT '{}',         -- Dairy, Eggs, Gluten, Nuts, Fish, Shellfish, Soy
  budget_level text,                                 -- Low | Medium | High
  is_high_protein boolean DEFAULT false,
  is_vegan boolean DEFAULT false,
  is_vegetarian boolean DEFAULT false,
  is_kosher_friendly boolean DEFAULT false,
  is_gluten_free boolean DEFAULT false,
  is_dairy_free boolean DEFAULT false,
  is_pescatarian boolean DEFAULT false,
  is_active boolean DEFAULT true,
  source text DEFAULT 'workbook',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meal_library TO authenticated;
GRANT ALL ON public.meal_library TO service_role;
ALTER TABLE public.meal_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read meal library"
  ON public.meal_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage meal library"
  ON public.meal_library FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_meal_library_type ON public.meal_library(meal_type) WHERE is_active;
CREATE INDEX idx_meal_library_goals ON public.meal_library USING gin(goal_tags);
CREATE INDEX idx_meal_library_allergens ON public.meal_library USING gin(allergy_tags);

CREATE TRIGGER trg_meal_library_updated
  BEFORE UPDATE ON public.meal_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2) Calorie & macro tiers
CREATE TABLE public.meal_calorie_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calories int NOT NULL,
  goal text NOT NULL,                                -- Fat Loss | Maintenance | Muscle Gain | High Protein
  protein_grams int NOT NULL,
  carbs_grams int NOT NULL,
  fat_grams int NOT NULL,
  breakfast_calories int NOT NULL,
  lunch_calories int NOT NULL,
  dinner_calories int NOT NULL,
  snack_calories int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(calories, goal)
);

GRANT SELECT ON public.meal_calorie_tiers TO authenticated;
GRANT ALL ON public.meal_calorie_tiers TO service_role;
ALTER TABLE public.meal_calorie_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read tiers"
  ON public.meal_calorie_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage tiers"
  ON public.meal_calorie_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));


-- 3) Meal selection rules (reference for generator + admin visibility)
CREATE TABLE public.meal_selection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code text UNIQUE NOT NULL,
  rule_name text NOT NULL,
  logic text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meal_selection_rules TO authenticated;
GRANT ALL ON public.meal_selection_rules TO service_role;
ALTER TABLE public.meal_selection_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read meal rules"
  ON public.meal_selection_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage meal rules"
  ON public.meal_selection_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));


-- 4) Weekly plan structure (per goal)
CREATE TABLE public.weekly_meal_plan_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal text UNIQUE NOT NULL,
  rotation text NOT NULL,
  protein_distribution text,
  grocery_grouping text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.weekly_meal_plan_structure TO authenticated;
GRANT ALL ON public.weekly_meal_plan_structure TO service_role;
ALTER TABLE public.weekly_meal_plan_structure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read weekly structure"
  ON public.weekly_meal_plan_structure FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage weekly structure"
  ON public.weekly_meal_plan_structure FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));


-- 5) Assignment examples (goal × calories × diet → template)
CREATE TABLE public.meal_plan_assignment_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal text NOT NULL,
  calories int NOT NULL,
  dietary_preference text NOT NULL,
  assigned_template text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meal_plan_assignment_examples TO authenticated;
GRANT ALL ON public.meal_plan_assignment_examples TO service_role;
ALTER TABLE public.meal_plan_assignment_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read assignment examples"
  ON public.meal_plan_assignment_examples FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage assignment examples"
  ON public.meal_plan_assignment_examples FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));


-- 6) Sample template outputs from the workbook
CREATE TABLE public.meal_plan_template_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code text UNIQUE NOT NULL,                -- e.g. MPT-001
  goal text NOT NULL,
  calorie_tier int NOT NULL,
  protein_target int,
  carb_target int,
  fat_target int,
  breakfast_meal_code text,
  lunch_meal_code text,
  dinner_meal_code text,
  snack_meal_code text,
  total_calories int,
  total_protein int,
  total_carbs int,
  total_fat int,
  dietary_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meal_plan_template_examples TO authenticated;
GRANT ALL ON public.meal_plan_template_examples TO service_role;
ALTER TABLE public.meal_plan_template_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read template examples"
  ON public.meal_plan_template_examples FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage template examples"
  ON public.meal_plan_template_examples FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
