// Edge function: delete-account
// Re-verifies the caller's password, then permanently deletes their data and auth user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing authorization" }, 401);
    }

    // Identify the caller
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;
    if (!user.email) return json({ error: "Account has no email" }, 400);

    // Parse body
    let body: { password?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }
    const password = (body.password || "").trim();
    if (!password) return json({ error: "Password required" }, 400);

    // Re-verify password using a fresh anon client (does not affect existing session)
    const verifyClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInErr } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (signInErr) {
      return json({ error: "Invalid password" }, 403);
    }
    await verifyClient.auth.signOut().catch(() => undefined);

    // Service-role client for cleanup
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = user.id;

    // Delete user's rows. We keep going on individual table failures so we don't
    // leave the auth user orphaned with partial data; collect any errors.
    const errors: Array<{ table: string; error: string }> = [];
    const safeDelete = async (
      table: string,
      builder: () => Promise<{ error: { message: string } | null }>,
    ) => {
      try {
        const { error } = await builder();
        if (error) errors.push({ table, error: error.message });
      } catch (e) {
        errors.push({ table, error: (e as Error).message });
      }
    };

    await safeDelete("client_questionnaires", () =>
      admin.from("client_questionnaires").delete().eq("user_id", userId),
    );
    await safeDelete("nutrition_plans", () =>
      admin.from("nutrition_plans").delete().eq("user_id", userId),
    );
    await safeDelete("client_training_plans", () =>
      admin.from("client_training_plans").delete().eq("user_id", userId),
    );
    await safeDelete("body_metrics", () =>
      admin.from("body_metrics").delete().eq("user_id", userId),
    );
    await safeDelete("progress_photos", () =>
      admin.from("progress_photos").delete().eq("user_id", userId),
    );
    // The project uses macro_logs (no separate meal_logs table)
    await safeDelete("macro_logs", () =>
      admin.from("macro_logs").delete().eq("user_id", userId),
    );
    await safeDelete("messages", () =>
      admin.from("messages").delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
    );
    await safeDelete("coach_client_assignments", () =>
      admin
        .from("coach_client_assignments")
        .delete()
        .or(`coach_user_id.eq.${userId},client_user_id.eq.${userId}`),
    );
    await safeDelete("user_blocks", () =>
      admin
        .from("user_blocks")
        .delete()
        .or(`blocker_user_id.eq.${userId},blocked_user_id.eq.${userId}`),
    );
    await safeDelete("message_reports", () =>
      admin.from("message_reports").delete().eq("reporter_user_id", userId),
    );
    await safeDelete("profiles", () =>
      admin.from("profiles").delete().eq("user_id", userId),
    );

    // Finally, delete the auth user
    const { error: authDeleteErr } = await admin.auth.admin.deleteUser(userId);
    if (authDeleteErr) {
      console.error("delete-account: auth.admin.deleteUser failed", authDeleteErr, errors);
      return json({ error: "Failed to delete account", details: authDeleteErr.message }, 500);
    }

    if (errors.length) {
      console.warn("delete-account: partial cleanup errors", errors);
    }
    return json({ ok: true });
  } catch (e) {
    console.error("delete-account: unexpected error", e);
    return json({ error: "Internal error" }, 500);
  }
});
