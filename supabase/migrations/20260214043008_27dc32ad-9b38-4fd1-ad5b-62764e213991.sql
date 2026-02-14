
-- Add scheduled_date to training_plan_days for calendar rescheduling
ALTER TABLE public.training_plan_days 
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Add a welcome_seen flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_seen BOOLEAN NOT NULL DEFAULT false;

-- Update RLS policy for profiles to allow users to update welcome_seen
-- (existing policies should already cover this since users can update their own profile)
