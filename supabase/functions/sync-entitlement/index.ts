// Client-callable function: queries RevenueCat REST API for the caller's
// current entitlement and writes it to profiles. Used at app launch and after
// a purchase to make the DB state authoritative without waiting for a webhook.
//
// Respects the manual_subscription guard.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const tail = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SYNC-ENTITLEMENT] ${step}${tail}`);
};

const ENTITLEMENT_ID = "premium";

const mapPlan = (productId: string | undefined): "monthly" | "annual" | null => {
  if (!productId) return null;
  const env = Deno.env;
  const ids = {
    monthlyIos: env.get("PRODUCT_ID_MONTHLY_IOS"),
    annualIos: env.get("PRODUCT_ID_ANNUAL_IOS"),
    monthlyAndroid: env.get("PRODUCT_ID_MONTHLY_ANDROID"),
    annualAndroid: env.get("PRODUCT_ID_ANNUAL_ANDROID"),
  };
  if (productId === ids.monthlyIos || productId === ids.monthlyAndroid) return "monthly";
  if (productId === ids.annualIos || productId === ids.annualAndroid) return "annual";
  const lower = productId.toLowerCase();
  if (lower.includes("annual") || lower.includes("year")) return "annual";
  if (lower.includes("month")) return "monthly";
  return null;
};

const mapStore = (store: string | undefined): "app_store" | "play_store" | null => {
  if (!store) return null;
  const s = store.toUpperCase();
  if (s === "APP_STORE" || s === "MAC_APP_STORE") return "app_store";
  if (s === "PLAY_STORE") return "play_store";
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller via getClaims (signing-keys friendly)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;
    log("Authenticated", { userId });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, manual_subscription, revenuecat_app_user_id, is_subscribed, subscription_plan, subscription_store, subscription_expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Manual grants are authoritative — return as-is.
    if (profile.manual_subscription) {
      log("Manual subscription, returning current state");
      return new Response(
        JSON.stringify({
          isSubscribed: profile.is_subscribed,
          plan: profile.subscription_plan,
          source: profile.subscription_store,
          expiresAt: profile.subscription_expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rcKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");
    if (!rcKey) {
      log("ERROR", "REVENUECAT_SECRET_API_KEY missing");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUserId = profile.revenuecat_app_user_id ?? userId;
    const rcRes = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { Authorization: `Bearer ${rcKey}` },
    });

    if (!rcRes.ok) {
      const text = await rcRes.text();
      log("RC API error", { status: rcRes.status, body: text.slice(0, 200) });
      return new Response(JSON.stringify({ error: "RevenueCat fetch failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rcData = await rcRes.json();
    const entitlement = rcData?.subscriber?.entitlements?.[ENTITLEMENT_ID];
    const subscriptions = rcData?.subscriber?.subscriptions ?? {};

    const expiresMs = entitlement?.expires_date ? new Date(entitlement.expires_date).getTime() : null;
    const isSubscribed = !!entitlement && (expiresMs === null || expiresMs > Date.now());

    let plan: "monthly" | "annual" | null = null;
    let store: "app_store" | "play_store" | null = null;
    let expiresAt: string | null = null;

    if (entitlement?.product_identifier) {
      plan = mapPlan(entitlement.product_identifier);
      const sub = subscriptions[entitlement.product_identifier];
      store = mapStore(sub?.store);
      expiresAt = entitlement.expires_date ?? null;
    }

    const update: Record<string, unknown> = { is_subscribed: isSubscribed };
    if (plan) update.subscription_plan = plan;
    if (store) update.subscription_store = store;
    if (expiresAt) update.subscription_expires_at = expiresAt;
    if (!profile.revenuecat_app_user_id) update.revenuecat_app_user_id = appUserId;

    const { error: updateError } = await supabase
      .from("profiles")
      .update(update)
      .eq("user_id", userId);

    if (updateError) {
      log("Update failed", updateError.message);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Synced", { isSubscribed, plan, store });
    return new Response(
      JSON.stringify({ isSubscribed, plan, source: store, expiresAt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
