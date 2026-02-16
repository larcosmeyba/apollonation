
-- Table to log individual sets per exercise
CREATE TABLE public.exercise_set_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  training_plan_exercise_id UUID NOT NULL REFERENCES public.training_plan_exercises(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES public.training_plan_days(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight NUMERIC DEFAULT NULL,
  reps_completed INTEGER DEFAULT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to track workout session completion + user notes
CREATE TABLE public.workout_session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_id UUID NOT NULL REFERENCES public.training_plan_days(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_id, log_date)
);

-- Table for per-exercise user notes (personal notes, not coach notes)
CREATE TABLE public.exercise_user_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  training_plan_exercise_id UUID NOT NULL REFERENCES public.training_plan_exercises(id) ON DELETE CASCADE,
  day_id UUID NOT NULL REFERENCES public.training_plan_days(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT NOT NULL DEFAULT '',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, training_plan_exercise_id, log_date)
);

-- Enable RLS
ALTER TABLE public.exercise_set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_user_notes ENABLE ROW LEVEL SECURITY;

-- RLS for exercise_set_logs
CREATE POLICY "Users can view their own set logs" ON public.exercise_set_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own set logs" ON public.exercise_set_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own set logs" ON public.exercise_set_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own set logs" ON public.exercise_set_logs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all set logs" ON public.exercise_set_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS for workout_session_logs
CREATE POLICY "Users can view their own session logs" ON public.workout_session_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own session logs" ON public.workout_session_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own session logs" ON public.workout_session_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own session logs" ON public.workout_session_logs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all session logs" ON public.workout_session_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS for exercise_user_notes
CREATE POLICY "Users can view their own exercise notes" ON public.exercise_user_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own exercise notes" ON public.exercise_user_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercise notes" ON public.exercise_user_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercise notes" ON public.exercise_user_notes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all exercise notes" ON public.exercise_user_notes FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_exercise_set_logs_user_date ON public.exercise_set_logs(user_id, log_date);
CREATE INDEX idx_workout_session_logs_user_date ON public.workout_session_logs(user_id, log_date);
CREATE INDEX idx_exercise_user_notes_user_date ON public.exercise_user_notes(user_id, log_date);

-- Trigger for updated_at on exercise_user_notes
CREATE TRIGGER update_exercise_user_notes_updated_at
  BEFORE UPDATE ON public.exercise_user_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
