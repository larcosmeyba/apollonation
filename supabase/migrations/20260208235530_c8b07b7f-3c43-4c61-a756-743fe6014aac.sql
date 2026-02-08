
-- Create contact requests table
CREATE TABLE public.contact_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_contact TEXT NOT NULL DEFAULT 'email',
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a request (no auth required)
CREATE POLICY "Anyone can submit a contact request"
ON public.contact_requests
FOR INSERT
WITH CHECK (true);

-- Only admins can view requests
CREATE POLICY "Admins can view contact requests"
ON public.contact_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update requests (mark as read)
CREATE POLICY "Admins can update contact requests"
ON public.contact_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete requests
CREATE POLICY "Admins can delete contact requests"
ON public.contact_requests
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
