
-- Junction table to link exercises to workouts
CREATE TABLE public.workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  sets INTEGER DEFAULT 3,
  reps VARCHAR(20) DEFAULT '10',
  rest_seconds INTEGER DEFAULT 60,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workout_id, exercise_id)
);

-- Enable RLS
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- Public read access (workouts are viewable by all authenticated users)
CREATE POLICY "Authenticated users can view workout exercises"
  ON public.workout_exercises
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin-only write access
CREATE POLICY "Admins can insert workout exercises"
  ON public.workout_exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update workout exercises"
  ON public.workout_exercises
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete workout exercises"
  ON public.workout_exercises
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_workout_exercises_workout ON public.workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise ON public.workout_exercises(exercise_id);
