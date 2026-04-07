import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildEmail(name: string, body: string, link: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0a0a0a; color: #e5e5e5;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; letter-spacing: 0.05em; margin: 0; color: #ffffff;">
          APOLLO <span style="color: #3b82f6;">REBORN</span>
        </h1>
      </div>
      <div style="background-color: #141414; border: 1px solid #262626; padding: 32px; margin-bottom: 24px;">
        <p style="margin: 0 0 16px; font-size: 16px; color: #e5e5e5;">Hey ${name},</p>
        <p style="margin: 0 0 24px; font-size: 16px; color: #a3a3a3;">${body}</p>
        <div style="text-align: center;">
          <a href="${link}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 32px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.05em;">VIEW MESSAGE</a>
        </div>
      </div>
      <p style="text-align: center; font-size: 12px; color: #525252; margin: 0;">© ${new Date().getFullYear()} Apollo Reborn. All rights reserved.</p>
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

    const token = authHeader.replace("Bearer ", "");
    const body = await req.json();
    const { recipientId, senderId: triggerSenderId, fromTrigger } = body;

    let senderId: string;
    let senderIsAdmin = false;

    if (fromTrigger) {
      // Called from database trigger with service role key — senderId is provided
      senderId = triggerSenderId;
      if (!senderId) {
        return new Response(JSON.stringify({ error: "Missing senderId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Check if sender is admin
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", senderId)
        .eq("role", "admin")
        .single();
      senderIsAdmin = !!roleData;
    } else {
      // Called from client-side with user JWT
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !userData.user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      senderId = userData.user.id;
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", senderId)
        .eq("role", "admin")
        .single();
      senderIsAdmin = !!roleData;
    }

    if (!recipientId) {
      return new Response(JSON.stringify({ error: "Missing recipientId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    const resend = new Resend(resendApiKey);

    const ADMIN_EMAIL = "mleyba.cpt@gmail.com";

    if (senderIsAdmin) {
      // Admin sending to client — notify the client
      const { data: recipientData, error: recipientError } = await supabaseAdmin.auth.admin.getUserById(recipientId);
      if (recipientError || !recipientData.user?.email) {
        return new Response(JSON.stringify({ error: "Recipient not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profileData } = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .eq("user_id", recipientId)
        .maybeSingle();

      const recipientName = profileData?.display_name || "there";
      const recipientEmail = recipientData.user.email;

      const emailResponse = await resend.emails.send({
        from: "Apollo Reborn <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: "Coach Marcos sent you a message",
        html: buildEmail(recipientName, "Coach Marcos just sent you a new message. Log in to your dashboard to read and reply.", "https://apollonation.lovable.app/dashboard/messages"),
      });

      console.log("[EMAIL] Sent client notification to", recipientEmail, emailResponse);

      return new Response(JSON.stringify({ success: true, message: `Notification sent to ${recipientEmail}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Client sending to admin — notify the admin
      const { data: senderProfile } = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .eq("user_id", senderId)
        .maybeSingle();

      const clientName = senderProfile?.display_name || "A client";

      const emailResponse = await resend.emails.send({
        from: "Apollo Reborn <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `${clientName} sent you a message`,
        html: buildEmail("Coach", `${clientName} just sent you a new message. Log in to your admin panel to read and reply.`, "https://apollonation.lovable.app/admin"),
      });

      console.log("[EMAIL] Sent admin notification for client", clientName, emailResponse);

      return new Response(JSON.stringify({ success: true, message: `Admin notification sent` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("send-message-notification error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
