CREATE TABLE IF NOT EXISTS public.message_email_state (
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  last_email_sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);

ALTER TABLE public.message_email_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_message_email_state"
ON public.message_email_state
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');