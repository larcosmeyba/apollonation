// RevenueCat webhook receiver. Source of truth for subscription state.
//
// Auth: requires `Authorization: Bearer ${REVENUECAT_WEBHOOK_AUTH}` header.
//   Configure the same shared secret in RevenueCat → Project → Webhooks.
//
// CRITICAL GUARD: profiles.manual_subscription = true means an admin granted
// access. Never overwrite is_subscribed / expires_at for those users.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const tail = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[REVENUECAT-WEBHOOK] ${step}${tail}`);
};

type RcEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "PRODUCT_CHANGE"
  | "CANCELLATION"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "REFUND"
  | "TRANSFER"
  | "UNCANCELLATION"
  | "SUBSCRIBER_ALIAS"
  | "NON_RENEWING_PURCHASE";

interface RcEvent {
  type: RcEventType;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  store?: string;
  expiration_at_ms?: number;
  event_timestamp_ms?: number;
  cancel_reason?: string;
  new_product_id?: string;
}

const ACTIVATING: RcEventType[] = [
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "TRANSFER",
  "UNCANCELLATION",
];

const REVOKING: RcEventType[] = ["EXPIRATION", "REFUND"];

const mapStore = (store: string | undefined): "app_store" | "play_store" | null => {
  if (!store) return null;
  const s = store.toUpperCase();
  if (s === "APP_STORE" || s === "MAC_APP_STORE") return "app_store";
  if (s === "PLAY_STORE") return "play_store";
  return null;
};

const mapPlan = (productId: string | undefined): "monthly" | "annual" | null => {
  if (!productId) return null;
  const env = Deno.env;
  const monthlyIos = env.get("PRODUCT_ID_MONTHLY_IOS");
  const annualIos = env.get("PRODUCT_ID_ANNUAL_IOS");
  const monthlyAndroid = env.get("PRODUCT_ID_MONTHLY_ANDROID");
  const annualAndroid = env.get("PRODUCT_ID_ANNUAL_ANDROID");
  if (productId === monthlyIos || productId === monthlyAndroid) return "monthly";
  if (productId === annualIos || productId === annualAndroid) return "annual";
  // Heuristic fallback so unknown product ids don't silently break the write
  const lower = productId.toLowerCase();
  if (lower.includes("annual") || lower.includes("yearly") || lower.includes("year")) return "annual";
  if (lower.includes("month")) return "monthly";
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Shared-secret auth
    const expectedAuth = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
    if (!expectedAuth) {
      log("ERROR", "REVENUECAT_WEBHOOK_AUTH not configured");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${expectedAuth}`) {
      log("Unauthorized webhook call");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const event: RcEvent | undefined = body?.event;
    if (!event?.type || !event?.app_user_id) {
      log("Bad payload", body);
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Event received", { type: event.type, app_user_id: event.app_user_id, store: event.store });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Resolve target profile.
    // Primary: revenuecat_app_user_id; fallback: profile.user_id (RevenueCat is configured
    // to use the Supabase auth UUID as the app_user_id).
    const candidateIds = [event.app_user_id, ...(event.aliases ?? []), event.original_app_user_id].filter(
      Boolean
    ) as string[];

    let { data: profile } = await supabase
      .from("profiles")
      .select("user_id, manual_subscription, is_subscribed, subscription_expires_at")
      .in("revenuecat_app_user_id", candidateIds)
      .maybeSingle();

    if (!profile) {
      const { data: byUserId } = await supabase
        .from("profiles")
        .select("user_id, manual_subscription, is_subscribed, subscription_expires_at")
        .in("user_id", candidateIds)
        .maybeSingle();
      profile = byUserId ?? null;
      if (profile) {
        // Backfill the link so future events resolve fast.
        await supabase
          .from("profiles")
          .update({ revenuecat_app_user_id: event.app_user_id })
          .eq("user_id", profile.user_id);
      }
    }

    if (!profile) {
      log("Profile not found, ignoring", { app_user_id: event.app_user_id });
      // Return 200 so RevenueCat doesn't keep retrying for a deleted user.
      return new Response(JSON.stringify({ ok: true, ignored: "no_profile" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.manual_subscription) {
      log("Manual subscription active, skipping write", { user_id: profile.user_id });
      return new Response(JSON.stringify({ ok: true, ignored: "manual_subscription" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = mapPlan(event.new_product_id ?? event.product_id);
    const store = mapStore(event.store);
    const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;

    let isSubscribed: boolean;
    if (REVOKING.includes(event.type)) {
      isSubscribed = false;
    } else if (event.type === "CANCELLATION") {
      // Cancellation just means auto-renew is off; access continues until expires_at.
      isSubscribed = expiresAt ? new Date(expiresAt).getTime() > Date.now() : false;
    } else if (event.type === "BILLING_ISSUE") {
      // Keep current state; user is in grace period.
      isSubscribed = profile.is_subscribed ?? false;
    } else if (ACTIVATING.includes(event.type)) {
      isSubscribed = true;
    } else {
      // SUBSCRIBER_ALIAS, NON_RENEWING_PURCHASE, etc — leave state alone.
      isSubscribed = profile.is_subscribed ?? false;
    }

    // Detect Elite vs Reborn from product id when activating
    const productIdForTier = (event.new_product_id ?? event.product_id ?? "").toLowerCase();
    const isElite = isSubscribed && productIdForTier.includes("elite");

    const update: Record<string, unknown> = { is_subscribed: isSubscribed };
    update.entitlement = isSubscribed ? (isElite ? "apollo_elite" : "apollo_premium") : null;
    if (plan) update.subscription_plan = plan;
    if (store) update.subscription_store = store;
    if (expiresAt) update.subscription_expires_at = expiresAt;

    const { error: updateError } = await supabase
      .from("profiles")
      .update(update)
      .eq("user_id", profile.user_id);

    if (updateError) {
      log("Update failed", updateError.message);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Profile updated", { user_id: profile.user_id, ...update });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
