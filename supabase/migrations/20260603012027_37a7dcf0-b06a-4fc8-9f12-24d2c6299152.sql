
-- Add Stretch + Cardio to class_type whitelist (keep existing values)
ALTER TABLE public.admin_classes DROP CONSTRAINT IF EXISTS admin_classes_class_type_check;
ALTER TABLE public.admin_classes ADD CONSTRAINT admin_classes_class_type_check
  CHECK (class_type = ANY (ARRAY['strength','sculpt','stretch','cardio','hiit','cycling','recovery','beginner']));

-- Add direct long-form video fields so an uploaded horizontal class video can live on the class itself,
-- separate from stitched render_jobs output.
ALTER TABLE public.admin_classes
  ADD COLUMN IF NOT EXISTS mux_playback_id text,
  ADD COLUMN IF NOT EXISTS mux_asset_id text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS orientation text NOT NULL DEFAULT 'horizontal',
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'stitched';

ALTER TABLE public.admin_classes DROP CONSTRAINT IF EXISTS admin_classes_orientation_check;
ALTER TABLE public.admin_classes ADD CONSTRAINT admin_classes_orientation_check
  CHECK (orientation = ANY (ARRAY['horizontal','vertical']));

ALTER TABLE public.admin_classes DROP CONSTRAINT IF EXISTS admin_classes_source_type_check;
ALTER TABLE public.admin_classes ADD CONSTRAINT admin_classes_source_type_check
  CHECK (source_type = ANY (ARRAY['stitched','uploaded']));

CREATE INDEX IF NOT EXISTS idx_admin_classes_class_type ON public.admin_classes(class_type);
CREATE INDEX IF NOT EXISTS idx_admin_classes_status ON public.admin_classes(status);
