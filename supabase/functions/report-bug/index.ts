import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCorsHeaders, handlePreflight, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  const corsHeaders = buildCorsHeaders(req);

  try {
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
    if (!ADMIN_EMAIL) {
      console.error("[REPORT-BUG] ADMIN_EMAIL not configured");
      return jsonResponse(req, { error: "Server not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) return jsonResponse(req, { error: "Invalid token" }, 401);

    const body = await req.json().catch(() => ({}));
    const subject: string = (body.subject ?? "").toString().trim().slice(0, 200);
    const message: string = (body.message ?? "").toString().trim().slice(0, 4000);
    const context: string = (body.context ?? "").toString().slice(0, 500);

    if (!message) return jsonResponse(req, { error: "Message is required" }, 400);

    const userEmail = userData.user.email ?? "unknown";
    const userId = userData.user.id;

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        user_id: userId,
        type: "bug",
        subject: subject || "Bug report",
        message: `${message}\n\n---\nContext: ${context}\nUser email: ${userEmail}`,
      })
      .select("id")
      .single();

    if (ticketError) {
      console.error("[REPORT-BUG] insert error:", ticketError);
      throw ticketError;
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const html = `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;background:#0a0a0a;color:#e5e5e5;">
            <h1 style="font-size:20px;margin:0 0 8px;color:#ef4444;">🐛 New Bug Report</h1>
            <p style="margin:0 0 20px;font-size:12px;color:#737373;">Apollo Reborn — App Support</p>
            <div style="background:#141414;border:1px solid #262626;border-radius:8px;padding:24px;margin-bottom:16px;">
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#3b82f6;">Subject</p>
              <p style="margin:0 0 16px;font-size:15px;color:#fff;">${subject || "(no subject)"}</p>
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#3b82f6;">Description</p>
              <pre style="margin:0 0 16px;font-size:14px;color:#e5e5e5;white-space:pre-wrap;font-family:inherit;">${escapeHtml(message)}</pre>
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#3b82f6;">From</p>
              <p style="margin:0 0 16px;font-size:13px;color:#a3a3a3;">${escapeHtml(userEmail)} · ${userId}</p>
              <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#3b82f6;">Context</p>
              <p style="margin:0;font-size:12px;color:#737373;white-space:pre-wrap;">${escapeHtml(context) || "—"}</p>
            </div>
            <p style="font-size:11px;color:#525252;text-align:center;">Ticket ID: ${ticket?.id ?? "n/a"}</p>
          </div>
        `;

        await resend.emails.send({
          from: (Deno.env.get("EMAIL_FROM") ?? "Apollo Reborn Bugs <noreply@apolloreborn.com>"),
          to: [ADMIN_EMAIL],
          reply_to: userEmail !== "unknown" ? userEmail : undefined,
          subject: `🐛 Bug: ${subject || "New report"}`,
          html,
        });
      } catch (emailErr) {
        console.error("[REPORT-BUG] email failed (ticket still saved)", { ticketId: ticket?.id });
      }
    }

    // PII-free log: ticket id + user id only, no email.
    console.log("[REPORT-BUG] ticket created", { userId, ticketId: ticket?.id });

    return new Response(JSON.stringify({ success: true, ticketId: ticket?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("report-bug error:", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
