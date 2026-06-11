
-- 1. Admin SELECT on email_send_log (PII review)
CREATE POLICY "Admins can read email send log"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. free_usage explicit UPDATE policy (owner only)
CREATE POLICY "free_usage_update_own"
  ON public.free_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Tighten waitlist_signups insert validation
DROP POLICY IF EXISTS "Anyone can join the waitlist" ON public.waitlist_signups;

CREATE POLICY "Anyone can join the waitlist"
  ON public.waitlist_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 5 AND 255
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND (name IS NULL OR length(name) <= 120)
    AND (platform IS NULL OR length(platform) <= 40)
  );
