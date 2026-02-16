
-- Add account status to profiles for freeze/archive capability
ALTER TABLE public.profiles 
ADD COLUMN account_status text NOT NULL DEFAULT 'active' 
CHECK (account_status IN ('active', 'frozen', 'archived'));

-- Add index for quick filtering
CREATE INDEX idx_profiles_account_status ON public.profiles(account_status);

-- Add archived_at timestamp to track when account was archived
ALTER TABLE public.profiles 
ADD COLUMN status_changed_at timestamp with time zone;
