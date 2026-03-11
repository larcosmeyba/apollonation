
-- Marketing photos library (coach stock photos)
CREATE TABLE public.marketing_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  category text NOT NULL DEFAULT 'personal',
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all marketing photos"
  ON public.marketing_photos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Generated marketing posts
CREATE TABLE public.marketing_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT 'instagram',
  width integer NOT NULL DEFAULT 1080,
  height integer NOT NULL DEFAULT 1080,
  headline text,
  subheadline text,
  cta_text text,
  source_photo_id uuid REFERENCES public.marketing_photos(id) ON DELETE SET NULL,
  generated_image_path text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all marketing posts"
  ON public.marketing_posts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for marketing assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing', 'marketing', true);

-- Storage policies for marketing bucket
CREATE POLICY "Admins can upload marketing files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'marketing' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update marketing files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'marketing' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete marketing files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'marketing' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view marketing files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'marketing');
