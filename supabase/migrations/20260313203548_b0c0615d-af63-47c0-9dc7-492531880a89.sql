
-- Add watch screenshot column to workout_session_logs
ALTER TABLE public.workout_session_logs 
ADD COLUMN IF NOT EXISTS watch_screenshot_url text DEFAULT NULL;

-- Create storage bucket for workout watch screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('workout-screenshots', 'workout-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload their own workout screenshots
CREATE POLICY "Users can upload workout screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workout-screenshots' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Users can view their own screenshots
CREATE POLICY "Users can view own workout screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'workout-screenshots' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Admins can view all workout screenshots
CREATE POLICY "Admins can view all workout screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'workout-screenshots'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
