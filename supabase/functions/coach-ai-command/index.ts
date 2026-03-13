import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    // Verify admin
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Admin access required");

    const { command, clientUserId, clientName } = await req.json();
    if (!command || !clientUserId) throw new Error("Missing command or clientUserId");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch client context
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [questRes, nutritionRes, trainingRes] = await Promise.all([
      adminSupabase.from("client_questionnaires").select("*").eq("user_id", clientUserId).eq("is_active", true).maybeSingle(),
      adminSupabase.from("nutrition_plans").select("id, title, status, daily_calories, protein_grams, carbs_grams, fat_grams").eq("user_id", clientUserId).eq("status", "active").maybeSingle(),
      adminSupabase.from("client_training_plans").select("id, title, status, workout_days_per_week").eq("user_id", clientUserId).eq("status", "active").maybeSingle(),
    ]);

    const context = {
      questionnaire: questRes.data,
      activeNutritionPlan: nutritionRes.data,
      activeTrainingPlan: trainingRes.data,
    };

    // Call AI to parse command
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a fitness coaching assistant. Parse the coach's command and return structured actions to apply to a client's program.

Client context:
${JSON.stringify(context, null, 2)}

Return a JSON object with these possible actions (include only relevant ones):
{
  "actions": [
    {
      "type": "update_calories",
      "value": <number>
    },
    {
      "type": "update_macros",
      "protein_grams": <number|null>,
      "carbs_grams": <number|null>,
      "fat_grams": <number|null>
    },
    {
      "type": "add_note",
      "content": "<string>"
    }
  ],
  "summary": "<human-readable summary of what was done>",
  "notification_message": "<message to send to the client about the update>"
}`
          },
          { role: "user", content: command }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "apply_coach_actions",
              description: "Apply parsed coach actions to the client's program",
              parameters: {
                type: "object",
                properties: {
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["update_calories", "update_macros", "add_note"] },
                        value: { type: "number" },
                        protein_grams: { type: "number" },
                        carbs_grams: { type: "number" },
                        fat_grams: { type: "number" },
                        content: { type: "string" }
                      },
                      required: ["type"]
                    }
                  },
                  summary: { type: "string" },
                  notification_message: { type: "string" }
                },
                required: ["actions", "summary", "notification_message"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "apply_coach_actions" } }
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error("AI processing failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured actions");

    const parsed = JSON.parse(toolCall.function.arguments);
    const { actions, summary, notification_message } = parsed;

    // Apply actions
    const results: string[] = [];

    for (const action of actions) {
      if (action.type === "update_calories" && context.activeNutritionPlan) {
        const { error } = await adminSupabase
          .from("nutrition_plans")
          .update({ daily_calories: action.value })
          .eq("id", context.activeNutritionPlan.id);
        if (!error) results.push(`Updated calories to ${action.value}`);
      }

      if (action.type === "update_macros" && context.activeNutritionPlan) {
        const updates: any = {};
        if (action.protein_grams != null) updates.protein_grams = action.protein_grams;
        if (action.carbs_grams != null) updates.carbs_grams = action.carbs_grams;
        if (action.fat_grams != null) updates.fat_grams = action.fat_grams;
        if (Object.keys(updates).length > 0) {
          const { error } = await adminSupabase
            .from("nutrition_plans")
            .update(updates)
            .eq("id", context.activeNutritionPlan.id);
          if (!error) results.push("Updated macros");
        }
      }

      if (action.type === "add_note") {
        const { error } = await adminSupabase
          .from("client_notes")
          .insert({
            client_user_id: clientUserId,
            admin_user_id: user.id,
            content: action.content,
          });
        if (!error) results.push("Added coach note");
      }
    }

    // Send notification message to client
    if (notification_message) {
      await adminSupabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: clientUserId,
        content: notification_message,
      });
      results.push("Notified client");
    }

    return new Response(JSON.stringify({
      success: true,
      summary,
      results,
      actionsApplied: actions.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("coach-ai-command error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
