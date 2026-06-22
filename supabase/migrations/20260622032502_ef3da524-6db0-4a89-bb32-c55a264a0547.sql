
-- 1. coach_applications: explicit RESTRICTIVE deny of SELECT for anon/authenticated non-admins.
-- The existing PERMISSIVE admin SELECT still works because RESTRICTIVE only blocks when its check fails.
CREATE POLICY "Deny non-admin select on coach applications"
ON public.coach_applications AS RESTRICTIVE
FOR SELECT TO anon, authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. email_unsubscribe_tokens: explicit deny for anon/authenticated (only service_role may read/write).
CREATE POLICY "Deny client access to unsubscribe tokens"
ON public.email_unsubscribe_tokens AS RESTRICTIVE
FOR ALL TO anon, authenticated
USING (false)
WITH CHECK (false);

-- 3. meal_plan_generation_log: explicit deny of writes from anon/authenticated.
-- Edge functions use service_role which bypasses RLS.
CREATE POLICY "Deny client writes on meal plan generation log"
ON public.meal_plan_generation_log AS RESTRICTIVE
FOR INSERT TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Deny client updates on meal plan generation log"
ON public.meal_plan_generation_log AS RESTRICTIVE
FOR UPDATE TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes on meal plan generation log"
ON public.meal_plan_generation_log AS RESTRICTIVE
FOR DELETE TO anon, authenticated
USING (false);

COMMENT ON TABLE public.meal_plan_generation_log IS
  'Write-only from edge functions via service_role. Client roles can SELECT their own rows but cannot insert/update/delete.';

-- 4. mw_trial_status: add admin SELECT policy.
CREATE POLICY "Admins can view all trial statuses"
ON public.mw_trial_status
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. suppressed_emails: explicit deny of writes from anon/authenticated (service_role bypasses).
CREATE POLICY "Deny client writes on suppressed emails"
ON public.suppressed_emails AS RESTRICTIVE
FOR INSERT TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Deny client updates on suppressed emails"
ON public.suppressed_emails AS RESTRICTIVE
FOR UPDATE TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes on suppressed emails"
ON public.suppressed_emails AS RESTRICTIVE
FOR DELETE TO anon, authenticated
USING (false);

COMMENT ON TABLE public.suppressed_emails IS
  'Email suppression list. Managed exclusively by edge functions via service_role. Only admins can SELECT.';
