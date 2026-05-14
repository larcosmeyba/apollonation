CREATE OR REPLACE FUNCTION public.send_coach_message(_content text)
RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_coach_id uuid := 'b1427538-a690-4cd4-8e34-423602562f4a';
  sender uuid := auth.uid();
  inserted public.messages;
BEGIN
  IF sender IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF _content IS NULL OR length(trim(_content)) = 0 THEN
    RAISE EXCEPTION 'empty_message';
  END IF;

  IF length(_content) > 4000 THEN
    RAISE EXCEPTION 'message_too_long';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = sender
      AND (
        p.entitlement = 'apollo_elite'
        OR public.has_role(sender, 'admin'::app_role)
      )
  ) THEN
    RAISE EXCEPTION 'elite_required';
  END IF;

  INSERT INTO public.coach_client_assignments (coach_user_id, client_user_id)
  VALUES (default_coach_id, sender)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.messages (sender_id, recipient_id, content)
  VALUES (sender, default_coach_id, trim(_content))
  RETURNING * INTO inserted;

  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.send_coach_message(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_coach_message(text) TO authenticated;