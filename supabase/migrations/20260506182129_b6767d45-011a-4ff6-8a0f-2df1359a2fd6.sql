
CREATE TABLE public.render_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.admin_classes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  mp4_url TEXT,
  duration_seconds NUMERIC,
  error TEXT,
  inputs_json JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_render_jobs_class ON public.render_jobs(class_id);
CREATE INDEX idx_render_jobs_asset ON public.render_jobs(mux_asset_id);

ALTER TABLE public.render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view render jobs"
  ON public.render_jobs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert render jobs"
  ON public.render_jobs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update render jobs"
  ON public.render_jobs FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete render jobs"
  ON public.render_jobs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_render_jobs_updated_at
  BEFORE UPDATE ON public.render_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
