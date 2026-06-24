import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  const pre = handlePreflight(req); if (pre) return pre;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const exerciseName = String(body?.exerciseName || "").slice(0, 200);
    const question = String(body?.question || "").trim().slice(0, 2000);
    const workoutLabel = String(body?.workoutLabel || "").slice(0, 200);

    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 10 questions per user per hour
    const { data: rateOk } = await supabaseAdmin.rpc("check_rate_limit", {
      p_identifier: userData.user.id,
      p_action: "notify-coach-question",
      p_max_requests: 10,
      p_window_minutes: 60,
    });
    if (rateOk === false) {
      return new Response(JSON.stringify({ error: "Too many questions sent. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up client display name + email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const clientName = profile?.display_name || userData.user.email || "A client";
    const clientEmail = userData.user.email || "unknown";

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!adminEmail || !resendApiKey) {
      // Still record nothing failed loudly — but indicate misconfig
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);

    const safeQ = question.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;background:#0a0a0a;color:#e5e5e5;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="font-size:22px;letter-spacing:0.05em;margin:0;color:#fff;">APOLLO <span style="color:#3b82f6;">REBORN</span></h1>
        </div>
        <div style="background:#141414;border:1px solid #262626;border-radius:8px;padding:28px;">
          <p style="margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#3b82f6;">New question from a client</p>
          <p style="margin:0 0 4px;font-size:16px;color:#fff;"><strong>${clientName}</strong></p>
          <p style="margin:0 0 16px;font-size:12px;color:#a3a3a3;">${clientEmail}</p>
          ${exerciseName ? `<p style="margin:0 0 4px;font-size:12px;color:#a3a3a3;">Exercise: <strong style="color:#fff;">${exerciseName}</strong></p>` : ""}
          ${workoutLabel ? `<p style="margin:0 0 16px;font-size:12px;color:#a3a3a3;">Workout: <strong style="color:#fff;">${workoutLabel}</strong></p>` : ""}
          <div style="margin-top:16px;padding:16px;background:#0a0a0a;border-left:3px solid #3b82f6;border-radius:4px;font-size:14px;color:#e5e5e5;line-height:1.6;white-space:pre-wrap;">${safeQ}</div>
        </div>
        <p style="text-align:center;font-size:11px;color:#525252;margin-top:16px;">Reply directly to the client from the Admin Portal.</p>
      </div>
    `;

    await resend.emails.send({
      from: "Apollo Reborn <notifications@apolloreborn.com>",
      to: [adminEmail],
      reply_to: clientEmail,
      subject: `New client question${exerciseName ? ` — ${exerciseName}` : ""}`,
      html,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
