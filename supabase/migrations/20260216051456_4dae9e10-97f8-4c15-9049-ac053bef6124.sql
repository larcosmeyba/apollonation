
-- Create a private storage bucket for exercise videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-videos', 'exercise-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view exercise videos
CREATE POLICY "Authenticated users can view exercise videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-videos' AND auth.role() = 'authenticated');

-- Allow admins to upload exercise videos
CREATE POLICY "Admins can upload exercise videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-videos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update exercise videos
CREATE POLICY "Admins can update exercise videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exercise-videos' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete exercise videos
CREATE POLICY "Admins can delete exercise videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exercise-videos' 
  AND public.has_role(auth.uid(), 'admin')
);
