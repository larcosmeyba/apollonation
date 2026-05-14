CREATE OR REPLACE FUNCTION public.send_welcome_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  coach_id uuid := 'b1427538-a690-4cd4-8e34-423602562f4a';
BEGIN
  IF NEW.user_id = coach_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.messages (sender_id, recipient_id, content, is_read, created_at)
  VALUES (
    coach_id,
    NEW.user_id,
    E'Welcome to Apollo Nation! 👋\n\nI''m Coach Marcos and I''m genuinely excited to be working with you one-on-one. This is your direct line to me — anytime you have a question about training, nutrition, recovery, or just need a push, drop me a message right here.\n\nLet''s get to work. 💪\n\n— Coach Marcos',
    false,
    now()
  );

  RETURN NEW;
END;
$function$;