DROP POLICY IF EXISTS "Members view published classes" ON public.admin_classes;
CREATE POLICY "Members view published classes"
ON public.admin_classes FOR SELECT
USING (
  status = 'published'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_subscribed = true OR p.is_trial = true)
    )
    OR EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.admin_class_id = admin_classes.id
        AND w.is_free_pick = true
        AND w.is_published = true
    )
  )
);