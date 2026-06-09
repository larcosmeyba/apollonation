
-- 1. Extend admin_exercises with coaching framework tags
ALTER TABLE public.admin_exercises
  ADD COLUMN IF NOT EXISTS exercise_code text,
  ADD COLUMN IF NOT EXISTS location_type text,
  ADD COLUMN IF NOT EXISTS movement_pattern text,
  ADD COLUMN IF NOT EXISTS primary_muscle text,
  ADD COLUMN IF NOT EXISTS secondary_muscle text,
  ADD COLUMN IF NOT EXISTS goal_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_warmup boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_cooldown boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_recovery boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suggested_reps text,
  ADD COLUMN IF NOT EXISTS suggested_time text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE UNIQUE INDEX IF NOT EXISTS admin_exercises_exercise_code_key
  ON public.admin_exercises (exercise_code) WHERE exercise_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_exercises_location ON public.admin_exercises(location_type);
CREATE INDEX IF NOT EXISTS idx_admin_exercises_pattern ON public.admin_exercises(movement_pattern);
CREATE INDEX IF NOT EXISTS idx_admin_exercises_is_recovery ON public.admin_exercises(is_recovery);

-- 2. program_blueprints (the 12 master programs)
CREATE TABLE IF NOT EXISTS public.program_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  location text NOT NULL,
  primary_goal text NOT NULL,
  experience text,
  weekly_split text,
  frequency text,
  session_length text,
  allowed_equipment text[] NOT NULL DEFAULT '{}',
  difficulty_cap text,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.program_blueprints TO authenticated;
GRANT ALL ON public.program_blueprints TO service_role;
ALTER TABLE public.program_blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read program_blueprints" ON public.program_blueprints
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage program_blueprints" ON public.program_blueprints
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER set_program_blueprints_updated BEFORE UPDATE ON public.program_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. program_categories
CREATE TABLE IF NOT EXISTS public.program_engine_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE,
  location text,
  primary_goal text,
  allowed_filters text,
  excluded text,
  typical_equipment text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.program_engine_categories TO authenticated;
GRANT ALL ON public.program_engine_categories TO service_role;
ALTER TABLE public.program_engine_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read program_engine_categories" ON public.program_engine_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage program_engine_categories" ON public.program_engine_categories
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER set_program_engine_categories_updated BEFORE UPDATE ON public.program_engine_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. workout_template_rules (duration-based session shape)
CREATE TABLE IF NOT EXISTS public.workout_template_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duration_minutes int NOT NULL UNIQUE,
  warmup text,
  main_exercises text,
  rounds_or_sets text,
  work_rest_or_reps text,
  rest_between_sets text,
  cooldown text,
  recommended_structure text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workout_template_rules TO authenticated;
GRANT ALL ON public.workout_template_rules TO service_role;
ALTER TABLE public.workout_template_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read workout_template_rules" ON public.workout_template_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage workout_template_rules" ON public.workout_template_rules
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER set_workout_template_rules_updated BEFORE UPDATE ON public.workout_template_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. weekly_split_templates + weekly_split_days
CREATE TABLE IF NOT EXISTS public.weekly_split_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  days_per_week int,
  description text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.weekly_split_templates TO authenticated;
GRANT ALL ON public.weekly_split_templates TO service_role;
ALTER TABLE public.weekly_split_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read weekly_split_templates" ON public.weekly_split_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage weekly_split_templates" ON public.weekly_split_templates
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER set_weekly_split_templates_updated BEFORE UPDATE ON public.weekly_split_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.weekly_split_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.weekly_split_templates(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  day_of_week int NOT NULL, -- 1=Mon..7=Sun
  focus text NOT NULL,
  is_deload boolean NOT NULL DEFAULT false,
  is_rest boolean NOT NULL DEFAULT false,
  is_recovery boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(template_id, week_number, day_of_week)
);
GRANT SELECT ON public.weekly_split_days TO authenticated;
GRANT ALL ON public.weekly_split_days TO service_role;
ALTER TABLE public.weekly_split_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read weekly_split_days" ON public.weekly_split_days
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage weekly_split_days" ON public.weekly_split_days
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 6. session_blueprints + session_blueprint_slots
CREATE TABLE IF NOT EXISTS public.session_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug text NOT NULL,
  day_type text NOT NULL,
  location text,
  frequency text,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_slug, day_type)
);
GRANT SELECT ON public.session_blueprints TO authenticated;
GRANT ALL ON public.session_blueprints TO service_role;
ALTER TABLE public.session_blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read session_blueprints" ON public.session_blueprints
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage session_blueprints" ON public.session_blueprints
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER set_session_blueprints_updated BEFORE UPDATE ON public.session_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.session_blueprint_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES public.session_blueprints(id) ON DELETE CASCADE,
  slot_order int NOT NULL,
  block text NOT NULL,            -- Warmup, Primary, Accessory, Core, Cooldown, Finisher
  role text,                       -- Main squat, Posterior iso, etc.
  movement_pattern text,           -- query filter
  body_part_filter text,
  equipment_filter text,
  sets text,
  reps_or_time text,
  rest text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blueprint_id, slot_order)
);
GRANT SELECT ON public.session_blueprint_slots TO authenticated;
GRANT ALL ON public.session_blueprint_slots TO service_role;
ALTER TABLE public.session_blueprint_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read session_blueprint_slots" ON public.session_blueprint_slots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage session_blueprint_slots" ON public.session_blueprint_slots
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 7. progression_models, deload_rules, required_movement_patterns, substitution_rules
CREATE TABLE IF NOT EXISTS public.progression_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug text NOT NULL,
  week_number int,
  label text,
  prescription text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.progression_models TO authenticated;
GRANT ALL ON public.progression_models TO service_role;
ALTER TABLE public.progression_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read progression_models" ON public.progression_models
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage progression_models" ON public.progression_models
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.deload_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug text NOT NULL,
  rule text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.deload_rules TO authenticated;
GRANT ALL ON public.deload_rules TO service_role;
ALTER TABLE public.deload_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read deload_rules" ON public.deload_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage deload_rules" ON public.deload_rules
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.required_movement_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug text NOT NULL,
  pattern text NOT NULL,
  required_per_week int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.required_movement_patterns TO authenticated;
GRANT ALL ON public.required_movement_patterns TO service_role;
ALTER TABLE public.required_movement_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read required_movement_patterns" ON public.required_movement_patterns
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage required_movement_patterns" ON public.required_movement_patterns
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.substitution_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id text,
  rule text NOT NULL,
  applies_to text,
  logic text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.substitution_rules TO authenticated;
GRANT ALL ON public.substitution_rules TO service_role;
ALTER TABLE public.substitution_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read substitution_rules" ON public.substitution_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage substitution_rules" ON public.substitution_rules
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 8. exercise_selection_rules (generator constraints)
CREATE TABLE IF NOT EXISTS public.exercise_selection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id text NOT NULL UNIQUE,
  rule text NOT NULL,
  applies_to text,
  logic text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercise_selection_rules TO authenticated;
GRANT ALL ON public.exercise_selection_rules TO service_role;
ALTER TABLE public.exercise_selection_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated read exercise_selection_rules" ON public.exercise_selection_rules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage exercise_selection_rules" ON public.exercise_selection_rules
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
