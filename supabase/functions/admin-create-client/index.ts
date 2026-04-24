import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  const corsHeaders = buildCorsHeaders(req);

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }
    const callerId = claimsData.claims.sub;

    const { data: roleData } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleData) return jsonResponse(req, { error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const display_name = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 100) : "";
    const grant_subscription = !!body.grant_subscription;

    if (!email || !password || !display_name) {
      return jsonResponse(req, { error: "Email, password, and display name are required" }, 400);
    }
    if (password.length < 6) {
      return jsonResponse(req, { error: "Password must be at least 6 characters" }, 400);
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return jsonResponse(req, { error: "Invalid email" }, 400);
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name },
    });

    if (createError) {
      console.error("[ADMIN-CREATE-CLIENT] Create error:", createError.message);
      return jsonResponse(req, { error: createError.message }, 400);
    }

    if (grant_subscription) {
      const { error: grantError } = await supabaseAdmin
        .from("profiles")
        .update({
          manual_subscription: true,
          is_subscribed: true,
          subscription_store: "manual",
        })
        .eq("user_id", newUser.user.id);

      if (grantError) {
        console.error("[ADMIN-CREATE-CLIENT] Grant subscription error:", grantError.message);
      }
    }

    // ── Audit log: record the admin action (PII-free; never logs email)
    const { error: auditError } = await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: callerId,
      action: "create_client",
      target_user_id: newUser.user.id,
      details: { granted_subscription: grant_subscription },
    });
    if (auditError) {
      console.error("[ADMIN-CREATE-CLIENT] Audit log insert failed:", auditError.message);
    }

    console.log("[ADMIN-CREATE-CLIENT] Client created", {
      adminId: callerId,
      newUserId: newUser.user.id,
      granted: grant_subscription,
    });

    return jsonResponse(req, { success: true, user_id: newUser.user.id }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[ADMIN-CREATE-CLIENT] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
