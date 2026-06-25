DROP POLICY IF EXISTS "Members view blocks of published classes" ON public.admin_class_blocks;

CREATE POLICY "Authenticated users view blocks of published classes"
ON public.admin_class_blocks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_classes c
    WHERE c.id = admin_class_blocks.class_id
      AND c.status = 'published'
  )
);