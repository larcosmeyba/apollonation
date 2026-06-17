
CREATE TABLE public.blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  cover_image_url TEXT,
  pdf_path TEXT NOT NULL,
  read_time_minutes INTEGER DEFAULT 10,
  goal_tags TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blueprints TO authenticated;
GRANT ALL ON public.blueprints TO service_role;
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published blueprints"
ON public.blueprints FOR SELECT TO authenticated
USING ((is_published = true AND is_archived = false) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage blueprints"
ON public.blueprints FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_blueprints_updated_at
BEFORE UPDATE ON public.blueprints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.blueprint_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view','download')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.blueprint_analytics TO authenticated;
GRANT ALL ON public.blueprint_analytics TO service_role;
ALTER TABLE public.blueprint_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own analytics"
ON public.blueprint_analytics FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins read all analytics"
ON public.blueprint_analytics FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_blueprint_analytics_blueprint ON public.blueprint_analytics(blueprint_id);
CREATE INDEX idx_blueprint_analytics_event ON public.blueprint_analytics(event_type);

-- Storage policies for blueprint buckets
CREATE POLICY "Authenticated read blueprint pdfs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'blueprint-pdfs');

CREATE POLICY "Admins manage blueprint pdfs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'blueprint-pdfs' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'blueprint-pdfs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read blueprint covers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'blueprint-covers');

CREATE POLICY "Public read blueprint covers"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'blueprint-covers');

CREATE POLICY "Admins manage blueprint covers"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'blueprint-covers' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'blueprint-covers' AND public.has_role(auth.uid(), 'admin'));
