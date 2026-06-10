
-- Backfill Crunches/Core (only orphan with no name-twin already in DB)
UPDATE public.admin_exercises SET
  name='Crunches',
  exercise_code='GYM_Crunches_Core',
  location_type='gym',
  body_part='Core',
  movement_pattern='isolation',
  difficulty='beginner',
  equipment=ARRAY['mat']::text[],
  primary_muscle='Rectus Abdominis',
  is_warmup=false, is_cooldown=false, is_recovery=false,
  category='strength',
  updated_at=now()
WHERE id='f8af25c2-678e-48e7-acc5-50478b98a255';

-- Delete the 14 orphans that duplicate already-fully-populated named rows
DELETE FROM public.admin_exercises WHERE id IN (
  '5cfcae72-2d2d-41df-a35b-aa68cc8c7eb3', -- Leg Raises (dup of HOME_STRENGTH_Leg_Raises_Core)
  '49dc9cf9-4d1d-4109-b103-80c65483e14e', -- Windshield Wipers (dup of RECOVERY_Windshield_Wipers_Core)
  'cd7d0e18-347e-417d-b96f-6d0d461dca22', -- Side Plank w/ Rotation (dup)
  '4945577a-965e-447e-b1fc-8064614246e8', -- Figure Four Stretch (dup)
  '6f9acaa6-95a4-42fa-9a6f-6467108c2c0b', -- Bicycle Crunch (dup)
  '9f129b22-3a62-4f8c-876f-c591d9c4a678', -- Jump Squats (dup)
  '71a7ce43-1538-4650-8081-ce03bf758548', -- Pike (dup)
  'c173278b-ff7e-4a32-a344-f091eb59c0b0', -- Child's Pose (dup)
  '0c8b833e-9f67-46f1-abc8-375288d0d7cc', -- Russian Twist (dup)
  '57864b53-8de5-4ff6-8e67-a5d234b6e4f7', -- Bodyweight Squats (dup)
  '8610dbed-7fc6-4355-9f2a-2f7ce2fc9ff3', -- Sumo Squat (dup)
  'ead396c3-ff45-478b-b1f1-8456c5939c0b', -- World's Greatest Stretch (dup)
  'a6b5a8eb-0875-41d4-9d5c-ab01e124fca2', -- Hollow Hold (dup)
  '78a55df0-0739-4a90-bde4-226413704396'  -- Thread The Needle (dup)
);

-- Drop empty legacy programs table (0 rows). program_workouts FK depends on it.
DROP TABLE IF EXISTS public.program_workouts CASCADE;
DROP TABLE IF EXISTS public.programs CASCADE;
