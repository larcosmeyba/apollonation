DROP POLICY IF EXISTS "Subscribers can view workouts" ON public.workouts;

CREATE POLICY "Authenticated users can view workouts"
ON public.workouts
FOR SELECT
TO authenticated
USING (true);