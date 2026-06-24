ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS mux_playback_signed boolean NOT NULL DEFAULT false;
ALTER TABLE public.admin_classes ADD COLUMN IF NOT EXISTS mux_playback_signed boolean NOT NULL DEFAULT false;
ALTER TABLE public.admin_exercises ADD COLUMN IF NOT EXISTS mux_playback_signed boolean NOT NULL DEFAULT false;

-- Keep sync trigger in lockstep so admin_classes → workouts copies the flag.
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
      thumbnail_url, mux_playback_id, video_url, mux_asset_id, mux_status,
      mux_playback_signed, is_published
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
      COALESCE(NEW.mux_playback_signed, false),
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
      mux_playback_signed = EXCLUDED.mux_playback_signed,
      is_published     = true;
  ELSE
    DELETE FROM public.workouts WHERE admin_class_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;