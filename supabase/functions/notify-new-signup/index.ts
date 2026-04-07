import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "mleyba.cpt@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both trigger format (record) and direct call format (email, displayName)
    const email = body.email || body.record?.email;
    const displayName = body.displayName || body.record?.display_name || "No name provided";

    if (!email) {
      return new Response(JSON.stringify({ error: "No email provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = email;


    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: "Apollo Reborn <onboarding@resend.dev>",
      to: [ADMIN_EMAIL],
      subject: `New Client Signup: ${displayName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0a0a0a; color: #e5e5e5;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; letter-spacing: 0.05em; margin: 0; color: #ffffff;">
              APOLLO <span style="color: #3b82f6;">REBORN</span>
            </h1>
          </div>
          <div style="background-color: #141414; border: 1px solid #262626; padding: 32px; margin-bottom: 24px;">
            <p style="margin: 0 0 16px; font-size: 16px; color: #e5e5e5;">Hey Coach,</p>
            <p style="margin: 0 0 8px; font-size: 16px; color: #a3a3a3;">A new client just signed up!</p>
            <div style="background-color: #1a1a1a; border: 1px solid #333; padding: 16px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #e5e5e5;"><strong>Name:</strong> ${displayName}</p>
              <p style="margin: 0; font-size: 14px; color: #e5e5e5;"><strong>Email:</strong> ${userEmail}</p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://apollonation.lovable.app/admin" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 32px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.05em;">VIEW IN ADMIN</a>
            </div>
          </div>
          <p style="text-align: center; font-size: 12px; color: #525252; margin: 0;">© ${new Date().getFullYear()} Apollo Reborn. All rights reserved.</p>
        </div>
      `,
    });

    console.log("[NOTIFY-NEW-SIGNUP] Email sent for", displayName, userEmail, emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-new-signup error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
