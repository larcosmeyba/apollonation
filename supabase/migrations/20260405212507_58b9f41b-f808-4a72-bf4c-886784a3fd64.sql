
CREATE TABLE public.coach_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  social_media_following TEXT,
  social_media_handle TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit coach application"
  ON public.coach_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view coach applications"
  ON public.coach_applications
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
