
CREATE TABLE public.user_fitness_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  height_inches int,
  weight_lbs numeric,
  age int,
  sex text CHECK (sex IN ('male','female')),
  goal_weight_lbs numeric,
  primary_goal text,
  activity_level text,
  training_experience text,
  training_days_per_week int,
  preferred_training_days text[] DEFAULT '{}'::text[],
  workout_duration_minutes int,
  equipment_available text[] DEFAULT '{}'::text[],
  workout_environment text,
  dietary_preferences text[] DEFAULT '{}'::text[],
  allergies text[] DEFAULT '{}'::text[],
  disliked_foods text[] DEFAULT '{}'::text[],
  meals_per_day int,
  nutrition_goal text,
  calorie_target int,
  protein_target_g int,
  carb_target_g int,
  fat_target_g int,
  weekly_food_budget numeric,
  grocery_store text,
  injuries text,
  coach_notes text,
  progress_photo_urls text[] DEFAULT '{}'::text[],
  onboarding_completed boolean NOT NULL DEFAULT false,
  nutrition_completed boolean NOT NULL DEFAULT false,
  coaching_intake_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_fitness_profile TO authenticated;
GRANT ALL ON public.user_fitness_profile TO service_role;
ALTER TABLE public.user_fitness_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own fitness profile"
  ON public.user_fitness_profile FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all fitness profiles"
  ON public.user_fitness_profile FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER user_fitness_profile_updated_at
  BEFORE UPDATE ON public.user_fitness_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Sync trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.sync_fitness_profile_to_legacy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cq_updated int := 0;
