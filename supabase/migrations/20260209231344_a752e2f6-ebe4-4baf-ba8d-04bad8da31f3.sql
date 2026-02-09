
-- Add waiver_accepted column to client_questionnaires
ALTER TABLE public.client_questionnaires ADD COLUMN waiver_accepted boolean NOT NULL DEFAULT false;
ALTER TABLE public.client_questionnaires ADD COLUMN waiver_accepted_at timestamptz;

-- Create client_training_plans table for auto-generated workout programs
CREATE TABLE public.client_training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  questionnaire_id uuid REFERENCES public.client_questionnaires(id) ON DELETE CASCADE,
  title text NOT NULL,
  cycle_number int NOT NULL DEFAULT 1,
  duration_weeks int NOT NULL DEFAULT 4,
  workout_days_per_week int NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training plans"
  ON public.client_training_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all training plans"
  ON public.client_training_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create training_plan_days table for individual workout days
CREATE TABLE public.training_plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.client_training_plans(id) ON DELETE CASCADE,
  day_number int NOT NULL,
  day_label text,
  focus text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training plan days"
  ON public.training_plan_days FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_training_plans p WHERE p.id = plan_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all training plan days"
  ON public.training_plan_days FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create training_plan_exercises for exercises within each day
CREATE TABLE public.training_plan_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES public.training_plan_days(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  muscle_group text,
  sets int,
  reps text,
  rest_seconds int,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_plan_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training plan exercises"
  ON public.training_plan_exercises FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.training_plan_days d
    JOIN public.client_training_plans p ON p.id = d.plan_id
    WHERE d.id = day_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own training plan exercises"
  ON public.training_plan_exercises FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.training_plan_days d
    JOIN public.client_training_plans p ON p.id = d.plan_id
    WHERE d.id = day_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all training plan exercises"
  ON public.training_plan_exercises FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_training_plans_updated_at
  BEFORE UPDATE ON public.client_training_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
