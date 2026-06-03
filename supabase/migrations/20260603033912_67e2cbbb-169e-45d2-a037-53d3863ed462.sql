DROP INDEX IF EXISTS public.idx_admin_exercises_mux_asset_unique;
DROP INDEX IF EXISTS public.idx_admin_classes_mux_asset_unique;

ALTER TABLE public.admin_exercises
  ADD CONSTRAINT admin_exercises_mux_asset_id_key UNIQUE (mux_asset_id);

ALTER TABLE public.admin_classes
  ADD CONSTRAINT admin_classes_mux_asset_id_key UNIQUE (mux_asset_id);