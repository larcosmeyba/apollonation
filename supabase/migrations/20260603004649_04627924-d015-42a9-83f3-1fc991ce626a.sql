
ALTER TABLE public.admin_exercises
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS duration_seconds numeric;

ALTER TABLE public.admin_exercises
  DROP CONSTRAINT IF EXISTS admin_exercises_category_check;

ALTER TABLE public.admin_exercises
  ADD CONSTRAINT admin_exercises_category_check
  CHECK (category IS NULL OR category = ANY (ARRAY[
    'strength','sculpt','stretch','cardio','hiit','recovery','beginner'
  ]));

CREATE INDEX IF NOT EXISTS idx_admin_exercises_category
  ON public.admin_exercises(category);
