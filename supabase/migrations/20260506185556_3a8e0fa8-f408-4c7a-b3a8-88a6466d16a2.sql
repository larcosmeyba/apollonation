INSERT INTO public.admin_exercises (id, name, source_video_url, loop_in_seconds, loop_out_seconds, muscle_group, equipment, difficulty, movement_type, created_by)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'TEST: Mux Render Smoke Clip',
  'https://zbwwbavqlbxgcfsfacwp.supabase.co/storage/v1/object/sign/exercise-videos/workout-7d8b21dc-edc7-4878-b7c8-0a8e7c3980fe.mov?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yOTk5NjZmOC1iZDU4LTQ5ZmUtYWIzNy02ODA5NmFlZWY5NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJleGVyY2lzZS12aWRlb3Mvd29ya291dC03ZDhiMjFkYy1lZGM3LTQ4NzgtYjdjOC0wYThlN2MzOTgwZmUubW92IiwiaWF0IjoxNzc4MDkzNTgwLCJleHAiOjE3NzgxNzk5ODB9.ZcHQcWmOKwJxbj3sbuZj8-NSoybURo6I135f7gDQJjU',
  0, 4, 'full_body', '{}'::text[], 'beginner', 'compound',
  'b1427538-a690-4cd4-8e34-423602562f4a'
) ON CONFLICT (id) DO UPDATE SET source_video_url = EXCLUDED.source_video_url;

INSERT INTO public.admin_classes (id, title, description, duration_minutes, class_type, status, created_by)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'TEST: Mux Render Smoke Class',
  'Auto-seeded for end-to-end Mux pipeline validation',
  1, 'strength', 'draft',
  'b1427538-a690-4cd4-8e34-423602562f4a'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_class_blocks (id, class_id, sort_order, kind, exercise_id, work_seconds, rest_seconds, sets, set_rest_seconds)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  0, 'exercise',
  '11111111-1111-1111-1111-111111111111',
  8, 0, 1, 0
) ON CONFLICT (id) DO NOTHING;