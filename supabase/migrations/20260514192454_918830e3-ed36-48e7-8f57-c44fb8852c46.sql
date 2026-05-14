-- Ensure each client has only one Fuel questionnaire row and attach the existing unique index as a constraint for reliable upserts.
WITH ranked AS (
  SELECT id, user_id,
         row_number() OVER (PARTITION BY user_id ORDER BY completed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC) AS rn
  FROM public.client_nutrition_questionnaires
)
DELETE FROM public.client_nutrition_questionnaires q
USING ranked r
WHERE q.id = r.id
  AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.client_nutrition_questionnaires'::regclass
      AND conname = 'client_nutrition_questionnaires_user_id_key'
  ) THEN
    ALTER TABLE public.client_nutrition_questionnaires
      ADD CONSTRAINT client_nutrition_questionnaires_user_id_key
      UNIQUE USING INDEX client_nutrition_questionnaires_user_id_key;
  END IF;
END $$;

-- Secure server-side message sender for client -> Coach Marcos DMs.
-- This avoids mobile/webview insert edge cases and guarantees routing to the default coach.
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
      AND (p.entitlement = 'apollo_elite' OR public.has_role(sender, 'admin'::app_role))
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