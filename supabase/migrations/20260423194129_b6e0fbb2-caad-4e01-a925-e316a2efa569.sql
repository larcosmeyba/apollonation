-- 1. Test account flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;

-- 2. Contact request categories
ALTER TABLE public.contact_requests ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- 3. Bug report triage (support_tickets reused as bug reports)
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS triage_status text NOT NULL DEFAULT 'new';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS admin_replied_at timestamp with time zone;

-- 4. Coach profile expansion (stored on profiles for the admin user)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS long_bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS certifications text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialties text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_coaching integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hero_image_url text;

-- 5. Workout library hygiene (matches client-side filters)
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;