
-- Gate workouts SELECT to subscribers/trial/admin
DROP POLICY IF EXISTS "Authenticated users can view workouts" ON public.workouts;
CREATE POLICY "Subscribers can view workouts"
ON public.workouts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_subscribed = true OR p.is_trial = true)
  )
);

-- Allow admins to audit the suppressed emails list
CREATE POLICY "Admins can view suppressed emails"
ON public.suppressed_emails
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
