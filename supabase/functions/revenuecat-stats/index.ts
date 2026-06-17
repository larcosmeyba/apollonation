import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth: only admins
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);
    const { data: roleRow } = await supabase
      .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleRow) return json({ error: 'forbidden' }, 403);

    // Compute stats from local DB (RevenueCat sync writes to profiles via webhook).
    // This avoids depending on RevenueCat Charts API scope which often isn't granted on the secret API key.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: subs } = await admin
      .from('profiles')
      .select('user_id, is_subscribed, subscription_plan, subscription_expires_at, entitlement, account_status, is_test_account, created_at')
      .eq('is_test_account', false);

    const rows = subs ?? [];
    const now = Date.now();
    const active = rows.filter(r => r.is_subscribed && (!r.subscription_expires_at || new Date(r.subscription_expires_at).getTime() > now));
    const trial = rows.filter(r => r.entitlement === 'trial' || r.subscription_plan === 'trial');
    const canceled = rows.filter(r => r.account_status === 'cancelled' || r.account_status === 'archived' || (r.subscription_expires_at && new Date(r.subscription_expires_at).getTime() < now && r.is_subscribed === false));

    // Rough MRR — uses monthly price for monthly, annual/12 for annual. Prices in USD; admin can override later.
    const MONTHLY_PRICE = 29.99;
    const ANNUAL_PRICE = 249.99;
    let mrr = 0;
    for (const r of active) {
      if (r.subscription_plan === 'annual') mrr += ANNUAL_PRICE / 12;
      else mrr += MONTHLY_PRICE;
    }

    return json({
      active_members: active.length,
      trial_users: trial.length,
      cancellations: canceled.length,
      mrr: Math.round(mrr * 100) / 100,
      source: 'local_db',
    });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
