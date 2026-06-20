-- Fix existing class-builder workouts that were not picked up by the publish flow,
-- and ensure the sync trigger always re-publishes on UPDATE.
UPDATE public.workouts w
SET is_published = true
FROM public.admin_classes c
WHERE w.admin_class_id = c.id
  AND c.status = 'published';

-- Re-create trigger function: also propagate thumbnail_url updates and force
-- is_published=true whenever an admin class is published.
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