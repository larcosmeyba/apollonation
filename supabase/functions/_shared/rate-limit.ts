import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Check rate limit using the rate_limits table.
 * Returns true if the request is allowed, false if rate limited.
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
  windowMinutes: number
): Promise<boolean> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    p_identifier: identifier,
    p_action: action,
    p_max_requests: maxRequests,
    p_window_minutes: windowMinutes,
  });

  if (error) {
    console.error("[RATE-LIMIT] Error (failing CLOSED):", error.message);
    // SECURITY: fail closed — deny the request when rate-limit check fails
    // so a misbehaving rate_limits table can't be used to bypass throttling.
    return false;
  }

  return data === true;
}

export function rateLimitResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
