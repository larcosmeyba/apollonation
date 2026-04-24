// Admin-only: change a client's account_status. Pure DB update — no Stripe.
// Billing is handled by Apple/Google through RevenueCat; freezing/cancelling
// in the app does NOT cancel the user's IAP subscription. Admins should also
// inform the user to cancel through the App Store / Play Store if needed.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const tail = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MANAGE-CLIENT-STATUS] ${step}${tail}`);
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
    log("Admin verified", { adminId: userData.user.id });

    const { client_user_id, new_status } = await req.json();
    if (!client_user_id || !new_status) throw new Error("client_user_id and new_status required");
    if (!["active", "frozen", "archived", "cancelled"].includes(new_status)) {
      throw new Error("Invalid status. Must be active, frozen, archived, or cancelled");
    }
    log("Request parsed", { client_user_id, new_status });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        account_status: new_status,
        status_changed_at: new Date().toISOString(),
      })
      .eq("user_id", client_user_id);

    if (updateError) throw new Error(`Failed to update profile: ${updateError.message}`);
    log("Profile updated", { new_status });

    return new Response(
      JSON.stringify({ success: true, new_status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
