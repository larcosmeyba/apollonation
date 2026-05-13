
ALTER TABLE public.client_questionnaires
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS fitness_experience text,
  ADD COLUMN IF NOT EXISTS injuries_limitations text,
  ADD COLUMN IF NOT EXISTS current_medications text,
  ADD COLUMN IF NOT EXISTS preferred_training_style text,
  ADD COLUMN IF NOT EXISTS workout_environment text,
  ADD COLUMN IF NOT EXISTS additional_notes text;
