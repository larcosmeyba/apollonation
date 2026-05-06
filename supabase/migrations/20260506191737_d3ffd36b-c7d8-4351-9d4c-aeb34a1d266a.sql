-- ============================================================
-- "My Workouts" module — Step 1: data model + seed
-- All tables prefixed mw_ to avoid collisions with admin_*.
-- ============================================================

-- 1. Exercise library (shared, read-only for users) ----------
CREATE TABLE public.mw_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  video_url text,
  primary_muscle text NOT NULL,
  secondary_muscles text[] DEFAULT '{}',
  equipment_required text[] DEFAULT '{}',
  difficulty smallint NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mw_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active exercises"
  ON public.mw_exercises FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage exercises"
  ON public.mw_exercises FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER mw_exercises_updated
  BEFORE UPDATE ON public.mw_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Questionnaire responses ---------------------------------
CREATE TABLE public.mw_questionnaire_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  goals text[] NOT NULL DEFAULT '{}',
  weight_value numeric,
  weight_unit text CHECK (weight_unit IN ('lb','kg')),
  body_fat_percent numeric,
  target_date date,
  experience_level smallint CHECK (experience_level BETWEEN 1 AND 5),
  training_location text CHECK (training_location IN ('home','gym','both')),
  equipment text[] DEFAULT '{}',
  training_days text[] DEFAULT '{}',
  coach_intensity text NOT NULL DEFAULT 'more' CHECK (coach_intensity IN ('more','fewer','silent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE public.mw_questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own questionnaire"
  ON public.mw_questionnaire_responses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own questionnaire"
  ON public.mw_questionnaire_responses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own questionnaire"
  ON public.mw_questionnaire_responses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER mw_questionnaire_updated
  BEFORE UPDATE ON public.mw_questionnaire_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Workout plans -------------------------------------------
CREATE TABLE public.mw_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  split_type text,                 -- e.g. "Push/Pull/Legs"
  rationale text,                  -- "why this fits you" coaching note
  start_date date NOT NULL DEFAULT current_date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mw_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own plans"
  ON public.mw_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own plans"
  ON public.mw_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own plans"
  ON public.mw_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own plans"
  ON public.mw_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER mw_plans_updated
  BEFORE UPDATE ON public.mw_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mw_plans_user_active ON public.mw_plans(user_id, is_active);

-- 4. Plan days (one row per scheduled day) -------------------
CREATE TABLE public.mw_plan_days (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.mw_plans(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sun
  label text NOT NULL,             -- e.g. "Push Day", "Rest", "Cardio"
  is_rest boolean NOT NULL DEFAULT false,
  estimated_minutes int,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mw_plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own plan days"
  ON public.mw_plan_days FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mw_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));
CREATE POLICY "Users write own plan days"
  ON public.mw_plan_days FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mw_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mw_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()));

CREATE INDEX idx_mw_plan_days_plan ON public.mw_plan_days(plan_id);

-- 5. Plan exercises ------------------------------------------
CREATE TABLE public.mw_plan_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_day_id uuid NOT NULL REFERENCES public.mw_plan_days(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.mw_exercises(id) ON DELETE RESTRICT,
  target_sets int NOT NULL DEFAULT 3,
  target_reps int NOT NULL DEFAULT 10,
  rest_seconds int NOT NULL DEFAULT 60,
  sort_order int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mw_plan_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own plan exercises"
  ON public.mw_plan_exercises FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mw_plan_days d JOIN public.mw_plans p ON p.id = d.plan_id
    WHERE d.id = plan_day_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "Users write own plan exercises"
  ON public.mw_plan_exercises FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mw_plan_days d JOIN public.mw_plans p ON p.id = d.plan_id
    WHERE d.id = plan_day_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mw_plan_days d JOIN public.mw_plans p ON p.id = d.plan_id
    WHERE d.id = plan_day_id AND p.user_id = auth.uid()
  ));

CREATE INDEX idx_mw_plan_exercises_day ON public.mw_plan_exercises(plan_day_id);

-- 6. Set logs -------------------------------------------------
CREATE TABLE public.mw_set_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_exercise_id uuid REFERENCES public.mw_plan_exercises(id) ON DELETE SET NULL,
  exercise_id uuid NOT NULL REFERENCES public.mw_exercises(id) ON DELETE RESTRICT,
  session_id uuid,                 -- groups all sets in one workout session
  set_number int NOT NULL,
  reps int NOT NULL,
  weight numeric,
  weight_unit text CHECK (weight_unit IN ('lb','kg')),
  difficulty smallint CHECK (difficulty BETWEEN 1 AND 10),
  performed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mw_set_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own set logs"
  ON public.mw_set_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own set logs"
  ON public.mw_set_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own set logs"
  ON public.mw_set_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own set logs"
  ON public.mw_set_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_mw_set_logs_user_exercise ON public.mw_set_logs(user_id, exercise_id, performed_at DESC);
CREATE INDEX idx_mw_set_logs_session ON public.mw_set_logs(session_id);

-- 7. Trial status --------------------------------------------
CREATE TABLE public.mw_trial_status (
  user_id uuid NOT NULL PRIMARY KEY,
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '2 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mw_trial_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own trial"
  ON public.mw_trial_status FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own trial"
  ON public.mw_trial_status FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Seed: 8 placeholder exercises (replaceable real schema)
-- ============================================================
INSERT INTO public.mw_exercises (name, primary_muscle, secondary_muscles, equipment_required, difficulty, instructions) VALUES
  ('Barbell Back Squat', 'quads', ARRAY['glutes','hamstrings','core'], ARRAY['barbells','full_gym'], 4, 'Brace core, descend until thighs parallel, drive through midfoot.'),
  ('Conventional Deadlift', 'hamstrings', ARRAY['glutes','back','core'], ARRAY['barbells','full_gym'], 5, 'Hinge at hips, neutral spine, push the floor away.'),
  ('Dumbbell Bench Press', 'chest', ARRAY['triceps','shoulders'], ARRAY['dumbbells','full_gym'], 2, 'Lower DBs to mid-chest, press up and slightly together.'),
  ('Pull-Up', 'back', ARRAY['biceps','core'], ARRAY['bodyweight','full_gym'], 4, 'Hang at full stretch, pull chest to bar, control descent.'),
  ('Goblet Squat', 'quads', ARRAY['glutes','core'], ARRAY['dumbbells','bodyweight'], 1, 'Hold DB at chest, sit between heels, stand tall.'),
  ('Push-Up', 'chest', ARRAY['triceps','core'], ARRAY['bodyweight'], 1, 'Plank position, lower chest to floor, press up keeping body straight.'),
  ('Banded Glute Bridge', 'glutes', ARRAY['hamstrings'], ARRAY['bands','bodyweight'], 1, 'Band above knees, drive hips up, squeeze glutes at top.'),
  ('Dumbbell Row', 'back', ARRAY['biceps'], ARRAY['dumbbells'], 2, 'Hinge forward, pull DB to hip, control the eccentric.');
