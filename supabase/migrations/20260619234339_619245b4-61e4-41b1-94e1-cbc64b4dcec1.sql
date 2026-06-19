-- 1. Recipes: gate SELECT to subscribed/trial members or admins
DROP POLICY IF EXISTS "Authenticated users can view recipes" ON public.recipes;
CREATE POLICY "Members can view recipes"
ON public.recipes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_subscribed = true OR p.is_trial = true)
  )
);

-- 2. Exercise videos storage: gate to members/trial/admin
DROP POLICY IF EXISTS "Authenticated users can view exercise videos" ON storage.objects;
CREATE POLICY "Members can view exercise videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'exercise-videos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_subscribed = true OR p.is_trial = true)
    )
  )
);

-- 3. Client notes: allow assigned coaches to read notes for their clients
CREATE POLICY "Coaches can view notes for their assigned clients"
ON public.client_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.coach_client_assignments cca
    WHERE cca.coach_user_id = auth.uid()
      AND cca.client_user_id = client_notes.client_user_id
  )
);

-- 4. Messages INSERT: include is_trial alongside is_subscribed
DROP POLICY IF EXISTS "Active members can message Coach Marcos" ON public.messages;
CREATE POLICY "Active members can message Coach Marcos"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      recipient_id = 'b1427538-a690-4cd4-8e34-423602562f4a'::uuid
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND (p.is_subscribed = true OR p.is_trial = true)
      )
    )
  )
);