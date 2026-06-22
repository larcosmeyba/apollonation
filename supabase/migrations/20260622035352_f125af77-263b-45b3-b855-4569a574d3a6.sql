ALTER TABLE public.render_jobs
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS render_engine text NOT NULL DEFAULT 'mux';