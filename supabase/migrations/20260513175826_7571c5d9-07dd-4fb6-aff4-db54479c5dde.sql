
-- Expand My Plan questionnaire
ALTER TABLE public.mw_questionnaire_responses
  ADD COLUMN IF NOT EXISTS main_goal text,
  ADD COLUMN IF NOT EXISTS focus_areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS improve_areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avoid_areas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS workout_environment text,
  ADD COLUMN IF NOT EXISTS gym_confidence text,
  ADD COLUMN IF NOT EXISTS workout_time text,
  ADD COLUMN IF NOT EXISTS workout_styles text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cardio_preference text,
  ADD COLUMN IF NOT EXISTS favorite_exercises text,
  ADD COLUMN IF NOT EXISTS disliked_exercises text,
  ADD COLUMN IF NOT EXISTS current_routine text,
  ADD COLUMN IF NOT EXISTS injuries text,
  ADD COLUMN IF NOT EXISTS pain_areas text,
  ADD COLUMN IF NOT EXISTS mobility_limitations text,
  ADD COLUMN IF NOT EXISTS recovery_level text,
  ADD COLUMN IF NOT EXISTS stress_level text,
  ADD COLUMN IF NOT EXISTS sleep_quality text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Allow admins to view My Plan questionnaires
DROP POLICY IF EXISTS "Admins view all mw questionnaires" ON public.mw_questionnaire_responses;
CREATE POLICY "Admins view all mw questionnaires"
  ON public.mw_questionnaire_responses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow assigned coaches to view their clients' My Plan questionnaires
DROP POLICY IF EXISTS "Coaches view assigned client mw questionnaires" ON public.mw_questionnaire_responses;
CREATE POLICY "Coaches view assigned client mw questionnaires"
  ON public.mw_questionnaire_responses FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.coach_user_id = auth.uid()
      AND cca.client_user_id = mw_questionnaire_responses.user_id
  ));

-- Coach intake responses
CREATE TABLE IF NOT EXISTS public.coach_intake_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  biggest_goal text,
  why_coaching text,
  past_blockers text,
  accountability_style text,
  current_struggles text[] NOT NULL DEFAULT '{}',
  commitment_level smallint,
  success_vision text,
  additional_notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_intake_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own coach intake"
  ON public.coach_intake_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own coach intake"
  ON public.coach_intake_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own coach intake"
  ON public.coach_intake_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage coach intake"
  ON public.coach_intake_responses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Coaches view assigned client coach intake"
  ON public.coach_intake_responses FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.coach_user_id = auth.uid()
      AND cca.client_user_id = coach_intake_responses.user_id
  ));

CREATE TRIGGER coach_intake_updated
  BEFORE UPDATE ON public.coach_intake_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
