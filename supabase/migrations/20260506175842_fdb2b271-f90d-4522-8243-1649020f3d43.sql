
-- Exercises library
CREATE TABLE public.admin_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mux_playback_id text,
  mux_asset_id text,
  thumbnail_url text,
  orientation text NOT NULL DEFAULT 'horizontal' CHECK (orientation IN ('horizontal','vertical')),
  muscle_group text,
  equipment text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  movement_type text,
  alternative_exercise_id uuid REFERENCES public.admin_exercises(id) ON DELETE SET NULL,
  coaching_notes text,
  weight_recommendation text,
  tempo_recommendation text,
  loop_in_seconds numeric DEFAULT 0,
  loop_out_seconds numeric,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_exercises_orientation ON public.admin_exercises(orientation);
CREATE INDEX idx_admin_exercises_muscle ON public.admin_exercises(muscle_group);
ALTER TABLE public.admin_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage exercises" ON public.admin_exercises FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated view exercises" ON public.admin_exercises FOR SELECT TO authenticated USING (true);
CREATE TRIGGER admin_exercises_updated BEFORE UPDATE ON public.admin_exercises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Classes
CREATE TABLE public.admin_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 20,
  class_type text NOT NULL DEFAULT 'strength' CHECK (class_type IN ('strength','sculpt','hiit','cycling','recovery','beginner')),
  equipment text[] NOT NULL DEFAULT '{}',
  difficulty text NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  cover_image_url text,
  intro_enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage classes" ON public.admin_classes FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated view published classes" ON public.admin_classes FOR SELECT TO authenticated USING (status = 'published');
CREATE TRIGGER admin_classes_updated BEFORE UPDATE ON public.admin_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Blocks
CREATE TABLE public.admin_class_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.admin_classes(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'exercise' CHECK (kind IN ('exercise','rest','transition')),
  exercise_id uuid REFERENCES public.admin_exercises(id) ON DELETE SET NULL,
  alt_exercise_id uuid REFERENCES public.admin_exercises(id) ON DELETE SET NULL,
  work_seconds integer NOT NULL DEFAULT 40,
  rest_seconds integer NOT NULL DEFAULT 20,
  sets integer NOT NULL DEFAULT 1,
  set_rest_seconds integer NOT NULL DEFAULT 30,
  cue_overrides text,
  weight_prompt text,
  tempo_prompt text,
  drop_set boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_class_blocks_class ON public.admin_class_blocks(class_id, sort_order);
ALTER TABLE public.admin_class_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage blocks" ON public.admin_class_blocks FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated view blocks of published classes" ON public.admin_class_blocks FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.admin_classes c WHERE c.id = class_id AND c.status='published')
);

-- Templates
CREATE TABLE public.admin_class_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 20,
  class_type text NOT NULL DEFAULT 'strength',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_class_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage templates" ON public.admin_class_templates FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
