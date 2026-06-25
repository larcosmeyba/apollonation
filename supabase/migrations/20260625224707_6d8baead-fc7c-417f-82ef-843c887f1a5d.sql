DROP POLICY IF EXISTS "Members and admins can view exercises" ON public.admin_exercises;

CREATE POLICY "Authenticated users can view exercises"
ON public.admin_exercises
FOR SELECT
TO authenticated
USING (true);