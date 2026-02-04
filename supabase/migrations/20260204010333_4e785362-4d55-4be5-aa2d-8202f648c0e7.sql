-- Drop existing SELECT policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create PERMISSIVE policies (default) so they OR together correctly
-- Users can only view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));