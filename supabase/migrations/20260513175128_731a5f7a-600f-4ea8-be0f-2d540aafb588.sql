
CREATE TABLE IF NOT EXISTS public.client_nutrition_questionnaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,

  -- Body + goal
  current_weight_lbs numeric,
  goal_weight_lbs numeric,
  height_inches integer,
  age integer,
  gender text,
  activity_level text,
  daily_movement_level text,
  main_goal text,

  -- Fitness
  training_days_per_week integer,
  workout_intensity text,
  workout_style text,
  cardio_frequency text,
  daily_steps integer,

  -- Nutrition preferences
  meals_per_day integer,
  eating_schedule text,
  breakfast_style text,
  lunch_style text,
  dinner_style text,
  carb_preference text,
  high_protein boolean DEFAULT false,
  preferred_proteins text[] DEFAULT '{}'::text[],
  favorite_foods text,
  disliked_foods text,
  foods_to_include text,

  -- Restrictions + allergies
  dietary_restrictions text[] DEFAULT '{}'::text[],
  allergies text[] DEFAULT '{}'::text[],
  allergies_other text,

  -- Lifestyle + budget
  grocery_budget_weekly numeric,
  meal_prep_preference text,
  cooking_skill text,
  cooking_time text,
  eats_out_often text,
  recipe_complexity text,
  preferred_grocery_stores text[] DEFAULT '{}'::text[],

  -- Current habits
  current_calories integer,
  current_protein_grams integer,
  water_intake_oz integer,
  biggest_struggles text[] DEFAULT '{}'::text[],

  -- Computed targets
  calorie_target integer,
  protein_target_g integer,
  carb_target_g integer,
  fat_target_g integer,
  water_target_oz integer,

  is_active boolean NOT NULL DEFAULT true,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS client_nutrition_questionnaires_user_id_key
  ON public.client_nutrition_questionnaires(user_id);

ALTER TABLE public.client_nutrition_questionnaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nutrition questionnaire"
  ON public.client_nutrition_questionnaires FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nutrition questionnaire"
  ON public.client_nutrition_questionnaires FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition questionnaire"
  ON public.client_nutrition_questionnaires FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all nutrition questionnaires"
  ON public.client_nutrition_questionnaires FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches view assigned client nutrition questionnaires"
  ON public.client_nutrition_questionnaires FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.coach_user_id = auth.uid()
      AND cca.client_user_id = client_nutrition_questionnaires.user_id
  ));

CREATE TRIGGER update_client_nutrition_questionnaires_updated_at
  BEFORE UPDATE ON public.client_nutrition_questionnaires
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
