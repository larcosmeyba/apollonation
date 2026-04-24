
-- 1. Add agreed_to_terms_at column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agreed_to_terms_at timestamptz;

-- 2. User-scoped storage policies
-- Drop any previous user-scoped policies to keep this idempotent
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;

DROP POLICY IF EXISTS "Users upload own progress photo" ON storage.objects;
DROP POLICY IF EXISTS "Users update own progress photo" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own progress photo" ON storage.objects;
DROP POLICY IF EXISTS "Users read own progress photo" ON storage.objects;

DROP POLICY IF EXISTS "Users upload own food photo" ON storage.objects;
DROP POLICY IF EXISTS "Users update own food photo" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own food photo" ON storage.objects;
DROP POLICY IF EXISTS "Users read own food photo" ON storage.objects;

-- avatars: user-scoped write/update/delete (read remains as configured elsewhere)
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- progress-photos: user-scoped on all CRUD
CREATE POLICY "Users upload own progress photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own progress photo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own progress photo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own progress photo"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- food-photos: user-scoped on all CRUD (this is the meal-photos bucket in this project)
CREATE POLICY "Users upload own food photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own food photo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own food photo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own food photo"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'food-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
