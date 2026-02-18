
ALTER TABLE public.client_questionnaires
  ADD COLUMN IF NOT EXISTS current_workout_days text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_other_activities boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS other_activities jsonb DEFAULT '[]'::jsonb;
