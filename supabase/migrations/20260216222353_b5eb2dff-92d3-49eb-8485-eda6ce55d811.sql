-- Update message notification trigger to use extensions.net
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(NEW.sender_id, 'admin') THEN
    PERFORM extensions.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/send-message-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
      ),
      body := jsonb_build_object(
        'recipientId', NEW.recipient_id::text,
        'senderId', NEW.sender_id::text,
        'fromTrigger', true
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Update signup notification trigger to use extensions.net
CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/notify-new-signup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
    ),
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'user_id', NEW.user_id,
        'display_name', NEW.display_name
      )
    )
  );
  RETURN NEW;
END;
$$;