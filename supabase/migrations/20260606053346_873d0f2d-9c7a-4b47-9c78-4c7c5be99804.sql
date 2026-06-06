
-- Fix 1: Harden coach_applications INSERT with validation
DROP POLICY IF EXISTS "Anyone can submit coach application" ON public.coach_applications;

CREATE POLICY "Public can submit valid coach application"
ON public.coach_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  name IS NOT NULL
  AND length(trim(name)) BETWEEN 1 AND 100
  AND email IS NOT NULL
  AND length(email) BETWEEN 5 AND 255
  AND email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  AND (social_media_handle IS NULL OR length(social_media_handle) <= 100)
  AND (social_media_following IS NULL OR length(social_media_following) <= 100)
  AND (reason IS NULL OR length(reason) <= 2000)
);

-- Fix 2: Explicitly block client-side inserts into openai_request_logs.
-- Only service_role (which bypasses RLS) and admins should write rows.
CREATE POLICY "Block client inserts on openai logs"
ON public.openai_request_logs
FOR INSERT
TO authenticated, anon
WITH CHECK (false);
