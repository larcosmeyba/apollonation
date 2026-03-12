
-- Programs table for browsable training programs
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  cover_image_url TEXT,
  durations INTEGER[] NOT NULL DEFAULT '{4}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Everyone can view active programs
CREATE POLICY "Anyone can view active programs" ON public.programs
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Admins can manage all programs
CREATE POLICY "Admins can manage all programs" ON public.programs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Storage bucket for program cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('program-covers', 'program-covers', true);

-- Storage policies for program covers
CREATE POLICY "Anyone can view program covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'program-covers');

CREATE POLICY "Admins can upload program covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'program-covers' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update program covers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'program-covers' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete program covers" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'program-covers' AND has_role(auth.uid(), 'admin'));
