import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    // 1) Get all active users (profiles with active status)
    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("account_status", "active");

    if (profilesErr) throw profilesErr;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No active users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = profiles.map((p: any) => p.user_id);

    // 2) Get users who HAVE logged meals today
    const { data: loggedUsers, error: logsErr } = await supabase
      .from("macro_logs")
      .select("user_id")
      .eq("log_date", today)
      .in("user_id", userIds);

    if (logsErr) throw logsErr;

    const loggedSet = new Set((loggedUsers || []).map((l: any) => l.user_id));

    // 3) Filter to users who haven't logged
    const missingUsers = profiles.filter(
      (p: any) => !loggedSet.has(p.user_id)
    );

    if (missingUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "All users logged meals today", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4) Check we haven't already sent a reminder today
    const { data: existingReminders } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("type", "reminder")
      .eq("title", "Don't forget to log your meals! 🍽️")
      .gte("created_at", `${today}T00:00:00Z`);

    const alreadyReminded = new Set(
      (existingReminders || []).map((n: any) => n.user_id)
    );

    const toNotify = missingUsers.filter(
      (u: any) => !alreadyReminded.has(u.user_id)
    );

    if (toNotify.length === 0) {
      return new Response(
        JSON.stringify({ message: "Reminders already sent today", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5) Insert notifications
    const notifications = toNotify.map((u: any) => ({
      user_id: u.user_id,
      title: "Don't forget to log your meals! 🍽️",
      message:
        "You haven't logged any meals today. Stay on track with your nutrition goals — even a quick log counts!",
      type: "reminder",
      action_url: "/dashboard/nutrition",
      is_read: false,
    }));

    const { error: insertErr } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertErr) throw insertErr;

    // 6) Also check workout streaks and send milestone notifications
    // Get users with active training plans
    const { data: activePlans } = await supabase
      .from("client_training_plans")
      .select("user_id")
      .eq("status", "active");

    if (activePlans && activePlans.length > 0) {
      for (const plan of activePlans) {
        // Count consecutive workout days
        const { data: recentSessions } = await supabase
          .from("workout_session_logs")
          .select("log_date")
          .eq("user_id", plan.user_id)
          .order("log_date", { ascending: false })
          .limit(30);

        if (!recentSessions || recentSessions.length === 0) continue;

        // Calculate streak
        let streak = 0;
        const dates = [
          ...new Set(recentSessions.map((s: any) => s.log_date)),
        ].sort().reverse();

        for (let i = 0; i < dates.length; i++) {
          const expected = new Date();
          expected.setDate(expected.getDate() - i);
          const expectedStr = expected.toISOString().split("T")[0];
          if (dates[i] === expectedStr) {
            streak++;
          } else {
            break;
          }
        }

        // Milestone notifications at 7, 14, 21, 30, 60, 90 days
        const milestones = [7, 14, 21, 30, 60, 90];
        if (milestones.includes(streak)) {
          // Check if already notified for this milestone
          const milestoneTitle = `${streak}-Day Workout Streak! 🔥`;
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", plan.user_id)
            .eq("title", milestoneTitle)
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from("notifications").insert({
              user_id: plan.user_id,
              title: milestoneTitle,
              message: `You've worked out ${streak} days in a row! Keep the momentum going — you're building something incredible.`,
              type: "achievement",
              action_url: "/dashboard/training",
              is_read: false,
            });
          }
        }
      }
    }

    // 7) Check challenge completions
    const { data: activeEnrollments } = await supabase
      .from("challenge_enrollments")
      .select("id, user_id, challenge_id, enrolled_at")
      .eq("status", "active");

    if (activeEnrollments && activeEnrollments.length > 0) {
      for (const enrollment of activeEnrollments) {
        const { data: challenge } = await supabase
          .from("challenges")
          .select("title, duration_days")
          .eq("id", enrollment.challenge_id)
          .single();

        if (!challenge) continue;

        const { count: checkinCount } = await supabase
          .from("challenge_checkins")
          .select("id", { count: "exact", head: true })
          .eq("user_id", enrollment.user_id)
          .eq("challenge_id", enrollment.challenge_id);

        if ((checkinCount || 0) >= challenge.duration_days) {
          // Mark completed
          await supabase
            .from("challenge_enrollments")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", enrollment.id);

          // Send congratulations
          const completionTitle = `Challenge Complete: ${challenge.title} 🏆`;
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", enrollment.user_id)
            .eq("title", completionTitle)
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from("notifications").insert({
              user_id: enrollment.user_id,
              title: completionTitle,
              message: `Congratulations! You've completed the ${challenge.title} challenge. You proved that discipline beats motivation every time.`,
              type: "achievement",
              action_url: "/dashboard/challenges",
              is_read: false,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Reminders sent",
        meal_reminders: toNotify.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in automated-reminders:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
