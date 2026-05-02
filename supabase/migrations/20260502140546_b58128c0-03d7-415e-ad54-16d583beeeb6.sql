-- Create Apple reviewer test account with an expired Apollo Reborn subscription
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'applereviewer@apolloreborn.com';
  v_password text := 'ApolloReview2026!';
BEGIN
  -- Remove any prior reviewer account to keep this idempotent
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;

  -- Create the auth user (email confirmed so they can sign in immediately)
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated',
    v_email, crypt(v_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name','Apple Reviewer'),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', v_user_id::text, now(), now(), now()
  );

  -- Mark the subscription as expired so the reviewer can test the IAP renewal flow
  UPDATE public.profiles
  SET is_subscribed = false,
      subscription_plan = 'monthly',
      subscription_store = 'app_store',
      subscription_expires_at = now() - interval '2 days'
  WHERE user_id = v_user_id;
END $$;