ALTER TABLE public.training_plan_exercises ADD COLUMN IF NOT EXISTS target_reps_min integer, ADD COLUMN IF NOT EXISTS target_reps_max integer, ADD COLUMN IF NOT EXISTS progression_cue text;

WITH exercise_norms AS (
  SELECT id, name, mux_playback_id, REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(name), 'barbell\\s+', '', 'g'), 'dumbbell\\s+', '', 'g'), 'cable\\s+', '', 'g'), 'machine\\s+', '', 'g') AS norm_name FROM admin_exercises WHERE mux_playback_id IS NOT NULL
),
plan_norms AS (
  SELECT id, exercise_name, REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(exercise_name), 'barbell\\s+', '', 'g'), 'dumbbell\\s+', '', 'g'), 'cable\\s+', '', 'g'), 'machine\\s+', '', 'g') AS norm_name FROM training_plan_exercises WHERE exercise_id IS NULL OR mux_playback_id IS NULL
),
matches AS (
  SELECT p.id AS plan_exercise_id, e.id AS matched_exercise_id, e.mux_playback_id AS matched_mux_playback_id, ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY CASE WHEN LOWER(p.exercise_name) = LOWER(e.name) THEN 0 ELSE 1 END, CASE WHEN p.norm_name = e.norm_name THEN 0 ELSE 1 END, CASE WHEN LOWER(e.name) LIKE '%' || LOWER(p.exercise_name) || '%' THEN 0 ELSE 1 END, CASE WHEN LOWER(p.exercise_name) LIKE '%' || LOWER(e.name) || '%' THEN 0 ELSE 1 END) AS rn FROM plan_norms p JOIN exercise_norms e ON (LOWER(p.exercise_name) = LOWER(e.name) OR p.norm_name = e.norm_name OR LOWER(e.name) LIKE '%' || LOWER(p.exercise_name) || '%' OR LOWER(p.exercise_name) LIKE '%' || LOWER(e.name) || '%')
)
UPDATE training_plan_exercises t SET exercise_id = m.matched_exercise_id, mux_playback_id = m.matched_mux_playback_id FROM matches m WHERE t.id = m.plan_exercise_id AND m.rn = 1 AND (t.exercise_id IS NULL OR t.mux_playback_id IS NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_plan_exercises TO authenticated; GRANT ALL ON public.training_plan_exercises TO service_role;