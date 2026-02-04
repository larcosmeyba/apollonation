-- Create a separate secure table for sensitive contact info
CREATE TABLE public.secure_contact_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  phone_encrypted text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.secure_contact_info ENABLE ROW LEVEL SECURITY;

-- Only users can see/manage their own contact info
CREATE POLICY "Users can view their own contact info"
ON public.secure_contact_info FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact info"
ON public.secure_contact_info FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact info"
ON public.secure_contact_info FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact info"
ON public.secure_contact_info FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- NO admin SELECT policy - admins must use a dedicated edge function to access

-- Add trigger for updated_at
CREATE TRIGGER update_secure_contact_info_updated_at
BEFORE UPDATE ON public.secure_contact_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing phone data (if any)
INSERT INTO public.secure_contact_info (user_id, phone_encrypted)
SELECT user_id, phone FROM public.profiles WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Remove phone column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;