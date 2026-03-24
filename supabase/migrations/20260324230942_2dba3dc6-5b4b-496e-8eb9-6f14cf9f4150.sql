
-- Fix overly permissive INSERT policies
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY "System can insert referral tracking" ON public.referral_tracking;
CREATE POLICY "Admins can insert referral tracking" ON public.referral_tracking
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR auth.uid() = referred_user_id);
