-- Backfill: assign every existing non-admin client to the default coach
INSERT INTO public.coach_client_assignments (coach_user_id, client_user_id)
SELECT 'b1427538-a690-4cd4-8e34-423602562f4a'::uuid, p.user_id
FROM public.profiles p
WHERE p.user_id <> 'b1427538-a690-4cd4-8e34-423602562f4a'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = p.user_id AND r.role = 'admin'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.coach_client_assignments a
    WHERE a.client_user_id = p.user_id
      AND a.coach_user_id = 'b1427538-a690-4cd4-8e34-423602562f4a'::uuid
  );