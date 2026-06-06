
-- =========================================================
-- user_programs
-- =========================================================
CREATE TABLE public.user_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  current_week int NOT NULL DEFAULT 1,
  current_day int NOT NULL DEFAULT 1,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  progress_percent numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_programs_one_active_per_user
  ON public.user_programs(user_id) WHERE status = 'active';
CREATE INDEX user_programs_user_idx ON public.user_programs(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_programs TO authenticated;
GRANT ALL ON public.user_programs TO service_role;
ALTER TABLE public.user_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own user_programs"
  ON public.user_programs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all user_programs"
  ON public.user_programs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER user_programs_updated_at
  BEFORE UPDATE ON public.user_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- program_workouts (program template)
-- =========================================================
CREATE TABLE public.program_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  day_number int NOT NULL,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  duration_minutes int,
  focus text[] DEFAULT '{}'::text[],
  type text,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id, week_number, day_number)
);
CREATE INDEX program_workouts_program_idx ON public.program_workouts(program_id);

GRANT SELECT ON public.program_workouts TO authenticated;
GRANT ALL ON public.program_workouts TO service_role;
ALTER TABLE public.program_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view program_workouts"
  ON public.program_workouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage program_workouts"
  ON public.program_workouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER program_workouts_updated_at
  BEFORE UPDATE ON public.program_workouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- user_program_workouts (per-user schedule)
-- =========================================================
CREATE TABLE public.user_program_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_program_id uuid NOT NULL REFERENCES public.user_programs(id) ON DELETE CASCADE,
  program_workout_id uuid NOT NULL REFERENCES public.program_workouts(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  is_swapped boolean NOT NULL DEFAULT false,
  swapped_workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','completed','missed','skipped')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX upw_user_idx ON public.user_program_workouts(user_id, scheduled_date);
CREATE INDEX upw_program_idx ON public.user_program_workouts(user_program_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_program_workouts TO authenticated;
GRANT ALL ON public.user_program_workouts TO service_role;
ALTER TABLE public.user_program_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own user_program_workouts"
  ON public.user_program_workouts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all user_program_workouts"
  ON public.user_program_workouts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER user_program_workouts_updated_at
  BEFORE UPDATE ON public.user_program_workouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- user_workout_completions
-- =========================================================
CREATE TABLE public.user_workout_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  user_program_workout_id uuid REFERENCES public.user_program_workouts(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  duration_minutes int,
  calories int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX uwc_user_idx ON public.user_workout_completions(user_id, completed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_workout_completions TO authenticated;
GRANT ALL ON public.user_workout_completions TO service_role;
ALTER TABLE public.user_workout_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own user_workout_completions"
  ON public.user_workout_completions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all user_workout_completions"
  ON public.user_workout_completions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- user_activity_logs (manual logs)
-- =========================================================
CREATE TABLE public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  duration_minutes int,
  calories int,
  notes text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ual_user_idx ON public.user_activity_logs(user_id, logged_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activity_logs TO authenticated;
GRANT ALL ON public.user_activity_logs TO service_role;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own user_activity_logs"
  ON public.user_activity_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all user_activity_logs"
  ON public.user_activity_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER user_activity_logs_updated_at
  BEFORE UPDATE ON public.user_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RPC: enroll_in_program
-- =========================================================
CREATE OR REPLACE FUNCTION public.enroll_in_program(p_program_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  up_id uuid;
  start_date date := current_date;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  -- Pause any existing active program
  UPDATE public.user_programs SET status='paused' WHERE user_id=uid AND status='active';

  INSERT INTO public.user_programs(user_id, program_id, started_at)
  VALUES (uid, p_program_id, now())
  RETURNING id INTO up_id;

  INSERT INTO public.user_program_workouts(user_id, user_program_id, program_workout_id, scheduled_date)
  SELECT
    uid,
    up_id,
    pw.id,
    start_date + ((pw.week_number - 1) * 7 + (pw.day_number - 1))
  FROM public.program_workouts pw
  WHERE pw.program_id = p_program_id;

  RETURN up_id;
END;
$$;

-- =========================================================
-- RPC: complete_program_workout
-- =========================================================
CREATE OR REPLACE FUNCTION public.complete_program_workout(
  p_user_program_workout_id uuid,
  p_duration int DEFAULT NULL,
  p_calories int DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec record;
  pct numeric;
  total int;
  done int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT upw.*, pw.workout_id AS pw_workout_id, pw.week_number, pw.day_number
    INTO rec
  FROM public.user_program_workouts upw
  JOIN public.program_workouts pw ON pw.id = upw.program_workout_id
  WHERE upw.id = p_user_program_workout_id AND upw.user_id = uid;

  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  UPDATE public.user_program_workouts
     SET status='completed', completed_at=now()
   WHERE id = p_user_program_workout_id;

  INSERT INTO public.user_workout_completions(user_id, workout_id, user_program_workout_id, duration_minutes, calories)
  VALUES (uid, COALESCE(rec.swapped_workout_id, rec.pw_workout_id), p_user_program_workout_id, p_duration, p_calories);

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status='completed')
    INTO total, done
  FROM public.user_program_workouts
  WHERE user_program_id = rec.user_program_id;

  pct := CASE WHEN total=0 THEN 0 ELSE round((done::numeric / total) * 100, 1) END;

  UPDATE public.user_programs
     SET progress_percent = pct,
         current_week = rec.week_number,
         current_day = rec.day_number,
         status = CASE WHEN done >= total THEN 'completed' ELSE status END,
         completed_at = CASE WHEN done >= total THEN now() ELSE completed_at END
   WHERE id = rec.user_program_id;

  RETURN jsonb_build_object('progress_percent', pct, 'done', done, 'total', total);
END;
$$;

-- =========================================================
-- RPC: swap_program_workout
-- =========================================================
CREATE OR REPLACE FUNCTION public.swap_program_workout(
  p_user_program_workout_id uuid,
  p_category text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur record;
  new_w uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT upw.*, pw.duration_minutes AS pw_duration
    INTO cur
  FROM public.user_program_workouts upw
  JOIN public.program_workouts pw ON pw.id = upw.program_workout_id
  WHERE upw.id = p_user_program_workout_id AND upw.user_id = uid;

  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  SELECT w.id INTO new_w
  FROM public.workouts w
  WHERE lower(coalesce(w.category,'')) = lower(p_category)
    AND (cur.pw_duration IS NULL OR abs(coalesce(w.duration_minutes, cur.pw_duration) - cur.pw_duration) <= 10)
  ORDER BY random()
  LIMIT 1;

  IF new_w IS NULL THEN RAISE EXCEPTION 'no_match'; END IF;

  UPDATE public.user_program_workouts
     SET is_swapped = true, swapped_workout_id = new_w
   WHERE id = p_user_program_workout_id;

  RETURN new_w;
END;
$$;
