import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MANAGE-CLIENT-STATUS] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Unauthorized: admin role required");
    logStep("Admin verified", { adminId: userData.user.id });

    // Parse request body
    const { client_user_id, new_status } = await req.json();
    if (!client_user_id || !new_status) throw new Error("client_user_id and new_status required");
    if (!["active", "frozen", "archived"].includes(new_status)) {
      throw new Error("Invalid status. Must be active, frozen, or archived");
    }
    logStep("Request parsed", { client_user_id, new_status });

    // Get the client's email from auth
    const { data: clientAuth, error: clientAuthError } = await supabase.auth.admin.getUserById(client_user_id);
    if (clientAuthError || !clientAuth.user?.email) {
      throw new Error("Could not find client auth record");
    }
    const clientEmail = clientAuth.user.email;
    logStep("Client email found", { clientEmail });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: clientEmail, limit: 1 });
    let stripeAction = "none";

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      logStep("Stripe customer found", { customerId });

      // Get active or paused subscriptions
      const activeSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });
      const pausedSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "paused",
        limit: 10,
      });
      const allSubs = [...activeSubs.data, ...pausedSubs.data];
      logStep("Subscriptions found", { active: activeSubs.data.length, paused: pausedSubs.data.length });

      if (new_status === "frozen") {
        // Pause all active subscriptions
        for (const sub of activeSubs.data) {
          await stripe.subscriptions.update(sub.id, {
            pause_collection: { behavior: "void" },
          });
          logStep("Subscription paused", { subId: sub.id });
        }
        stripeAction = activeSubs.data.length > 0 ? "paused" : "no_active_subs";

      } else if (new_status === "archived") {
        // Cancel all subscriptions (active + paused)
        for (const sub of allSubs) {
          await stripe.subscriptions.cancel(sub.id);
          logStep("Subscription cancelled", { subId: sub.id });
        }
        stripeAction = allSubs.length > 0 ? "cancelled" : "no_subs";

      } else if (new_status === "active") {
        // Resume paused subscriptions
        for (const sub of pausedSubs.data) {
          await stripe.subscriptions.update(sub.id, {
            pause_collection: "",
          });
          logStep("Subscription resumed", { subId: sub.id });
        }
        stripeAction = pausedSubs.data.length > 0 ? "resumed" : "no_paused_subs";
      }
    } else {
      logStep("No Stripe customer found, skipping billing changes");
      stripeAction = "no_stripe_customer";
    }

    // Update the profile status in the database
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        account_status: new_status,
        status_changed_at: new Date().toISOString(),
      })
      .eq("user_id", client_user_id);

    if (updateError) throw new Error(`Failed to update profile: ${updateError.message}`);
    logStep("Profile updated", { new_status, stripeAction });

    return new Response(
      JSON.stringify({
        success: true,
        new_status,
        stripe_action: stripeAction,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
