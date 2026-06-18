-- 1) Gate blueprint PDFs/covers to active members (subscribed or trial) and admins
DROP POLICY IF EXISTS "Authenticated read blueprint pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read blueprint covers" ON storage.objects;
DROP POLICY IF EXISTS "Public read blueprint covers" ON storage.objects;

CREATE POLICY "Members read blueprint pdfs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'blueprint-pdfs'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_subscribed = true OR p.is_trial = true)
    )
  )
);

CREATE POLICY "Members read blueprint covers"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'blueprint-covers'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_subscribed = true OR p.is_trial = true)
    )
  )
);

-- 2) Replace permissive deny on realtime.messages with a RESTRICTIVE deny so it
--    actually blocks Realtime channel subscriptions for client roles.
DROP POLICY IF EXISTS "Deny all realtime channel access to clients" ON realtime.messages;

CREATE POLICY "Restrict realtime channel access"
ON realtime.messages
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);