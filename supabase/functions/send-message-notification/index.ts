import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCorsHeaders, handlePreflight, jsonResponse } from "../_shared/cors.ts";

const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Apollo Reborn™ <noreply@apolloreborn.com>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://apolloreborn.com";

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
  const pre = handlePreflight(req);
  if (pre) return pre;
  const corsHeaders = buildCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(req, { error: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const body = await req.json().catch(() => ({}));
    const { recipientId, senderId: triggerSenderId, fromTrigger } = body;

    let senderId: string;
    let senderIsAdmin = false;

    if (fromTrigger) {
      senderId = triggerSenderId;
      if (!senderId) return jsonResponse(req, { error: "Missing senderId" }, 400);
      const { data: roleData } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", senderId).eq("role", "admin").single();
      senderIsAdmin = !!roleData;
    } else {
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !userData.user) return jsonResponse(req, { error: "Invalid token" }, 401);
      senderId = userData.user.id;
      const { data: roleData } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", senderId).eq("role", "admin").single();
      senderIsAdmin = !!roleData;
    }

    if (!recipientId) return jsonResponse(req, { error: "Missing recipientId" }, 400);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");
    const resend = new Resend(resendApiKey);

    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
    if (!ADMIN_EMAIL) {
      console.error("[send-message-notification] ADMIN_EMAIL not configured");
      return jsonResponse(req, { error: "Server not configured" }, 500);
    }

    // Respect block: if recipient blocked sender, skip silently.
    const { data: blocked } = await supabaseAdmin.rpc("is_blocked", {
      _blocker: recipientId,
      _blocked: senderId,
    });
    if (blocked) {
      console.log("[EMAIL] Skipped — recipient blocked sender", { recipientId });
      return jsonResponse(req, { success: true, skipped: "blocked" });
    }

    // 5-minute per-thread email rate limit. Pair is sorted so client/coach hit the same row.
    const [pairA, pairB] = senderId < recipientId ? [senderId, recipientId] : [recipientId, senderId];
    const { data: state } = await supabaseAdmin
      .from("message_email_state")
      .select("last_email_sent_at")
      .eq("user_a", pairA)
      .eq("user_b", pairB)
      .maybeSingle();

    if (state?.last_email_sent_at) {
      const ageMs = Date.now() - new Date(state.last_email_sent_at).getTime();
      if (ageMs < 5 * 60 * 1000) {
        console.log("[EMAIL] Skipped — rate-limited (5 min window)", { senderId, recipientId, ageMs });
        return jsonResponse(req, { success: true, skipped: "rate_limited" });
      }
    }

    // Fetch the most recent message body to build a 200-char preview.
    const { data: latestMsg } = await supabaseAdmin
      .from("messages")
      .select("content")
      .eq("sender_id", senderId)
      .eq("recipient_id", recipientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const rawBody = (latestMsg?.content || "").trim();
    const preview = rawBody.length > 200 ? rawBody.slice(0, 200) + "…" : rawBody;
    const escapedPreview = preview
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    if (senderIsAdmin) {
      // Respect coach_messages preference for client recipient.
      const { data: prefAllowed } = await supabaseAdmin.rpc("get_notification_preference", {
        _user_id: recipientId,
        _category: "coach_messages",
      });
      if (prefAllowed === false) {
        console.log("[EMAIL] Skipped — recipient opted out of coach_messages", { recipientId });
        return jsonResponse(req, { success: true, skipped: "preference" });
      }

      const { data: recipientData, error: recipientError } = await supabaseAdmin.auth.admin.getUserById(recipientId);
      if (recipientError || !recipientData.user?.email) {
        return jsonResponse(req, { error: "Recipient not found" }, 404);
      }

      const { data: profileData } = await supabaseAdmin
        .from("profiles").select("display_name").eq("user_id", recipientId).maybeSingle();

      const recipientName = profileData?.display_name || "there";
      const recipientEmail = recipientData.user.email;

      const previewLine = escapedPreview ? `“${escapedPreview}”` : "Coach Marcos just sent you a new message.";

      try {
        await resend.emails.send({
          from: "Apollo Reborn <onboarding@resend.dev>",
          to: [recipientEmail],
          subject: "Coach Marcos sent you a message",
          html: buildEmail(recipientName, `${previewLine}<br/><br/>Log in to your dashboard to read and reply.`, "https://apollonation.lovable.app/dashboard/messages"),
        });
        // Persist rate-limit timestamp only on successful send.
        await supabaseAdmin.from("message_email_state").upsert({
          user_a: pairA, user_b: pairB, last_email_sent_at: new Date().toISOString(),
        }, { onConflict: "user_a,user_b" });
        console.log("[EMAIL] Sent client notification", { recipientId });
      } catch (sendErr) {
        // Resilient: never let email failure roll back the original message insert.
        console.error("[EMAIL] Send failed (client notification)", sendErr instanceof Error ? sendErr.message : String(sendErr));
        return jsonResponse(req, { success: true, email_failed: true });
      }

      return jsonResponse(req, { success: true });
    } else {
      const { data: senderProfile } = await supabaseAdmin
        .from("profiles").select("display_name").eq("user_id", senderId).maybeSingle();

      const clientName = senderProfile?.display_name || "A client";
      const previewLine = escapedPreview ? `“${escapedPreview}”` : `${clientName} just sent you a new message.`;

      try {
        await resend.emails.send({
          from: "Apollo Reborn <onboarding@resend.dev>",
          to: [ADMIN_EMAIL],
          subject: `${clientName} sent you a message`,
          html: buildEmail("Coach", `${previewLine}<br/><br/>Log in to your admin panel to read and reply.`, "https://apollonation.lovable.app/admin"),
        });
        await supabaseAdmin.from("message_email_state").upsert({
          user_a: pairA, user_b: pairB, last_email_sent_at: new Date().toISOString(),
        }, { onConflict: "user_a,user_b" });
        console.log("[EMAIL] Sent admin notification", { senderId });
      } catch (sendErr) {
        console.error("[EMAIL] Send failed (admin notification)", sendErr instanceof Error ? sendErr.message : String(sendErr));
        return jsonResponse(req, { success: true, email_failed: true });
      }

      return jsonResponse(req, { success: true });
    }
  } catch (error) {
    console.error("send-message-notification error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
