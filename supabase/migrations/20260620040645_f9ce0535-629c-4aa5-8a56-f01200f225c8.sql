
-- 1. Blueprints: require subscription/trial/admin
DROP POLICY IF EXISTS "Authenticated can view published blueprints" ON public.blueprints;
CREATE POLICY "Members view published blueprints" ON public.blueprints
FOR SELECT TO authenticated
USING (
  is_published = true AND is_archived = false AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND (p.is_subscribed = true OR p.is_trial = true)
    )
  )
);

-- 2. admin_classes + admin_class_blocks: member gate
DROP POLICY IF EXISTS "Authenticated view published classes" ON public.admin_classes;
CREATE POLICY "Members view published classes" ON public.admin_classes
FOR SELECT TO authenticated
USING (
  status = 'published' AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND (p.is_subscribed = true OR p.is_trial = true)
    )
  )
);

DROP POLICY IF EXISTS "Authenticated view blocks of published classes" ON public.admin_class_blocks;
CREATE POLICY "Members view blocks of published classes" ON public.admin_class_blocks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_classes c
    WHERE c.id = admin_class_blocks.class_id AND c.status = 'published'
  ) AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND (p.is_subscribed = true OR p.is_trial = true)
    )
  )
);

-- 3. blueprint_analytics: let users read their own + validate blueprint exists on insert
CREATE POLICY "Users read own analytics" ON public.blueprint_analytics
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert their own analytics" ON public.blueprint_analytics;
CREATE POLICY "Users insert their own analytics" ON public.blueprint_analytics
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.blueprints b
    WHERE b.id = blueprint_analytics.blueprint_id
      AND b.is_published = true
      AND b.is_archived = false
  )
);

-- 4. workout-screenshots bucket: allow users to update/delete own files
CREATE POLICY "Users can update own workout screenshots" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'workout-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'workout-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own workout screenshots" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'workout-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
