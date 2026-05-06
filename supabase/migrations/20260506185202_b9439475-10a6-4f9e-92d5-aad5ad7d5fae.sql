ALTER TABLE public.admin_exercises
  ADD COLUMN IF NOT EXISTS source_video_url text,
  ADD COLUMN IF NOT EXISTS source_storage_path text;