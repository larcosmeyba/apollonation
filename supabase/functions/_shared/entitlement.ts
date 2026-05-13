// Server-side premium entitlement guard.
// Use in any client-callable Edge Function that does paid AI work,
// to prevent free-tier users bypassing the client-side gate by invoking
// the function directly.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface EntitlementCheck {
  hasPremium: boolean;
  hasElite: boolean;
  entitlement: string | null;
  isSubscribed: boolean;
}

/**
 * Look up a user's entitlement via the service-role key (bypasses RLS so
 * we read the trusted server-side value, never the client-supplied one).
 */
export async function getEntitlement(userId: string): Promise<EntitlementCheck> {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  const { data } = await admin
    .from("profiles")
    .select("entitlement, is_subscribed")
    .eq("user_id", userId)
    .maybeSingle();

  const entitlement = (data?.entitlement ?? null) as string | null;
  const isSubscribed = data?.is_subscribed === true;
  const hasPremium =
    entitlement === "apollo_premium" ||
    entitlement === "apollo_elite" ||
    isSubscribed;
  const hasElite = entitlement === "apollo_elite";
  return { hasPremium, hasElite, entitlement, isSubscribed };
}

/** Returns a 403 Response if the user lacks premium, otherwise null. */
export async function requirePremium(
  userId: string,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const { hasPremium } = await getEntitlement(userId);
  if (hasPremium) return null;
  return new Response(
    JSON.stringify({
      error: "Premium subscription required",
      code: "premium_required",
    }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
