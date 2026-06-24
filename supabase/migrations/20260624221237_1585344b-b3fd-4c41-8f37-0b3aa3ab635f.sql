-- #1: admin_exercises — restrict reads to admins + members/trial users.
-- Free signups should not be able to enumerate source_video_url / source_storage_path / mux_playback_id.
DROP POLICY IF EXISTS "Authenticated view exercises" ON public.admin_exercises;

CREATE POLICY "Members and admins can view exercises"
  ON public.admin_exercises FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_subscribed = true OR p.is_trial = true)
    )
  );

-- #2: nutrition_plan_meals — allow users to insert/delete meals on plans they own.
CREATE POLICY "Users can insert meals on own plans"
  ON public.nutrition_plan_meals FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nutrition_plans np
      WHERE np.id = plan_id AND np.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete meals on own plans"
  ON public.nutrition_plan_meals FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nutrition_plans np
      WHERE np.id = plan_id AND np.user_id = auth.uid()
    )
  );