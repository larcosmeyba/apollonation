-- #23: Lock down push_tokens reads to service_role + admins only.
-- Clients never need to read tokens back; they only register/refresh/delete.
-- This shrinks blast radius if a user JWT is stolen.

DROP POLICY IF EXISTS "Users can view their own push tokens" ON public.push_tokens;

CREATE POLICY "Admins can view all push tokens"
  ON public.push_tokens FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Revoke broad SELECT from authenticated; service_role retains full access via GRANT ALL.
REVOKE SELECT ON public.push_tokens FROM authenticated;
GRANT INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;

-- Housekeeping: drop stale tokens older than 90 days with no update activity.
-- Stale device tokens are a liability (invalid pushes, leaked-DB blast radius).
CREATE OR REPLACE FUNCTION public.cleanup_stale_push_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.push_tokens
  WHERE updated_at < now() - interval '90 days';
$$;