BEGIN
  -- Try update existing active client_questionnaires row
  UPDATE public.client_questionnaires SET
    sex = COALESCE(NEW.sex, sex),
    age = COALESCE(NEW.age, age),
    height_inches = COALESCE(NEW.height_inches, height_inches),
    weight_lbs = COALESCE(NEW.weight_lbs, weight_lbs),
    activity_level = COALESCE(NEW.activity_level, activity_level),
    workout_days_per_week = COALESCE(NEW.training_days_per_week, workout_days_per_week),
    goal_next_4_weeks = COALESCE(NEW.primary_goal, goal_next_4_weeks),
    weekly_food_budget = COALESCE(NEW.weekly_food_budget, weekly_food_budget),
    grocery_store = COALESCE(NEW.grocery_store, grocery_store),
    dietary_restrictions = COALESCE(NEW.dietary_preferences, dietary_restrictions),
    disliked_foods = COALESCE(NEW.disliked_foods, disliked_foods),
    goal_weight = COALESCE(NEW.goal_weight_lbs, goal_weight),
    preferred_training_days = COALESCE(NEW.preferred_training_days, preferred_training_days),
    workout_duration_minutes = COALESCE(NEW.workout_duration_minutes, workout_duration_minutes),
    fitness_experience = COALESCE(NEW.training_experience, fitness_experience),
    injuries_limitations = COALESCE(NEW.injuries, injuries_limitations),
    workout_environment = COALESCE(NEW.workout_environment, workout_environment),
    updated_at = now()
  WHERE user_id = NEW.user_id AND is_active = true;
  GET DIAGNOSTICS cq_updated = ROW_COUNT;

  -- Insert if no active row exists and we have required NOT NULL fields
  IF cq_updated = 0
     AND NEW.height_inches IS NOT NULL AND NEW.weight_lbs IS NOT NULL
     AND NEW.age IS NOT NULL AND NEW.sex IS NOT NULL THEN
    INSERT INTO public.client_questionnaires (
      user_id, sex, age, height_inches, weight_lbs,
      activity_level, workout_days_per_week, training_methods,
      goal_next_4_weeks, weekly_food_budget, grocery_store,
      dietary_restrictions, disliked_foods, goal_weight,
      preferred_training_days, workout_duration_minutes,
      fitness_experience, injuries_limitations, workout_environment,
      is_active, cycle_number
    ) VALUES (
      NEW.user_id, NEW.sex, NEW.age, NEW.height_inches, NEW.weight_lbs,
      COALESCE(NEW.activity_level,'moderate'),
      COALESCE(NEW.training_days_per_week,3),
      '{}'::text[],
      NEW.primary_goal, NEW.weekly_food_budget, NEW.grocery_store,
      COALESCE(NEW.dietary_preferences,'{}'::text[]),
      COALESCE(NEW.disliked_foods,'{}'::text[]),
      NEW.goal_weight_lbs,
      COALESCE(NEW.preferred_training_days,'{}'::text[]),
      NEW.workout_duration_minutes,
      NEW.training_experience, NEW.injuries, NEW.workout_environment,
      true, 1
    );
  END IF;

  -- Mirror into client_nutrition_questionnaires (this table has UNIQUE(user_id))
  INSERT INTO public.client_nutrition_questionnaires (
    user_id, current_weight_lbs, goal_weight_lbs, height_inches, age, gender,
    activity_level, main_goal, training_days_per_week,
    meals_per_day, dietary_restrictions, allergies, disliked_foods,
    grocery_budget_weekly, preferred_grocery_stores,
    calorie_target, protein_target_g, carb_target_g, fat_target_g,
    is_active
  ) VALUES (
    NEW.user_id, NEW.weight_lbs, NEW.goal_weight_lbs, NEW.height_inches, NEW.age, NEW.sex,
    NEW.activity_level, NEW.primary_goal, NEW.training_days_per_week,
    NEW.meals_per_day,
    COALESCE(NEW.dietary_preferences,'{}'::text[]),
    COALESCE(NEW.allergies,'{}'::text[]),
    array_to_string(COALESCE(NEW.disliked_foods,'{}'::text[]), ', '),
    NEW.weekly_food_budget,
    CASE WHEN NEW.grocery_store IS NULL THEN '{}'::text[] ELSE ARRAY[NEW.grocery_store] END,
    NEW.calorie_target, NEW.protein_target_g, NEW.carb_target_g, NEW.fat_target_g,
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_weight_lbs = COALESCE(EXCLUDED.current_weight_lbs, client_nutrition_questionnaires.current_weight_lbs),
    goal_weight_lbs = COALESCE(EXCLUDED.goal_weight_lbs, client_nutrition_questionnaires.goal_weight_lbs),
    height_inches = COALESCE(EXCLUDED.height_inches, client_nutrition_questionnaires.height_inches),
    age = COALESCE(EXCLUDED.age, client_nutrition_questionnaires.age),
    gender = COALESCE(EXCLUDED.gender, client_nutrition_questionnaires.gender),
    activity_level = COALESCE(EXCLUDED.activity_level, client_nutrition_questionnaires.activity_level),
    main_goal = COALESCE(EXCLUDED.main_goal, client_nutrition_questionnaires.main_goal),
    training_days_per_week = COALESCE(EXCLUDED.training_days_per_week, client_nutrition_questionnaires.training_days_per_week),
    meals_per_day = COALESCE(EXCLUDED.meals_per_day, client_nutrition_questionnaires.meals_per_day),
    dietary_restrictions = COALESCE(EXCLUDED.dietary_restrictions, client_nutrition_questionnaires.dietary_restrictions),
    allergies = COALESCE(EXCLUDED.allergies, client_nutrition_questionnaires.allergies),
    disliked_foods = COALESCE(NULLIF(EXCLUDED.disliked_foods,''), client_nutrition_questionnaires.disliked_foods),
    grocery_budget_weekly = COALESCE(EXCLUDED.grocery_budget_weekly, client_nutrition_questionnaires.grocery_budget_weekly),
    preferred_grocery_stores = COALESCE(EXCLUDED.preferred_grocery_stores, client_nutrition_questionnaires.preferred_grocery_stores),
    calorie_target = COALESCE(EXCLUDED.calorie_target, client_nutrition_questionnaires.calorie_target),
    protein_target_g = COALESCE(EXCLUDED.protein_target_g, client_nutrition_questionnaires.protein_target_g),
    carb_target_g = COALESCE(EXCLUDED.carb_target_g, client_nutrition_questionnaires.carb_target_g),
    fat_target_g = COALESCE(EXCLUDED.fat_target_g, client_nutrition_questionnaires.fat_target_g),
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER user_fitness_profile_sync
  AFTER INSERT OR UPDATE ON public.user_fitness_profile
  FOR EACH ROW EXECUTE FUNCTION public.sync_fitness_profile_to_legacy();

-- =========================================================
-- Auto-create profile row on new user signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_fitness_profile()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_fitness_profile (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_fitness_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_fitness_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_fitness_profile();

-- =========================================================
-- Backfill (disable trigger during backfill to avoid mirror loop overwriting legacy)
-- =========================================================
ALTER TABLE public.user_fitness_profile DISABLE TRIGGER user_fitness_profile_sync;

INSERT INTO public.user_fitness_profile (
  user_id, height_inches, weight_lbs, age, sex, goal_weight_lbs,
  primary_goal, activity_level, training_experience,
  training_days_per_week, preferred_training_days, workout_duration_minutes,
  workout_environment, dietary_preferences, disliked_foods,
  weekly_food_budget, grocery_store, injuries,
  onboarding_completed
)
SELECT DISTINCT ON (cq.user_id)
  cq.user_id, cq.height_inches, cq.weight_lbs, cq.age, cq.sex, cq.goal_weight,
  cq.goal_next_4_weeks, cq.activity_level, cq.fitness_experience,
  cq.workout_days_per_week, cq.preferred_training_days, cq.workout_duration_minutes,
  cq.workout_environment, cq.dietary_restrictions, cq.disliked_foods,
  cq.weekly_food_budget, cq.grocery_store, cq.injuries_limitations,
  true
FROM public.client_questionnaires cq
WHERE cq.is_active = true
ORDER BY cq.user_id, cq.created_at DESC
ON CONFLICT (user_id) DO UPDATE SET
  height_inches = COALESCE(EXCLUDED.height_inches, user_fitness_profile.height_inches),
  weight_lbs = COALESCE(EXCLUDED.weight_lbs, user_fitness_profile.weight_lbs),
  age = COALESCE(EXCLUDED.age, user_fitness_profile.age),
  sex = COALESCE(EXCLUDED.sex, user_fitness_profile.sex),
  goal_weight_lbs = COALESCE(EXCLUDED.goal_weight_lbs, user_fitness_profile.goal_weight_lbs),
  primary_goal = COALESCE(EXCLUDED.primary_goal, user_fitness_profile.primary_goal),
  activity_level = COALESCE(EXCLUDED.activity_level, user_fitness_profile.activity_level),
  training_experience = COALESCE(EXCLUDED.training_experience, user_fitness_profile.training_experience),
  training_days_per_week = COALESCE(EXCLUDED.training_days_per_week, user_fitness_profile.training_days_per_week),
  onboarding_completed = true,
  updated_at = now();

INSERT INTO public.user_fitness_profile (
  user_id, weight_lbs, goal_weight_lbs, height_inches, age, sex,
  activity_level, primary_goal, training_days_per_week,
  meals_per_day, dietary_preferences, allergies, disliked_foods,
  weekly_food_budget, grocery_store,
  calorie_target, protein_target_g, carb_target_g, fat_target_g,
  nutrition_completed
)
SELECT
  nq.user_id, nq.current_weight_lbs, nq.goal_weight_lbs, nq.height_inches, nq.age, nq.gender,
  nq.activity_level, nq.main_goal, nq.training_days_per_week,
  nq.meals_per_day, nq.dietary_restrictions, nq.allergies,
  CASE WHEN nq.disliked_foods IS NOT NULL AND length(nq.disliked_foods) > 0
       THEN string_to_array(nq.disliked_foods, ',') ELSE '{}'::text[] END,
  nq.grocery_budget_weekly,
  (CASE WHEN cardinality(nq.preferred_grocery_stores) > 0
        THEN nq.preferred_grocery_stores[1] ELSE NULL END),
  nq.calorie_target, nq.protein_target_g, nq.carb_target_g, nq.fat_target_g,
  (nq.calorie_target IS NOT NULL AND nq.protein_target_g IS NOT NULL AND nq.completed_at IS NOT NULL)
FROM public.client_nutrition_questionnaires nq
ON CONFLICT (user_id) DO UPDATE SET
  weight_lbs = COALESCE(EXCLUDED.weight_lbs, user_fitness_profile.weight_lbs),
  goal_weight_lbs = COALESCE(EXCLUDED.goal_weight_lbs, user_fitness_profile.goal_weight_lbs),
  height_inches = COALESCE(EXCLUDED.height_inches, user_fitness_profile.height_inches),
  age = COALESCE(EXCLUDED.age, user_fitness_profile.age),
  sex = COALESCE(EXCLUDED.sex, user_fitness_profile.sex),
  activity_level = COALESCE(EXCLUDED.activity_level, user_fitness_profile.activity_level),
  primary_goal = COALESCE(EXCLUDED.primary_goal, user_fitness_profile.primary_goal),
  training_days_per_week = COALESCE(EXCLUDED.training_days_per_week, user_fitness_profile.training_days_per_week),
  meals_per_day = COALESCE(EXCLUDED.meals_per_day, user_fitness_profile.meals_per_day),
  dietary_preferences = CASE WHEN cardinality(EXCLUDED.dietary_preferences) > 0 THEN EXCLUDED.dietary_preferences ELSE user_fitness_profile.dietary_preferences END,
  allergies = CASE WHEN cardinality(EXCLUDED.allergies) > 0 THEN EXCLUDED.allergies ELSE user_fitness_profile.allergies END,
  disliked_foods = CASE WHEN cardinality(EXCLUDED.disliked_foods) > 0 THEN EXCLUDED.disliked_foods ELSE user_fitness_profile.disliked_foods END,
  weekly_food_budget = COALESCE(EXCLUDED.weekly_food_budget, user_fitness_profile.weekly_food_budget),
  grocery_store = COALESCE(EXCLUDED.grocery_store, user_fitness_profile.grocery_store),
  calorie_target = COALESCE(EXCLUDED.calorie_target, user_fitness_profile.calorie_target),
  protein_target_g = COALESCE(EXCLUDED.protein_target_g, user_fitness_profile.protein_target_g),
  carb_target_g = COALESCE(EXCLUDED.carb_target_g, user_fitness_profile.carb_target_g),
  fat_target_g = COALESCE(EXCLUDED.fat_target_g, user_fitness_profile.fat_target_g),
  nutrition_completed = (user_fitness_profile.nutrition_completed OR EXCLUDED.nutrition_completed),
  updated_at = now();

UPDATE public.user_fitness_profile ufp
SET coaching_intake_completed = true,
    coach_notes = COALESCE(ufp.coach_notes, cir.additional_notes)
FROM public.coach_intake_responses cir
WHERE cir.user_id = ufp.user_id AND cir.completed_at IS NOT NULL;

ALTER TABLE public.user_fitness_profile ENABLE TRIGGER user_fitness_profile_sync;
