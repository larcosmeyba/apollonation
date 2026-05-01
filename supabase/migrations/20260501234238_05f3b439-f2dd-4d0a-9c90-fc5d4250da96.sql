
-- Allow clients to view their assigned coach's profile (so avatar/bio render in chat)
CREATE POLICY "Clients can view their assigned coach profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.client_user_id = auth.uid()
      AND cca.coach_user_id = profiles.user_id
  )
);

-- Tighten message INSERT: clients (Elite) may only send to their assigned coach.
-- Admins can still send to anyone.
DROP POLICY IF EXISTS "Elite users can send messages" ON public.messages;

CREATE POLICY "Elite users can send messages to assigned coach"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.entitlement = 'apollo_elite'
      )
      AND EXISTS (
        SELECT 1 FROM public.coach_client_assignments cca
        WHERE cca.client_user_id = auth.uid()
          AND cca.coach_user_id = messages.recipient_id
      )
    )
  )
);
