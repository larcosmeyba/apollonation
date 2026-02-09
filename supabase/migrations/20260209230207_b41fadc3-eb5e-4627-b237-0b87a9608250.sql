
-- Create questionnaire table for Premier/Elite client onboarding
CREATE TABLE public.client_questionnaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Personal & Physical Data
  sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
  age INTEGER NOT NULL,
  height_inches INTEGER NOT NULL,
  weight_lbs NUMERIC NOT NULL,
  activity_level TEXT NOT NULL DEFAULT 'moderate',
  
  -- Training Preferences
  workout_days_per_week INTEGER NOT NULL DEFAULT 3,
  training_methods TEXT[] NOT NULL DEFAULT '{}',
  
  -- Nutrition Preferences
  goal_next_4_weeks TEXT,
  weekly_food_budget NUMERIC,
  grocery_store TEXT,
  dietary_restrictions TEXT[] DEFAULT '{}',
  
  -- Cycle tracking
  cycle_number INTEGER NOT NULL DEFAULT 1,
  cycle_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_questionnaires ENABLE ROW LEVEL SECURITY;

-- Users can view their own questionnaires
CREATE POLICY "Users can view their own questionnaires"
ON public.client_questionnaires
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own questionnaires
CREATE POLICY "Users can insert their own questionnaires"
ON public.client_questionnaires
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own questionnaires
CREATE POLICY "Users can update their own questionnaires"
ON public.client_questionnaires
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage all questionnaires
CREATE POLICY "Admins can manage all questionnaires"
ON public.client_questionnaires
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_client_questionnaires_updated_at
BEFORE UPDATE ON public.client_questionnaires
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
