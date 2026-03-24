
-- Challenges table
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  duration_days integer NOT NULL DEFAULT 30,
  category text NOT NULL DEFAULT 'general',
  cover_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges" ON public.challenges FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage challenges" ON public.challenges FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Challenge enrollments
CREATE TABLE public.challenge_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  completed_at timestamptz,
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE public.challenge_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments" ON public.challenge_enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll" ON public.challenge_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enrollments" ON public.challenge_enrollments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all enrollments" ON public.challenge_enrollments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Challenge check-ins
CREATE TABLE public.challenge_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  workout_completed boolean DEFAULT false,
  nutrition_logged boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id, checkin_date)
);

ALTER TABLE public.challenge_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.challenge_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkins" ON public.challenge_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins" ON public.challenge_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all checkins" ON public.challenge_checkins FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
