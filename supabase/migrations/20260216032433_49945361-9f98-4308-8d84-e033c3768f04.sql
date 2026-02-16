
CREATE TABLE public.step_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);

ALTER TABLE public.step_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own step logs" ON public.step_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own step logs" ON public.step_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own step logs" ON public.step_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own step logs" ON public.step_logs FOR DELETE USING (auth.uid() = user_id);
