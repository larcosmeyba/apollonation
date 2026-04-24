-- 1. user_notification_preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  workout_reminders boolean NOT NULL DEFAULT true,
  meal_reminders boolean NOT NULL DEFAULT true,
  coach_messages boolean NOT NULL DEFAULT true,
  weekly_summary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notif prefs"
  ON public.user_notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own notif prefs"
  ON public.user_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own notif prefs"
  ON public.user_notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all notif prefs"
  ON public.user_notification_preferences FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create a row on user signup. Reuses handle_new_user style.
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_prefs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_notif_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notif_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_notification_prefs();

-- Backfill rows for existing users
INSERT INTO public.user_notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 2. profiles.health_disclaimer_acknowledged_at
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS health_disclaimer_acknowledged_at timestamptz;

-- 3. Helper functions for edge functions
CREATE OR REPLACE FUNCTION public.get_notification_preference(_user_id uuid, _category text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  SELECT
    CASE _category
      WHEN 'workout_reminders' THEN workout_reminders
      WHEN 'meal_reminders' THEN meal_reminders
      WHEN 'coach_messages' THEN coach_messages
      WHEN 'weekly_summary' THEN weekly_summary
      ELSE true
    END
  INTO result
  FROM public.user_notification_preferences
  WHERE user_id = _user_id;

  -- If no row exists, default to true (opted-in)
  RETURN COALESCE(result, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_blocked(_blocker uuid, _blocked uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_user_id = _blocker AND blocked_user_id = _blocked
  );
$$;