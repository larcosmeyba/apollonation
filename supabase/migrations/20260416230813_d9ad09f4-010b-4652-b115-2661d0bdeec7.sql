-- Create public storage bucket for recipe photos extracted from PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Recipe images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

-- Admins can upload recipe images
CREATE POLICY "Admins can upload recipe images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recipe-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can update recipe images
CREATE POLICY "Admins can update recipe images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'recipe-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete recipe images
CREATE POLICY "Admins can delete recipe images"
ON storage.objects FOR DELETE
USING (bucket_id = 'recipe-images' AND has_role(auth.uid(), 'admin'::app_role));