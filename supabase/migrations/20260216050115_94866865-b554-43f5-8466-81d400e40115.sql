
-- Add preferred training days and workout duration to client_questionnaires
ALTER TABLE public.client_questionnaires
  ADD COLUMN preferred_training_days text[] DEFAULT '{}',
  ADD COLUMN workout_duration_minutes integer DEFAULT 60;
