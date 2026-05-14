DROP POLICY IF EXISTS "Eligible clients can message Coach Marcos" ON public.messages;

CREATE POLICY "Elite clients can message Coach Marcos"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      recipient_id = 'b1427538-a690-4cd4-8e34-423602562f4a'::uuid
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.entitlement = 'apollo_elite'
      )
    )
  )
);