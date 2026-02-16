
-- Replace the overly permissive INSERT policy with an IP-based one that still allows anonymous inserts
-- but uses the rate_limit function for protection
DROP POLICY "Anyone can insert rate limits" ON public.rate_limits;

-- Rate limits should only be insertable via the check_rate_limit function (SECURITY DEFINER)
-- No direct insert needed from clients
