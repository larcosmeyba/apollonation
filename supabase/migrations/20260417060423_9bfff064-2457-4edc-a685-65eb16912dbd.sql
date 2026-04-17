
-- 1. User macro targets (auto-calculated from questionnaire)
CREATE TABLE public.user_macro_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  calorie_target INTEGER NOT NULL,
  protein_grams INTEGER NOT NULL,
  carb_grams INTEGER NOT NULL,
  fat_grams INTEGER NOT NULL,
  bmr INTEGER,
  tdee INTEGER,
  goal_type TEXT NOT NULL DEFAULT 'maintenance',
  source TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_macro_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own macro targets" ON public.user_macro_targets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own macro targets" ON public.user_macro_targets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own macro targets" ON public.user_macro_targets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all macro targets" ON public.user_macro_targets
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_macro_targets_updated_at
  BEFORE UPDATE ON public.user_macro_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add difficulty rating to existing workout session logs
ALTER TABLE public.workout_session_logs
  ADD COLUMN IF NOT EXISTS difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 10);

-- 3. Smart workout recommendations
CREATE TABLE public.workout_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recommended_workout TEXT NOT NULL,
  reason TEXT NOT NULL,
  category TEXT,
  source_session_id UUID,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own recommendations" ON public.workout_recommendations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own recommendations" ON public.workout_recommendations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own recommendations" ON public.workout_recommendations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage recommendations" ON public.workout_recommendations
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_workout_recommendations_user_active
  ON public.workout_recommendations(user_id, is_dismissed, created_at DESC);

-- 4. Persistent achievements
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id TEXT NOT NULL,
  achievement_title TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_seen BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own achievements" ON public.user_achievements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own achievements" ON public.user_achievements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own achievements" ON public.user_achievements
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all achievements" ON public.user_achievements
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Food spend logs
CREATE TABLE public.food_spend_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  store_name TEXT,
  amount_spent NUMERIC(10,2) NOT NULL CHECK (amount_spent >= 0),
  spend_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.food_spend_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own spend logs" ON public.food_spend_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own spend logs" ON public.food_spend_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own spend logs" ON public.food_spend_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own spend logs" ON public.food_spend_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all spend logs" ON public.food_spend_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_food_spend_logs_user_date
  ON public.food_spend_logs(user_id, spend_date DESC);
