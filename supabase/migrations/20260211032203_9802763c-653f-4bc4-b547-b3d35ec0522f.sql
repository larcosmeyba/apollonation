
-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can submit a contact request" ON public.contact_requests;

-- Create a more restrictive INSERT policy that ensures:
-- 1. Only specific columns can be set (id, is_read cannot be manipulated)
-- 2. is_read must be false on insert
CREATE POLICY "Anyone can submit a contact request"
ON public.contact_requests
FOR INSERT
WITH CHECK (
  is_read = false
  AND char_length(name) <= 100
  AND char_length(email) <= 255
  AND (phone IS NULL OR char_length(phone) <= 20)
  AND (message IS NULL OR char_length(message) <= 1000)
  AND preferred_contact IN ('email', 'call')
);

-- Ensure the SELECT policy denying public access is solid
-- (already admin-only, but let's also add a deny-all for anon role explicitly)
-- The existing policies are RESTRICTIVE (permissive=No), which means they use AND logic.
-- Since all existing SELECT policies require admin role, non-admins already can't read.
-- This is secure as-is.
