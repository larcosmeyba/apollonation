ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status = ANY (ARRAY['active'::text, 'frozen'::text, 'cancelled'::text, 'archived'::text]));