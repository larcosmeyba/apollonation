
-- Recovery logs table
CREATE TABLE public.recovery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours numeric,
  hydration_liters numeric,
  mobility_minutes integer,
  soreness_rating integer CHECK (soreness_rating BETWEEN 1 AND 5),
  soreness_areas jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);

ALTER TABLE public.recovery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recovery logs" ON public.recovery_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recovery logs" ON public.recovery_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recovery logs" ON public.recovery_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recovery logs" ON public.recovery_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all recovery logs" ON public.recovery_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Progress photos table
CREATE TABLE public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_date date NOT NULL DEFAULT CURRENT_DATE,
  photo_type text NOT NULL CHECK (photo_type IN ('front', 'side', 'back')),
  photo_url text NOT NULL,
  weight_lbs numeric,
  body_fat_pct numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress photos" ON public.progress_photos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress photos" ON public.progress_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress photos" ON public.progress_photos FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress photos" ON public.progress_photos FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Progress photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false);

CREATE POLICY "Users can upload own progress photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own progress photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own progress photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can view all progress photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'progress-photos' AND public.has_role(auth.uid(), 'admin'));
