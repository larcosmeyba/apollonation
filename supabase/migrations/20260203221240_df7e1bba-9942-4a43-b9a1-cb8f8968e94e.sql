-- Add UPDATE policy for user_workout_progress table
CREATE POLICY "Users can update their own progress"
ON public.user_workout_progress
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);