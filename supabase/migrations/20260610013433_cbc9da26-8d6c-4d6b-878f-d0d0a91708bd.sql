
ALTER TABLE public.client_training_plans
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gap_reason text,
  ADD COLUMN IF NOT EXISTS generator_version text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS program_slug text;

ALTER TABLE public.training_plan_exercises
  ADD COLUMN IF NOT EXISTS exercise_id uuid REFERENCES public.admin_exercises(id),
  ADD COLUMN IF NOT EXISTS mux_playback_id text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS block text;
