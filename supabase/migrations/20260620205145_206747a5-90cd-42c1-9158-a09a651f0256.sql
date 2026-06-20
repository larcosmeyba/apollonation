
-- 1) Video focal point for reframing exercise videos in the player
ALTER TABLE public.admin_exercises
  ADD COLUMN IF NOT EXISTS video_object_position text NOT NULL DEFAULT 'center center';

-- 2) Link workouts to source admin_classes so published classes appear on the client
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS admin_class_id uuid REFERENCES public.admin_classes(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS workouts_admin_class_id_key
  ON public.workouts (admin_class_id)
  WHERE admin_class_id IS NOT NULL;

-- 3) Sync trigger: keep workouts in lock-step with admin_classes lifecycle
CREATE OR REPLACE FUNCTION public.sync_admin_class_to_workouts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.workouts WHERE admin_class_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.status = 'published' THEN
    INSERT INTO public.workouts (
      admin_class_id, title, description, duration_minutes, category,
      thumbnail_url, mux_playback_id, is_published
    )
    VALUES (
      NEW.id,
      NEW.title,
      NEW.description,
      COALESCE(NEW.duration_minutes, 20),
      COALESCE(NEW.class_type, 'strength'),
      NEW.thumbnail_url,
      NEW.mux_playback_id,
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
      is_published     = true;
  ELSE
    DELETE FROM public.workouts WHERE admin_class_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_class_to_workouts ON public.admin_classes;
CREATE TRIGGER trg_sync_admin_class_to_workouts
AFTER INSERT OR UPDATE OR DELETE ON public.admin_classes
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_class_to_workouts();

-- 4) Backfill workouts rows for already-published admin_classes
INSERT INTO public.workouts (
  admin_class_id, title, description, duration_minutes, category,
  thumbnail_url, mux_playback_id, is_published
)
SELECT
  c.id, c.title, c.description, COALESCE(c.duration_minutes, 20),
  COALESCE(c.class_type, 'strength'), c.thumbnail_url, c.mux_playback_id, true
FROM public.admin_classes c
WHERE c.status = 'published'
  AND NOT EXISTS (SELECT 1 FROM public.workouts w WHERE w.admin_class_id = c.id);
