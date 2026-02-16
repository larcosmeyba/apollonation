
-- Rate limiting table for contact requests and AI functions
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (identifier, action, created_at DESC);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (for contact form) and authenticated users
CREATE POLICY "Anyone can insert rate limits"
  ON public.rate_limits FOR INSERT
  WITH CHECK (true);

-- Only service role can read/delete (for cleanup)
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-cleanup old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '24 hours';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cleanup_rate_limits
  AFTER INSERT ON public.rate_limits
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_rate_limits();

-- Rate check function (returns true if under limit)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_requests int,
  p_window_minutes int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count int;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM public.rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;

  IF request_count >= p_max_requests THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limits (identifier, action)
  VALUES (p_identifier, p_action);

  RETURN true;
END;
$$;
