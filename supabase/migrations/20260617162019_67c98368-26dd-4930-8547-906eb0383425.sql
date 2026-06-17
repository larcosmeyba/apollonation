CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Training',
  author text NOT NULL DEFAULT 'Coach Marcos',
  cover_url text,
  read_minutes integer NOT NULL DEFAULT 5,
  content text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  published_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published blog posts"
  ON public.blog_posts FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert blog posts"
  ON public.blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blog posts"
  ON public.blog_posts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blog posts"
  ON public.blog_posts FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.blog_posts (slug, title, description, category, author, read_minutes, content, published, published_at) VALUES
('build-muscle-after-40','How to Build Muscle After 40 (Without Wrecking Your Joints)','A practical, science-backed framework for adding lean mass in your 40s and beyond — with smarter training, recovery, and nutrition.','Training','Coach Marcos',7,
'<p>Building muscle after 40 isn''t about training harder — it''s about training smarter. Recovery windows shrink, joints get pickier, and the margin for error gets thin. Here''s the framework I use with my Apollo Reborn clients.</p><h2>1. Train for tension, not destruction</h2><p>Lower the ego, raise the standard. Three to four hard working sets per muscle, 6–12 reps, controlled tempo. You don''t need 20 sets to grow — you need 20 quality sets per week.</p><h2>2. Prioritise protein, sleep, and steps</h2><p>1g of protein per pound of bodyweight, 7+ hours of sleep, and 8–10k daily steps. Without those three, hypertrophy stalls. With them, even an average program works.</p><h2>3. Rotate stimuli every 4–6 weeks</h2><p>Joint-friendly variations (DB press, neutral-grip rows, hack squats) let you push hard without breaking down. Periodise. Recover. Repeat.</p><blockquote>"Consistency beats intensity. Always."</blockquote>',
true,'2026-05-01'),
('nutrition-for-fat-loss','The Only Nutrition Plan You Need for Sustainable Fat Loss','Forget extreme cuts. Here''s how to lose fat, keep your strength, and never feel like you''re starving.','Nutrition','Coach Marcos',6,
'<p>Most fat loss plans fail because they''re built around restriction. Apollo Reborn flips it: build the plan around the foods you actually eat, then engineer the deficit.</p><h2>Step 1 — Set a small deficit (15–20%)</h2><p>Aggressive cuts kill muscle, mood, and adherence. A modest deficit lets you train hard and stay consistent for months, not days.</p><h2>Step 2 — Anchor every meal with protein</h2><p>30–50g of protein per meal keeps you full and protects lean mass. Hit this and the rest of the plan gets easy.</p><h2>Step 3 — Track for 2 weeks, then auto-pilot</h2><p>You don''t need to log forever. Two weeks of tracking teaches you portions and macros for life.</p>',
true,'2026-04-22'),
('mindset-of-elite-athletes','The Mindset Habits of Elite Athletes (That You Can Steal)','What separates the top 1% isn''t talent — it''s a small set of mental habits that compound over time.','Mindset','Coach Marcos',5,
'<p>I''ve coached weekend warriors and pro athletes. The single biggest difference isn''t genetics — it''s how they think between sessions.</p><h2>1. They show up on bad days</h2><p>Motivation is a liar. Identity is the truth. "I''m someone who trains" beats "I feel like training" every time.</p><h2>2. They keep the standard, not the streak</h2><p>Miss a day? Fine. Miss the standard? Never. The goal is the average, not the perfect week.</p><h2>3. They review weekly</h2><p>Five minutes every Sunday: what worked, what didn''t, what''s next. That''s it. That''s the whole secret.</p>',
true,'2026-04-10'),
('recovery-protocols-that-actually-work','Recovery Protocols That Actually Work (And the Ones That Don''t)','Cold plunges, saunas, foam rollers — what''s worth your time and what''s marketing fluff.','Recovery','Coach Marcos',6,
'<p>Recovery is where the gains actually happen. But most "recovery tools" are 5% of the result. Here''s the honest tier list.</p><h2>S-Tier: Sleep, protein, walking</h2><p>Boring. Free. Unbeatable. If these aren''t dialled in, nothing else matters.</p><h2>A-Tier: Sauna, mobility work, deload weeks</h2><p>Real, measurable benefits — especially the deload. Take a lighter week every 4–6 weeks. Your joints will thank you.</p><h2>B-Tier: Cold plunges, massage guns</h2><p>Useful for how you feel. Marginal for actual recovery. Use them — don''t depend on them.</p>',
true,'2026-03-28')
ON CONFLICT (slug) DO NOTHING;