CREATE TABLE public.openai_request_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature_area text NOT NULL,
  assistant_mode text,
  model text,
  request_tokens integer,
  response_tokens integer,
  estimated_cost numeric(10,6),
  status text NOT NULL DEFAULT 'ok',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX openai_request_logs_user_id_created_at_idx
  ON public.openai_request_logs (user_id, created_at DESC);
CREATE INDEX openai_request_logs_feature_area_idx
  ON public.openai_request_logs (feature_area);

GRANT SELECT ON public.openai_request_logs TO authenticated;
GRANT ALL ON public.openai_request_logs TO service_role;

ALTER TABLE public.openai_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own openai logs"
  ON public.openai_request_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all openai logs"
  ON public.openai_request_logs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));