import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCorsHeaders, handlePreflight, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  // User-triggered (post-signup) — authenticated via the user's JWT
  // forwarded by the Supabase client. We don't need the cron secret here.

  try {
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
    if (!ADMIN_EMAIL) {
      console.error("[NOTIFY-NEW-SIGNUP] ADMIN_EMAIL not configured");
      return jsonResponse(req, { error: "Server not configured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const email = body.email || body.record?.email;
    const displayName = body.displayName || body.record?.display_name || "No name provided";

    if (!email) return jsonResponse(req, { error: "No email provided" }, 400);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");

    const resend = new Resend(resendApiKey);

    await resend.emails.send({
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
              <p style="margin: 0; font-size: 14px; color: #e5e5e5;"><strong>Email:</strong> ${email}</p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://apollonation.lovable.app/admin" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 32px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.05em;">VIEW IN ADMIN</a>
            </div>
          </div>
          <p style="text-align: center; font-size: 12px; color: #525252; margin: 0;">© ${new Date().getFullYear()} Apollo Reborn. All rights reserved.</p>
        </div>
      `,
    });

    console.log("[NOTIFY-NEW-SIGNUP] Email sent for new signup");
    return jsonResponse(req, { success: true });
  } catch (error) {
    console.error("notify-new-signup error:", error instanceof Error ? error.message : String(error));
    return jsonResponse(
      req,
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
