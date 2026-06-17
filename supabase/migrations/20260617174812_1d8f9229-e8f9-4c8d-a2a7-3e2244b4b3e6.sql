DROP POLICY IF EXISTS "temp_blueprint_upload" ON storage.objects;

INSERT INTO public.blueprints (title, description, category, pdf_path, read_time_minutes, goal_tags, is_published, sort_order) VALUES
('Start Here — Master Index', 'Your roadmap to every Apollo Reborn blueprint. Start here to choose the right guide for your goal.', 'Education', '00-start-here.pdf', 5, ARRAY['build_muscle','fat_loss','endurance','recovery','nutrition','mindset'], true, 0),
('Gain Muscle Without Getting Fat', 'The complete framework for adding lean mass while staying defined — training, calories, and progression.', 'Muscle Building', '01-gain-muscle-without-getting-fat.pdf', 15, ARRAY['build_muscle'], true, 1),
('Lose Fat, Maintain Muscle', 'How to drop body fat without losing the muscle you''ve worked hard to build.', 'Fat Loss', '02-lose-fat-maintain-muscle.pdf', 15, ARRAY['fat_loss'], true, 2),
('Build Lean Muscle, Stay Defined', 'Recomposition blueprint — build muscle and lose fat at the same time.', 'Muscle Building', '03-build-lean-muscle.pdf', 15, ARRAY['build_muscle','fat_loss'], true, 3),
('Beginner''s Guide to the Gym', 'Everything a first-timer needs: equipment, form basics, and your first 4 weeks.', 'Education', '04-beginners-guide-to-gym.pdf', 12, ARRAY['build_muscle'], true, 4),
('Women''s Guide to Building Muscle', 'Strength training for women — myths busted, programming dialed in.', 'Muscle Building', '05-womens-guide-building-muscle.pdf', 15, ARRAY['build_muscle'], true, 5),
('Men''s Guide to Building Muscle', 'Practical mass-building protocols, recovery, and nutrition for men.', 'Muscle Building', '06-mens-guide-building-muscle.pdf', 15, ARRAY['build_muscle'], true, 6),
('Break Through a Plateau', 'Stuck? Use this diagnostic to identify and smash through any sticking point.', 'Education', '07-break-through-plateau.pdf', 10, ARRAY['build_muscle','fat_loss'], true, 7),
('Understanding Macros', 'Protein, carbs, fats — what they do and how to set your numbers.', 'Nutrition', '08-understanding-macros.pdf', 12, ARRAY['fat_loss','build_muscle'], true, 8),
('Cardio Blueprint', 'Cardio that supports your goal instead of fighting it. Zone 2, HIIT, and weekly volume.', 'Cardio', '09-cardio-blueprint.pdf', 10, ARRAY['fat_loss'], true, 9),
('Recovery Blueprint', 'Sleep, mobility, stress, and deloads — the recovery system that makes results stick.', 'Recovery', '10-recovery-blueprint.pdf', 12, ARRAY['build_muscle','fat_loss','endurance','recovery','nutrition','mindset'], true, 10),
('Track Progress Correctly', 'The right metrics, the right frequency. Stop guessing if it''s working.', 'Education', '11-track-progress-correctly.pdf', 10, ARRAY['build_muscle','fat_loss'], true, 11),
('Nutrition Fundamentals', 'Foundational nutrition principles that apply to every goal and every body.', 'Nutrition', '12-nutrition-fundamentals.pdf', 15, ARRAY['build_muscle','fat_loss','endurance','recovery','nutrition','mindset'], true, 12),
('Progressive Overload Blueprint', 'The single most important training principle — how to apply it without burning out.', 'Muscle Building', '13-progressive-overload.pdf', 12, ARRAY['build_muscle'], true, 13),
('Build Your First 10 Pounds of Muscle', 'Step-by-step roadmap for new lifters chasing their first real size gain.', 'Muscle Building', '14-first-10-pounds-muscle.pdf', 15, ARRAY['build_muscle'], true, 14),
('Lose Your First 10 Pounds of Fat', 'A simple, repeatable cut to lose your first 10 lbs without crashing.', 'Fat Loss', '15-first-10-pounds-fat-loss.pdf', 15, ARRAY['fat_loss'], true, 15);