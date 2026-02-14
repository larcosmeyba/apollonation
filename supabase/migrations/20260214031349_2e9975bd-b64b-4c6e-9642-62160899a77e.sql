-- Allow users to see display_name of their messaging partners
CREATE POLICY "Users can view profiles of message partners"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT sender_id FROM public.messages WHERE recipient_id = auth.uid()
    UNION
    SELECT recipient_id FROM public.messages WHERE sender_id = auth.uid()
  )
);
