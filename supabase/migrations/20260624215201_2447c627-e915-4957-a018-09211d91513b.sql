
-- #14: Trial loophole — track one-time trial consumption at the DB layer.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_consumed boolean NOT NULL DEFAULT false;

-- Backfill: anyone who has ever held a subscription or is currently flagged on trial
-- has used their trial. Conservative: prefer false-positive (deny re-trial) over loophole.
UPDATE public.profiles
SET trial_consumed = true,
    trial_started_at = COALESCE(trial_started_at, now())
WHERE trial_consumed = false
  AND (is_trial = true
       OR is_subscribed = true
       OR subscription_expires_at IS NOT NULL
       OR manual_subscription = true);

-- #20: Audit log for privileged billing field changes on profiles.
-- Anyone (admin/service-role/edge function) that changes these fields leaves a trail.
CREATE OR REPLACE FUNCTION public.audit_profile_billing_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed jsonb := '{}'::jsonb;
  actor uuid := auth.uid();
BEGIN
  IF NEW.is_subscribed           IS DISTINCT FROM OLD.is_subscribed           THEN changed := changed || jsonb_build_object('is_subscribed', jsonb_build_object('old', OLD.is_subscribed, 'new', NEW.is_subscribed)); END IF;
  IF NEW.manual_subscription     IS DISTINCT FROM OLD.manual_subscription     THEN changed := changed || jsonb_build_object('manual_subscription', jsonb_build_object('old', OLD.manual_subscription, 'new', NEW.manual_subscription)); END IF;
  IF NEW.entitlement             IS DISTINCT FROM OLD.entitlement             THEN changed := changed || jsonb_build_object('entitlement', jsonb_build_object('old', OLD.entitlement, 'new', NEW.entitlement)); END IF;
  IF NEW.subscription_tier       IS DISTINCT FROM OLD.subscription_tier       THEN changed := changed || jsonb_build_object('subscription_tier', jsonb_build_object('old', OLD.subscription_tier, 'new', NEW.subscription_tier)); END IF;
  IF NEW.subscription_plan       IS DISTINCT FROM OLD.subscription_plan       THEN changed := changed || jsonb_build_object('subscription_plan', jsonb_build_object('old', OLD.subscription_plan, 'new', NEW.subscription_plan)); END IF;
  IF NEW.subscription_store      IS DISTINCT FROM OLD.subscription_store      THEN changed := changed || jsonb_build_object('subscription_store', jsonb_build_object('old', OLD.subscription_store, 'new', NEW.subscription_store)); END IF;
  IF NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at THEN changed := changed || jsonb_build_object('subscription_expires_at', jsonb_build_object('old', OLD.subscription_expires_at, 'new', NEW.subscription_expires_at)); END IF;
  IF NEW.is_trial                IS DISTINCT FROM OLD.is_trial                THEN changed := changed || jsonb_build_object('is_trial', jsonb_build_object('old', OLD.is_trial, 'new', NEW.is_trial)); END IF;
  IF NEW.trial_consumed          IS DISTINCT FROM OLD.trial_consumed          THEN changed := changed || jsonb_build_object('trial_consumed', jsonb_build_object('old', OLD.trial_consumed, 'new', NEW.trial_consumed)); END IF;
  IF NEW.is_test_account         IS DISTINCT FROM OLD.is_test_account         THEN changed := changed || jsonb_build_object('is_test_account', jsonb_build_object('old', OLD.is_test_account, 'new', NEW.is_test_account)); END IF;
  IF NEW.account_status          IS DISTINCT FROM OLD.account_status          THEN changed := changed || jsonb_build_object('account_status', jsonb_build_object('old', OLD.account_status, 'new', NEW.account_status)); END IF;

  IF changed = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  -- admin_user_id NOT NULL; webhook/service-role writes use the target user_id as the actor
  -- so we always have a non-null value while still tagging the source via details.source.
  INSERT INTO public.admin_audit_log (admin_user_id, action, target_user_id, details)
  VALUES (
    COALESCE(actor, NEW.user_id),
    'profile_billing_changed',
    NEW.user_id,
    changed || jsonb_build_object(
      'source', CASE WHEN actor IS NULL THEN 'service_role_or_trigger' ELSE 'authenticated' END,
      'role',   auth.role()
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_profile_billing ON public.profiles;
CREATE TRIGGER trg_audit_profile_billing
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.audit_profile_billing_changes();

-- Update privileged-column guard so trial_consumed and trial_started_at also
-- require admin/service role to modify (clients cannot flip their own trial state).
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
  OR NEW.trial_consumed          IS DISTINCT FROM OLD.trial_consumed
  OR NEW.trial_started_at        IS DISTINCT FROM OLD.trial_started_at
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
