-- Apple Health data logs (one row per user per day)
CREATE TABLE public.health_data_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'apple_health',
  steps INTEGER,
  active_calories NUMERIC,
  resting_heart_rate NUMERIC,
  avg_workout_heart_rate NUMERIC,
  workout_count INTEGER,
  workout_duration_minutes NUMERIC,
  sleep_minutes INTEGER,
  weight_kg NUMERIC,
  raw_workouts JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date, source)
);

CREATE INDEX idx_health_data_logs_user_date ON public.health_data_logs(user_id, log_date DESC);

ALTER TABLE public.health_data_logs ENABLE ROW LEVEL SECURITY;

-- Client can fully manage own rows
CREATE POLICY "Users can view own health data"
  ON public.health_data_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health data"
  ON public.health_data_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health data"
  ON public.health_data_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health data"
  ON public.health_data_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all health data
CREATE POLICY "Admins can view all health data"
  ON public.health_data_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Assigned coaches can view their clients' health data
CREATE POLICY "Assigned coaches can view client health data"
  ON public.health_data_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_client_assignments
      WHERE coach_user_id = auth.uid()
        AND client_user_id = health_data_logs.user_id
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_health_data_logs_updated_at
BEFORE UPDATE ON public.health_data_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track Apple Health connection state per user
CREATE TABLE public.health_connection_status (
  user_id UUID NOT NULL PRIMARY KEY,
  apple_health_connected BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  permissions_granted JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_connection_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own health connection"
  ON public.health_connection_status FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view health connection"
  ON public.health_connection_status FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coaches view assigned client health connection"
  ON public.health_connection_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_client_assignments
      WHERE coach_user_id = auth.uid()
        AND client_user_id = health_connection_status.user_id
    )
  );

CREATE TRIGGER update_health_connection_status_updated_at
BEFORE UPDATE ON public.health_connection_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();