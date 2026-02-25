
-- Admin can view all macro_logs
CREATE POLICY "Admins can view all macro logs"
  ON public.macro_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can view all step_logs
CREATE POLICY "Admins can view all step logs"
  ON public.step_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
