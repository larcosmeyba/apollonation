-- Drop the existing permissive insert policy
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- New: only Elite users (or admins) can insert as sender
CREATE POLICY "Elite users can send messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.entitlement = 'apollo_elite'
    )
  )
);