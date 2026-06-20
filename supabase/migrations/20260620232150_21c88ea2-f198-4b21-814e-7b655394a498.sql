ALTER TABLE public.admin_class_blocks
  ADD COLUMN IF NOT EXISTS target_reps_min INTEGER,
  ADD COLUMN IF NOT EXISTS target_reps_max INTEGER,
  ADD COLUMN IF NOT EXISTS progression_cue TEXT;