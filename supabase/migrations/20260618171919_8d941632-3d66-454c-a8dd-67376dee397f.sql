
-- 1. Add is_trial column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_trial boolean NOT NULL DEFAULT false;

-- 2. Replace the elite-only insert policy with an active-member policy
DROP POLICY IF EXISTS "Elite clients can message Coach Marcos" ON public.messages;

CREATE POLICY "Active members can message Coach Marcos"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      recipient_id = 'b1427538-a690-4cd4-8e34-423602562f4a'::uuid
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.is_subscribed = true
      )
    )
  )
);

-- 3. Replace send_coach_message to require an active subscription (paid or trial)
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
        p.is_subscribed = true
        OR public.has_role(sender, 'admin'::app_role)
      )
  ) THEN
    RAISE EXCEPTION 'membership_required';
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

-- 4. Extend the profiles guard so clients can't self-grant trial state
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier       IS DISTINCT FROM OLD.subscription_tier
  OR NEW.is_subscribed           IS DISTINCT FROM OLD.is_subscribed
  OR NEW.entitlement             IS DISTINCT FROM OLD.entitlement
  OR NEW.manual_subscription     IS DISTINCT FROM OLD.manual_subscription
  OR NEW.is_test_account         IS DISTINCT FROM OLD.is_test_account
  OR NEW.is_trial                IS DISTINCT FROM OLD.is_trial
  OR NEW.subscription_plan       IS DISTINCT FROM OLD.subscription_plan
  OR NEW.subscription_store      IS DISTINCT FROM OLD.subscription_store
  OR NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at
  OR NEW.revenuecat_app_user_id  IS DISTINCT FROM OLD.revenuecat_app_user_id
  OR NEW.account_status          IS DISTINCT FROM OLD.account_status
  THEN
    RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
  END IF;

  RETURN NEW;
END;
$$;
