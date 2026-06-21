ALTER TABLE public.admin_classes
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS mux_status text;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS mux_asset_id text,
  ADD COLUMN IF NOT EXISTS mux_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_classes_mux_status_check'
  ) THEN
    ALTER TABLE public.admin_classes
      ADD CONSTRAINT admin_classes_mux_status_check
      CHECK (mux_status IS NULL OR mux_status IN ('processing', 'ready', 'errored'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workouts_mux_status_check'
  ) THEN
    ALTER TABLE public.workouts
      ADD CONSTRAINT workouts_mux_status_check
      CHECK (mux_status IS NULL OR mux_status IN ('processing', 'ready', 'errored'));
  END IF;
END $$;

UPDATE public.admin_classes
SET video_url = 'https://stream.mux.com/' || mux_playback_id || '.m3u8',
    mux_status = COALESCE(mux_status, 'ready')
WHERE mux_playback_id IS NOT NULL
  AND (video_url IS NULL OR mux_status IS NULL);

UPDATE public.workouts
SET video_url = 'https://stream.mux.com/' || mux_playback_id || '.m3u8',
    mux_status = COALESCE(mux_status, 'ready')
WHERE mux_playback_id IS NOT NULL
  AND (video_url IS NULL OR mux_status IS NULL);

CREATE OR REPLACE FUNCTION public.sync_admin_class_to_workouts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.workouts WHERE admin_class_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.status = 'published' THEN
    INSERT INTO public.workouts (
      admin_class_id, title, description, duration_minutes, category,
      thumbnail_url, mux_playback_id, video_url, mux_asset_id, mux_status, is_published
    )
    VALUES (
      NEW.id,
      NEW.title,
      NEW.description,
      COALESCE(NEW.duration_minutes, 20),
      COALESCE(NEW.class_type, 'strength'),
      NEW.thumbnail_url,
      NEW.mux_playback_id,
      NEW.video_url,
      NEW.mux_asset_id,
      NEW.mux_status,
      true
    )
    ON CONFLICT (admin_class_id) WHERE admin_class_id IS NOT NULL
    DO UPDATE SET
      title            = EXCLUDED.title,
      description      = EXCLUDED.description,
      duration_minutes = EXCLUDED.duration_minutes,
      category         = EXCLUDED.category,
      thumbnail_url    = EXCLUDED.thumbnail_url,
      mux_playback_id  = EXCLUDED.mux_playback_id,
      video_url        = EXCLUDED.video_url,
      mux_asset_id     = EXCLUDED.mux_asset_id,
      mux_status       = EXCLUDED.mux_status,
      is_published     = true;
  ELSE
    DELETE FROM public.workouts WHERE admin_class_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_admin_class_to_workouts ON public.admin_classes;
CREATE TRIGGER trg_sync_admin_class_to_workouts
AFTER INSERT OR UPDATE OR DELETE ON public.admin_classes
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_class_to_workouts();