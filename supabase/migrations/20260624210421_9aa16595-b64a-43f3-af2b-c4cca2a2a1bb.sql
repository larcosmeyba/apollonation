-- 1. Remove client-side write access. Force all writes through SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS free_usage_update_own ON public.free_usage;
DROP POLICY IF EXISTS free_usage_insert_own ON public.free_usage;

-- (free_usage_select_own and free_usage_admin_select stay so the client can still READ its quota.)

-- 2. Harden workout RPC: raise once cap is hit.
CREATE OR REPLACE FUNCTION public.increment_free_workouts_used(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count int;
  cap CONSTANT int := 10;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.free_usage (user_id, free_workouts_used_count, last_updated_at)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE
    SET free_workouts_used_count =
          CASE
            WHEN public.free_usage.free_workouts_used_count >= cap THEN public.free_usage.free_workouts_used_count
            ELSE public.free_usage.free_workouts_used_count + 1
          END,
        last_updated_at = now()
  RETURNING free_workouts_used_count INTO new_count;

  IF new_count > cap THEN
    RAISE EXCEPTION 'free_limit_reached';
  END IF;

  RETURN new_count;
END;
$$;

-- 3. Harden recipe RPC: same cap-aware logic.
CREATE OR REPLACE FUNCTION public.increment_free_recipes_viewed(
  p_user_id uuid,
  p_recipe_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count int;
  existing uuid[];
  cap CONSTANT int := 10;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT viewed_recipe_ids INTO existing FROM public.free_usage WHERE user_id = p_user_id;
  -- Re-opening an already-viewed recipe doesn't burn quota
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
    SET free_recipes_viewed_count =
          CASE
            WHEN public.free_usage.free_recipes_viewed_count >= cap THEN public.free_usage.free_recipes_viewed_count
            ELSE public.free_usage.free_recipes_viewed_count + 1
          END,
        viewed_recipe_ids = CASE
          WHEN p_recipe_id IS NOT NULL AND NOT (p_recipe_id = ANY(public.free_usage.viewed_recipe_ids))
            THEN array_append(public.free_usage.viewed_recipe_ids, p_recipe_id)
          ELSE public.free_usage.viewed_recipe_ids
        END,
        last_updated_at = now()
  RETURNING free_recipes_viewed_count INTO new_count;

  IF new_count > cap THEN
    RAISE EXCEPTION 'free_limit_reached';
  END IF;

  RETURN new_count;
END;
$$;

-- 4. New program increment RPC (replaces client-side upsert).
CREATE OR REPLACE FUNCTION public.increment_free_programs_used(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count int;
  cap CONSTANT int := 2;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.free_usage (user_id, free_programs_used_count, last_updated_at)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE
    SET free_programs_used_count =
          CASE
            WHEN public.free_usage.free_programs_used_count >= cap THEN public.free_usage.free_programs_used_count
            ELSE public.free_usage.free_programs_used_count + 1
          END,
        last_updated_at = now()
  RETURNING free_programs_used_count INTO new_count;

  IF new_count > cap THEN
    RAISE EXCEPTION 'free_limit_reached';
  END IF;

  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_free_programs_used(uuid) TO authenticated;