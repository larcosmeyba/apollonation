
-- Function to send a welcome message from the admin (Coach Marcos) to new users
CREATE OR REPLACE FUNCTION public.send_welcome_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find Coach Marcos (first admin user)
  SELECT user_id INTO admin_user_id
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  -- Send welcome message if admin exists and it's a different user
  IF admin_user_id IS NOT NULL AND admin_user_id != NEW.user_id THEN
    INSERT INTO public.messages (sender_id, recipient_id, content, is_read)
    VALUES (
      admin_user_id,
      NEW.user_id,
      E'Hey, welcome to Apollo Nation! \360\237\221\213\n\nI''m Coach Marcos \342\200\224 founder, coach, and your partner on this journey. I just want to take a second to personally welcome you to the family.\n\nThis isn''t just a fitness app. This is a commitment you''ve made to yourself, and I don''t take that lightly. Every plan, every meal, every workout inside here was designed with one goal in mind: to help you become the strongest, healthiest version of you.\n\nHere''s what to do next:\n\360\237\224\245 Check out your Training Plan under the Coaching tab\n\360\237\245\227 Explore your personalized Meal Plan\n\360\237\222\254 Message me anytime \342\200\224 I''m here to help\n\nYou showed up. That''s already step one. Now let''s get to work. \360\237\222\252\n\n\342\200\224 Coach Marcos\nFounder, Apollo Nation',
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger fires after a new profile row is inserted (i.e., after every new signup)
CREATE TRIGGER on_new_user_send_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_message();
