ALTER TABLE public.admin_class_blocks
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'workout_a';

ALTER TABLE public.admin_class_blocks
  DROP CONSTRAINT IF EXISTS admin_class_blocks_section_check;

ALTER TABLE public.admin_class_blocks
  ADD CONSTRAINT admin_class_blocks_section_check
  CHECK (section IN ('warmup','workout_a','workout_b','workout_c','cooldown'));

CREATE INDEX IF NOT EXISTS admin_class_blocks_class_section_idx
  ON public.admin_class_blocks (class_id, section, sort_order);