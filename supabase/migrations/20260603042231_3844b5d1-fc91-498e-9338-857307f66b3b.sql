-- Lock Realtime broadcast/presence channels so any authenticated user cannot
-- subscribe to arbitrary channels and receive other users' private messages.
-- Postgres-changes subscriptions still go through RLS on the underlying
-- public.messages table, so direct DB changes remain protected.

-- Default-deny on broadcasts: only the service role may emit/receive broadcast or presence.
DO $$
BEGIN
  -- Drop any existing permissive policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'realtime.messages'::regclass
  ) THEN
    EXECUTE (
      SELECT string_agg(format('DROP POLICY IF EXISTS %I ON realtime.messages;', polname), E'\n')
      FROM pg_policy WHERE polrelid = 'realtime.messages'::regclass
    );
  END IF;
END$$;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users may NOT broadcast or subscribe to arbitrary channels.
-- (No permissive policy created => default deny for authenticated/anon.)
-- Service role bypasses RLS, so server-side fan-out still works.

CREATE POLICY "Deny all realtime channel access to clients"
ON realtime.messages
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
