
-- 1) Backfill admin_exercises.equipment from name patterns
UPDATE public.admin_exercises
SET equipment = CASE
  WHEN name ILIKE 'barbell %' OR name ILIKE '% barbell %' THEN ARRAY['Barbell']
  WHEN name ILIKE 'smith %' THEN ARRAY['Smith Machine']
  WHEN name ILIKE 'kettlebell %' OR name ILIKE 'kb %' THEN ARRAY['Kettlebell']
  WHEN name ILIKE 'dumbbell %' OR name ILIKE 'db %' OR name ILIKE '% dumbbell %' THEN ARRAY['Dumbbell']
  WHEN name ILIKE 'cable %' OR name ILIKE '% cable %' THEN ARRAY['Cable']
  WHEN name ILIKE '%machine%' THEN ARRAY['Machine']
  WHEN name ILIKE 'trx %' OR name ILIKE '%suspension%' THEN ARRAY['TRX']
  WHEN name ILIKE 'band %' OR name ILIKE '% band %' OR name ILIKE '%resistance band%' THEN ARRAY['Band']
  WHEN name ILIKE 'block %' OR name ILIKE 'bodyweight %' OR name ILIKE '%plank%' OR name ILIKE '%stretch%' OR name ILIKE '%push up%' OR name ILIKE '%pushup%' OR name ILIKE '%pull up%' OR name ILIKE '%pullup%' OR name ILIKE '%mountain climber%' OR name ILIKE '%burpee%' OR name ILIKE '%bridge%' OR name ILIKE '%lunge%' THEN ARRAY['Bodyweight']
  ELSE ARRAY['Bodyweight']
END
WHERE equipment IS NULL OR array_length(equipment, 1) IS NULL;

-- 2) Bump existing non-warmup slots to make room for Primary at slot_order = 1
UPDATE public.session_blueprint_slots
SET slot_order = slot_order + 10
WHERE blueprint_id IN (
  '8aac5be7-019c-48a5-be04-eccf63c0a8fc', -- at_home_beginner Full Body
  '88eaf73c-df4b-4d7d-a5e0-bfac071af1eb', -- at_home_fat_loss Circuit + Cardio
  '9e9f54bd-f29c-422f-8d8e-a2462623e491', -- at_home_strength Lower
  '7b42d251-d3c5-4001-a21e-efc99562937a', -- at_home_strength Upper
  '7df00a0e-177e-4336-b2ed-b7ddfa47122d'  -- gym_fat_loss Full-Body Circuit
) AND slot_order >= 1;

-- 3) Insert Primary slot for each missing blueprint
INSERT INTO public.session_blueprint_slots
  (blueprint_id, slot_order, block, role, movement_pattern, body_part_filter, equipment_filter, sets, reps_or_time, rest)
VALUES
  ('8aac5be7-019c-48a5-be04-eccf63c0a8fc', 1, 'Primary', 'Lower compound', 'Squat',          'Glutes / Quads', 'Dumbbell / Bodyweight', '3', '8–10',  '90 sec'),
  ('88eaf73c-df4b-4d7d-a5e0-bfac071af1eb', 1, 'Primary', 'Full-body compound', 'Squat',     'FullBody',       'Dumbbell',              '3', '8–10',  '90 sec'),
  ('9e9f54bd-f29c-422f-8d8e-a2462623e491', 1, 'Primary', 'Lower compound', 'Squat',          'Glutes / Quads', 'Dumbbell',              '4', '6–8',   '2 min'),
  ('7b42d251-d3c5-4001-a21e-efc99562937a', 1, 'Primary', 'Upper compound', 'Horizontal Push','Chest',          'Dumbbell',              '4', '6–8',   '2 min'),
  ('7df00a0e-177e-4336-b2ed-b7ddfa47122d', 1, 'Primary', 'Full-body compound', 'Squat',     'FullBody',       'Barbell / Dumbbell',    '4', '6–8',   '90 sec');
