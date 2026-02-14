
-- Allow users to update scheduled_date on their own training plan days
CREATE POLICY "Users can update own training plan day schedule"
ON public.training_plan_days
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM client_training_plans p
  WHERE p.id = training_plan_days.plan_id AND p.user_id = auth.uid()
));
