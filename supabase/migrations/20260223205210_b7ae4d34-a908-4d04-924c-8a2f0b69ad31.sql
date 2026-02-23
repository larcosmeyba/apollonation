
-- Create public thumbnails bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true) ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload thumbnails
CREATE POLICY "Admins can upload thumbnails" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update thumbnails
CREATE POLICY "Admins can update thumbnails" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete thumbnails
CREATE POLICY "Admins can delete thumbnails" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'));

-- Allow public read access to thumbnails
CREATE POLICY "Anyone can view thumbnails" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'thumbnails');
