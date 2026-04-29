-- Auto-assign Coach Marcos to every new client profile
CREATE OR REPLACE FUNCTION public.auto_assign_default_coach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_coach_id uuid := 'b1427538-a690-4cd4-8e34-423602562f4a';
BEGIN
  -- Don't assign coach to admins or to the coach himself
  IF NEW.user_id = default_coach_id THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.coach_client_assignments (coach_user_id, client_user_id)
  VALUES (default_coach_id, NEW.user_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_assign_default_coach_trigger ON public.profiles;
CREATE TRIGGER auto_assign_default_coach_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_default_coach();