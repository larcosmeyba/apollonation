-- Make the avatars bucket private (no public access without signed URLs)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'avatars';