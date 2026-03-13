
-- Create body_metrics table for tracking client body composition over time
CREATE TABLE public.body_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  body_weight_lbs numeric NULL,
  body_fat_pct numeric NULL,
  muscle_mass_lbs numeric NULL,
  bone_density numeric NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage all body metrics"
ON public.body_metrics FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own metrics
CREATE POLICY "Users can view own body metrics"
ON public.body_metrics FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
