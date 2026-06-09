
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS mux_playback_id text;
ALTER TABLE public.workouts  ADD COLUMN IF NOT EXISTS mux_playback_id text;

CREATE INDEX IF NOT EXISTS idx_exercises_mux_playback_id ON public.exercises(mux_playback_id);
CREATE INDEX IF NOT EXISTS idx_workouts_mux_playback_id  ON public.workouts(mux_playback_id);

-- Backfill exercises.mux_playback_id from admin_exercises by name match
UPDATE public.exercises e
SET mux_playback_id = ae.mux_playback_id
FROM public.admin_exercises ae
WHERE e.mux_playback_id IS NULL
  AND ae.mux_playback_id IS NOT NULL
  AND lower(trim(e.title)) = lower(trim(ae.name));
