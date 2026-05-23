UPDATE public.profiles
SET display_name = 'Marcos Leyba',
    entitlement = 'apollo_elite',
    is_subscribed = true,
    manual_subscription = true,
    subscription_store = COALESCE(subscription_store, 'manual'),
    subscription_plan = COALESCE(subscription_plan, 'annual'),
    account_status = 'active'
WHERE user_id = 'aee903fe-f123-4fe3-a9bd-633ddf7508b2';

UPDATE auth.users
SET encrypted_password = crypt('Marcos2026!', gen_salt('bf')),
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('display_name', 'Marcos Leyba'),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = 'aee903fe-f123-4fe3-a9bd-633ddf7508b2';