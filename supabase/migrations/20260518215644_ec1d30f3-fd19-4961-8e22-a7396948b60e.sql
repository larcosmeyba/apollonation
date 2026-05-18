CREATE TABLE public.workout_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view categories"
  ON public.workout_categories FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Public can view categories"
  ON public.workout_categories FOR SELECT
  TO anon USING (true);

CREATE POLICY "Admins manage categories"
  ON public.workout_categories FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_workout_categories_updated
  BEFORE UPDATE ON public.workout_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.workout_categories (slug, name, sort_order) VALUES
  ('strength', 'Strength', 1),
  ('sculpt',   'Sculpt',   2),
  ('hiit',     'HIIT',     3),
  ('cardio',   'Cardio',   4),
  ('core',     'Core',     5),
  ('stretch',  'Stretch',  6);