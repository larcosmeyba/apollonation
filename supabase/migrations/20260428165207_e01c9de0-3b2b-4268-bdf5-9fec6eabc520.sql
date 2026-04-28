-- 1. free_usage table
CREATE TABLE IF NOT EXISTS public.free_usage (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  free_workouts_used_count int NOT NULL DEFAULT 0,
  free_recipe_used boolean NOT NULL DEFAULT false,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.free_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "free_usage_select_own" ON public.free_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "free_usage_insert_own" ON public.free_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "free_usage_update_own" ON public.free_usage FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "free_usage_admin_select" ON public.free_usage FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Auto-create free_usage row on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_free_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.free_usage (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_free_usage ON auth.users;
CREATE TRIGGER on_auth_user_created_free_usage
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_free_usage();

-- 3. Backfill free_usage for existing users
INSERT INTO public.free_usage (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 4. profiles.entitlement column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS entitlement text;

-- Backfill entitlement for currently subscribed users (best-effort default to apollo_premium)
UPDATE public.profiles
SET entitlement = 'apollo_premium'
WHERE entitlement IS NULL AND is_subscribed = true;