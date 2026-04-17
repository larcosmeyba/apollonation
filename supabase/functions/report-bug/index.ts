import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Where bug reports get emailed
const ADMIN_EMAIL = "marcos@apollonation.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const subject: string = (body.subject ?? "").toString().trim().slice(0, 200);
    const message: string = (body.message ?? "").toString().trim().slice(0, 4000);
    const context: string = (body.context ?? "").toString().slice(0, 500);

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = userData.user.email ?? "unknown";
    const userId = userData.user.id;

    // Save to support_tickets
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

    // Email admin (best-effort)
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
          from: "Apollo Reborn Bugs <onboarding@resend.dev>",
          to: [ADMIN_EMAIL],
          reply_to: userEmail !== "unknown" ? userEmail : undefined,
          subject: `🐛 Bug: ${subject || "New report"}`,
          html,
        });
      } catch (emailErr) {
        console.error("[REPORT-BUG] email failed (ticket still saved):", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, ticketId: ticket?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("report-bug error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
