-- Make the food-photos bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'food-photos';

-- Update storage policies for food-photos bucket
-- First drop existing policies if any
DROP POLICY IF EXISTS "Users can upload their own food photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own food photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own food photos" ON storage.objects;
DROP POLICY IF EXISTS "Food photos are publicly accessible" ON storage.objects;

-- Create policies for private access
CREATE POLICY "Users can upload their own food photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'food-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own food photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'food-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own food photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'food-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);