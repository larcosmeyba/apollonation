SET LOCAL session_replication_role = replica;
UPDATE public.profiles
SET entitlement = 'apollo_elite',
    is_subscribed = true,
    manual_subscription = true,
    account_status = 'active',
    subscription_store = 'manual'
WHERE user_id IN (
  'aee903fe-f123-4fe3-a9bd-633ddf7508b2',
  'bc560e7c-a691-4ce7-b614-8c2b678aa536',
  '89cc8584-9107-406e-a925-dd782fea543c'
);