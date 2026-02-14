
-- Drop policies that incorrectly target the public role
DROP POLICY "Users can update their own profile" ON public.profiles;
DROP POLICY "Users can insert their own profile" ON public.profiles;
DROP POLICY "Admins can update all profiles" ON public.profiles;

-- Recreate them targeting only authenticated users
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
