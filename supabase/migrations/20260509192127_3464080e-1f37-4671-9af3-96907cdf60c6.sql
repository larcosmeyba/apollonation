-- 1) Block privilege escalation on profiles via a BEFORE UPDATE trigger.
--    Non-admin, non-service-role users cannot change billing/entitlement columns.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role and admins may change anything.
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier       IS DISTINCT FROM OLD.subscription_tier
  OR NEW.is_subscribed           IS DISTINCT FROM OLD.is_subscribed
  OR NEW.entitlement             IS DISTINCT FROM OLD.entitlement
  OR NEW.manual_subscription     IS DISTINCT FROM OLD.manual_subscription
  OR NEW.is_test_account         IS DISTINCT FROM OLD.is_test_account
  OR NEW.subscription_plan       IS DISTINCT FROM OLD.subscription_plan
  OR NEW.subscription_store      IS DISTINCT FROM OLD.subscription_store
  OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
  OR NEW.revenuecat_app_user_id  IS DISTINCT FROM OLD.revenuecat_app_user_id
  OR NEW.account_status          IS DISTINCT FROM OLD.account_status
  THEN
    RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profile_privileged_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_privileged_columns();

-- Also add a WITH CHECK to the user UPDATE policy so user_id can't be reassigned.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2) Lock down free-quota counters to the calling user only.
CREATE OR REPLACE FUNCTION public.increment_free_workouts_used(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_count int;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.free_usage (user_id, free_workouts_used_count, last_updated_at)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE
    SET free_workouts_used_count = public.free_usage.free_workouts_used_count + 1,
        last_updated_at = now()
  RETURNING free_workouts_used_count INTO new_count;
  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_free_recipes_viewed(p_user_id uuid, p_recipe_id uuid DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count int;
  existing uuid[];
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT viewed_recipe_ids INTO existing FROM public.free_usage WHERE user_id = p_user_id;
  IF p_recipe_id IS NOT NULL AND existing IS NOT NULL AND p_recipe_id = ANY(existing) THEN
    SELECT free_recipes_viewed_count INTO new_count FROM public.free_usage WHERE user_id = p_user_id;
    RETURN new_count;
  END IF;

  INSERT INTO public.free_usage (user_id, free_recipes_viewed_count, viewed_recipe_ids, last_updated_at)
  VALUES (
    p_user_id,
    1,
    CASE WHEN p_recipe_id IS NOT NULL THEN ARRAY[p_recipe_id] ELSE '{}'::uuid[] END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET free_recipes_viewed_count = public.free_usage.free_recipes_viewed_count + 1,
        viewed_recipe_ids = CASE
          WHEN p_recipe_id IS NOT NULL AND NOT (p_recipe_id = ANY(public.free_usage.viewed_recipe_ids))
            THEN array_append(public.free_usage.viewed_recipe_ids, p_recipe_id)
          ELSE public.free_usage.viewed_recipe_ids
        END,
        last_updated_at = now()
  RETURNING free_recipes_viewed_count INTO new_count;
  RETURN new_count;
END;
$$;