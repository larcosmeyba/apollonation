
-- Drop the overly broad message-partner policy that exposes all profile columns
DROP POLICY IF EXISTS "Users can view profiles of message partners" ON public.profiles;

-- Create a secure function that only returns display_name for message partners
CREATE OR REPLACE FUNCTION public.get_message_partner_profiles(partner_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name
  FROM public.profiles p
  WHERE p.user_id = ANY(partner_ids)
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (m.sender_id = auth.uid() AND m.recipient_id = p.user_id)
         OR (m.recipient_id = auth.uid() AND m.sender_id = p.user_id)
    );
$$;
