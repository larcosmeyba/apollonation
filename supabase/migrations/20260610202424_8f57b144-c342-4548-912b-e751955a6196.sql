
-- Allow users to insert and delete their own body metrics
CREATE POLICY "Users can insert own body metrics"
ON public.body_metrics FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own body metrics"
ON public.body_metrics FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to read/write the private program-source-docs bucket
CREATE POLICY "Admins can read program source docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'program-source-docs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert program source docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'program-source-docs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update program source docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'program-source-docs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete program source docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'program-source-docs' AND public.has_role(auth.uid(), 'admin'::public.app_role));
