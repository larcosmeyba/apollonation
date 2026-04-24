ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_subscribed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_plan text CHECK (subscription_plan IN ('monthly','annual')),
  ADD COLUMN IF NOT EXISTS subscription_store text CHECK (subscription_store IN ('app_store','play_store','manual')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_revenuecat_app_user_id_unique
  ON public.profiles (revenuecat_app_user_id)
  WHERE revenuecat_app_user_id IS NOT NULL;

UPDATE public.profiles
SET is_subscribed = true,
    subscription_store = 'manual'
WHERE (subscription_tier IN ('pro','elite') OR manual_subscription = true)
  AND is_subscribed = false;