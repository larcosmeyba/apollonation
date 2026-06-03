
-- 1. Replace cross-read of full coach profile with a safe RPC that returns
--    only non-sensitive columns (no subscription/entitlement/billing data).
DROP POLICY IF EXISTS "Clients can view their assigned coach profile" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_assigned_coach_profile()
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, bio text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.avatar_url, p.bio
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_user_id = auth.uid()
      AND cca.coach_user_id = p.user_id
  )
  ORDER BY p.user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_assigned_coach_profile() TO authenticated;

-- 2. Public buckets: drop broad SELECT-listing policies. Files remain
--    publicly fetchable by direct URL (public buckets bypass RLS for object
--    downloads); removing these policies prevents anonymous enumeration
--    via storage.objects listing.
DROP POLICY IF EXISTS "Anyone can view marketing files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view program covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Recipe images are publicly readable" ON storage.objects;
