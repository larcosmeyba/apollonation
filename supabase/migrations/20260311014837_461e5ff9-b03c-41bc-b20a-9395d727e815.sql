
-- Slideshows table
CREATE TABLE public.group_coaching_slideshows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  class_type TEXT NOT NULL DEFAULT 'sculpt',
  equipment TEXT[] NOT NULL DEFAULT '{}',
  is_template BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Slides table
CREATE TABLE public.slideshow_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slideshow_id UUID NOT NULL REFERENCES public.group_coaching_slideshows(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL DEFAULT 0,
  slide_type TEXT NOT NULL DEFAULT 'exercise',
  exercise_name TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  sets INTEGER,
  reps TEXT,
  rest_seconds INTEGER,
  notes TEXT,
  coaching_cue TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.group_coaching_slideshows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slideshow_slides ENABLE ROW LEVEL SECURITY;

-- Slideshows: admins can manage, all authenticated can view templates
CREATE POLICY "Admins can manage all slideshows" ON public.group_coaching_slideshows
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view templates" ON public.group_coaching_slideshows
  FOR SELECT TO authenticated USING (is_template = true);

-- Slides: admins can manage, authenticated can view slides of templates
CREATE POLICY "Admins can manage all slides" ON public.slideshow_slides
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view template slides" ON public.slideshow_slides
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.group_coaching_slideshows s WHERE s.id = slideshow_id AND s.is_template = true)
  );

-- Updated_at trigger
CREATE TRIGGER update_slideshows_updated_at
  BEFORE UPDATE ON public.group_coaching_slideshows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
