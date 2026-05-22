import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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

    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }
    const callerId = userData.user.id;

    const { data: roleData } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleData) return jsonResponse(req, { error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const target = typeof body.user_id === "string" ? body.user_id : "";
    if (!target || !/^[0-9a-f-]{36}$/i.test(target)) {
      return jsonResponse(req, { error: "Invalid user_id" }, 400);
    }

    const { data: u, error: getErr } = await supabaseAdmin.auth.admin.getUserById(target);
    if (getErr || !u?.user) {
      return jsonResponse(req, { error: getErr?.message ?? "User not found" }, 404);
    }

    return jsonResponse(req, {
      email: u.user.email ?? null,
      phone: u.user.phone ?? null,
      email_confirmed_at: u.user.email_confirmed_at ?? null,
      phone_confirmed_at: u.user.phone_confirmed_at ?? null,
      last_sign_in_at: u.user.last_sign_in_at ?? null,
    }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[ADMIN-GET-CLIENT-CONTACT] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
