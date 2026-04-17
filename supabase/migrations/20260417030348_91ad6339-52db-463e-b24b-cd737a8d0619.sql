CREATE TABLE public.user_privacy_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  ai_personalization_opted_out boolean NOT NULL DEFAULT false,
  marketing_opted_out boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_privacy_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own privacy prefs"
  ON public.user_privacy_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own privacy prefs"
  ON public.user_privacy_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own privacy prefs"
  ON public.user_privacy_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all privacy prefs"
  ON public.user_privacy_preferences FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_privacy_preferences_updated_at
  BEFORE UPDATE ON public.user_privacy_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create a row for every new signup
CREATE OR REPLACE FUNCTION public.handle_new_user_privacy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_privacy_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_privacy
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_privacy();

-- Backfill existing users
INSERT INTO public.user_privacy_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;