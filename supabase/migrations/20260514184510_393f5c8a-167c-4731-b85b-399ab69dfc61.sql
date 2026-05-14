-- Ensure all client messages route to Coach Marcos and eligible clients can send reliably.
CREATE OR REPLACE FUNCTION public.route_client_message_to_default_coach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  default_coach_id uuid := 'b1427538-a690-4cd4-8e34-423602562f4a';
BEGIN
  -- Admin/coach outbound messages keep their chosen recipient.
  IF public.has_role(NEW.sender_id, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Until additional coaches exist, every client message goes to Coach Marcos.
  NEW.recipient_id := default_coach_id;

  INSERT INTO public.coach_client_assignments (coach_user_id, client_user_id)
  VALUES (default_coach_id, NEW.sender_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS route_client_message_to_default_coach_before_insert ON public.messages;
CREATE TRIGGER route_client_message_to_default_coach_before_insert
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.route_client_message_to_default_coach();

DROP POLICY IF EXISTS "Elite users can send messages to assigned coach" ON public.messages;
CREATE POLICY "Eligible clients can message Coach Marcos"
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
          AND (
            p.entitlement = 'apollo_elite'
            OR p.is_subscribed = true
          )
      )
    )
  )
);

UPDATE public.messages m
SET recipient_id = 'b1427538-a690-4cd4-8e34-423602562f4a'::uuid
WHERE NOT public.has_role(m.sender_id, 'admin'::app_role)
  AND m.recipient_id <> 'b1427538-a690-4cd4-8e34-423602562f4a'::uuid;

INSERT INTO public.coach_client_assignments (coach_user_id, client_user_id)
SELECT DISTINCT 'b1427538-a690-4cd4-8e34-423602562f4a'::uuid, p.user_id
FROM public.profiles p
WHERE p.user_id <> 'b1427538-a690-4cd4-8e34-423602562f4a'::uuid
  AND NOT public.has_role(p.user_id, 'admin'::app_role)
ON CONFLICT DO NOTHING;