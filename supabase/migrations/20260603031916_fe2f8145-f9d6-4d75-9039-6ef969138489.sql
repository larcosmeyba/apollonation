
ALTER TABLE public.admin_exercises
  ADD COLUMN IF NOT EXISTS body_part text;

ALTER TABLE public.admin_classes
  ADD COLUMN IF NOT EXISTS body_part text,
  ADD COLUMN IF NOT EXISTS duration_seconds numeric;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_exercises_mux_asset_unique
  ON public.admin_exercises(mux_asset_id) WHERE mux_asset_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_classes_mux_asset_unique
  ON public.admin_classes(mux_asset_id) WHERE mux_asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_exercises_body_part ON public.admin_exercises(body_part);
CREATE INDEX IF NOT EXISTS idx_admin_classes_body_part ON public.admin_classes(body_part);
