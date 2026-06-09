
-- Phase 2: meal plan generator v2 metadata + fallback logging

ALTER TABLE public.nutrition_plans
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gap_reason text,
  ADD COLUMN IF NOT EXISTS generator_version text NOT NULL DEFAULT 'v1';

CREATE TABLE IF NOT EXISTS public.meal_plan_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.nutrition_plans(id) ON DELETE SET NULL,
  generator_version text NOT NULL,
  status text NOT NULL,                -- 'success' | 'partial' | 'fallback' | 'error'
  needs_review boolean NOT NULL DEFAULT false,
  gap_reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meal_plan_generation_log TO authenticated;
GRANT ALL ON public.meal_plan_generation_log TO service_role;

ALTER TABLE public.meal_plan_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own meal plan generation log"
  ON public.meal_plan_generation_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_mp_gen_log_user ON public.meal_plan_generation_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_gen_log_review ON public.meal_plan_generation_log(needs_review) WHERE needs_review;
