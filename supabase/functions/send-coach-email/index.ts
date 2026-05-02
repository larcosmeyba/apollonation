import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildEmail(recipientName: string, messageBody: string, type: "direct" | "broadcast") {
  const fromLabel = type === "direct"
    ? "A message from your coach"
    : "A message from the Apollo Team";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0a0a0a; color: #e5e5e5;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; letter-spacing: 0.05em; margin: 0; color: #ffffff;">
          APOLLO <span style="color: #3b82f6;">REBORN</span>
        </h1>
      </div>
      <div style="background-color: #141414; border: 1px solid #262626; border-radius: 8px; padding: 32px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #3b82f6;">${fromLabel}</p>
        <p style="margin: 0 0 20px; font-size: 16px; color: #e5e5e5;">Hey ${recipientName},</p>
        <div style="margin: 0 0 24px; font-size: 15px; color: #a3a3a3; line-height: 1.7; white-space: pre-wrap;">${messageBody}</div>
      </div>
      <p style="text-align: center; font-size: 11px; color: #525252; margin: 0 0 8px;">© ${new Date().getFullYear()} Apollo Reborn. All rights reserved.</p>
      <p style="text-align: center; font-size: 10px; color: #404040; margin: 0;">
        If you no longer wish to receive these emails, you may unsubscribe by replying with "unsubscribe".
      </p>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the caller is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    const resend = new Resend(resendApiKey);

    const body = await req.json();
    const { type, subject, message } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "direct") {
      // Single recipient
      const { recipientId } = body;
      if (!recipientId) {
        return new Response(JSON.stringify({ error: "recipientId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: recipientAuth } = await supabaseAdmin.auth.admin.getUserById(recipientId);
      if (!recipientAuth?.user?.email) {
        return new Response(JSON.stringify({ error: "Recipient email not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .eq("user_id", recipientId)
        .maybeSingle();

      const name = profile?.display_name || "there";

      await resend.emails.send({
        from: (Deno.env.get("EMAIL_FROM") ?? "Apollo Reborn <noreply@apolloreborn.com>"),
        to: [recipientAuth.user.email],
        subject: subject || "Message from Your Coach",
        html: buildEmail(name, message, "direct"),
      });

      console.log("[EMAIL] Direct message sent to", recipientAuth.user.email);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (type === "broadcast") {
      // Multiple recipients
      const { recipientIds } = body;
      if (!recipientIds?.length) {
        return new Response(JSON.stringify({ error: "recipientIds is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let sentCount = 0;
      for (const rid of recipientIds) {
        try {
          const { data: recipientAuth } = await supabaseAdmin.auth.admin.getUserById(rid);
          if (!recipientAuth?.user?.email) continue;

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("display_name")
            .eq("user_id", rid)
            .maybeSingle();

          const name = profile?.display_name || "there";

          await resend.emails.send({
            from: (Deno.env.get("EMAIL_FROM") ?? "Apollo Reborn <noreply@apolloreborn.com>"),
            to: [recipientAuth.user.email],
            subject: subject || "A Message from the Apollo Team",
            html: buildEmail(name, message, "broadcast"),
          });

          sentCount++;
        } catch (err) {
          console.error(`[EMAIL] Failed to send to ${rid}:`, err);
        }
      }

      console.log(`[EMAIL] Broadcast sent to ${sentCount}/${recipientIds.length} clients`);

      return new Response(JSON.stringify({ success: true, sentCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid type. Use 'direct' or 'broadcast'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("send-coach-email error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
