import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildCorsHeaders, handlePreflight, jsonResponse } from "../_shared/cors.ts";

const ALLOWED_STATUSES = new Set(["active", "frozen", "archived", "cancelled"]);

const log = (step: string, details?: unknown) => {
  const tail = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MANAGE-CLIENT-STATUS] ${step}${tail}`);
};

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  const corsHeaders = buildCorsHeaders(req);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleData) throw new Error("Unauthorized: admin role required");
    log("Admin verified", { adminId: userData.user.id });

    const body = await req.json().catch(() => ({}));
    const client_user_id = typeof body.client_user_id === "string" ? body.client_user_id : null;
    const new_status = typeof body.new_status === "string" ? body.new_status : null;

    if (!client_user_id || !new_status) throw new Error("client_user_id and new_status required");
    if (!ALLOWED_STATUSES.has(new_status)) {
      throw new Error("Invalid status. Must be active, frozen, archived, or cancelled");
    }
    log("Request parsed", { client_user_id, new_status });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ account_status: new_status, status_changed_at: new Date().toISOString() })
      .eq("user_id", client_user_id);

    if (updateError) throw new Error(`Failed to update profile: ${updateError.message}`);
    // PII-free log: status change recorded with userId only.
    log("Profile updated", { client_user_id, new_status });

    // Audit log
    await supabase.from("admin_audit_log").insert({
      admin_user_id: userData.user.id,
      action: "change_account_status",
      target_user_id: client_user_id,
      details: { new_status },
    });

    return jsonResponse(req, { success: true, new_status }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
