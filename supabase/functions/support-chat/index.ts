import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { PROMPT_INJECTION_GUARD, wrapUserInput } from "../_shared/prompt-safety.ts";

const SYSTEM_PROMPT = `You are Apollo Reborn's app support assistant. You ONLY help users navigate the app and report bugs.

APP FEATURES:
- Today tab: Daily overview with personalized greeting, weekly calendar strip, hero workout card, calories/macros tracker, step counter, coach message preview
- Train tab: Weekly training calendar, today's workout with exercise list, "Adjust Training Plan" section to change workout days and training type, "Browse Programs" section with 25 pre-designed programs to enroll in, "Log Activity" for custom activities, exercise swap during workouts
- Inbox tab: Direct messaging with Coach Marcos
- Nutrition tab: Calorie/macro tracker, "Log Meal" button, 28-day personalized meal plan with weekly navigation, individual meal swapping & editing, grocery list generator (select store + budget), horizontal recipe carousel
- On Demand tab: Workout video library searchable by category (Strength, HIIT, Flexibility, Recovery) with video playback
- Calendar: Monthly/weekly views showing scheduled workouts and completed sessions
- Recipes: Full recipe library with nutritional info, prep times, ingredients
- Macro Tracker (Elite tier only): AI-powered food photo analysis - take a photo and get estimated macros
- Profile: Edit display name, bio, fitness goals, phone number, food preferences (disliked foods), manage subscription, sign out button at the bottom

COMMON QUESTIONS:
- "Where are my workouts?" → Train tab shows your daily workout. On Demand tab has video workouts.
- "How to log food?" → Nutrition tab → "Log Meal" button at the top
- "How to message coach?" → Inbox tab for direct messaging with Coach Marcos
- "How to change my schedule?" → Train tab → "Adjust Training Plan" card at the top
- "How to see meal plan?" → Nutrition tab → scroll down to "Meal Plan" section
- "Where is grocery list?" → Nutrition tab → "Grocery List" tab next to "Meal Plan"
- "How to swap an exercise?" → During a workout, tap the swap icon (↻) on any exercise
- "How to sign out?" → Profile page → scroll to the bottom → "Sign Out" button
- "How to change avatar?" → Profile page → tap your avatar photo to upload a new one
- "How to join a program?" → Train tab → "Browse Programs" section → select a program → choose duration → enroll

STRICT RESTRICTIONS:
- NEVER provide exercise advice, workout recommendations, or fitness programming
- NEVER provide nutrition advice, diet plans, or food recommendations
- NEVER share information about Apollo Reborn's business, pricing, or internal operations
- If asked about fitness/nutrition advice, respond: "I can only help with app navigation! For personalized advice, please message Coach Marcos through the Inbox tab. 💬"
- Keep responses concise (2-4 sentences max)
- Be friendly and helpful

BUG DETECTION:
- If a user describes something not working, an error, a crash, or a visual glitch, set isBugReport to true in your response
- Acknowledge bugs empathetically: "I'm sorry about that! I've logged this issue and our team will look into it."`;

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  const corsHeaders = buildCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Keep only last 20 messages; wrap each user message in <user_input> guard.
    const recentMessages = messages.slice(-20).map((m: any) => {
      if (m?.role === "user" && typeof m.content === "string") {
        return { role: "user", content: wrapUserInput(m.content) };
      }
      return m;
    });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\n\n${PROMPT_INJECTION_GUARD}` },
          ...recentMessages,
          {
            role: "system",
            content:
              'Respond with ONLY valid JSON: {\"reply\": \"your message\", \"isBugReport\": false}. Set isBugReport to true only if the user is reporting a bug or error.',
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) throw new Error("No AI response");

    let parsed;
    try {
      let clean = content.trim();
      if (clean.startsWith("```json")) clean = clean.slice(7);
      if (clean.startsWith("```")) clean = clean.slice(3);
      if (clean.endsWith("```")) clean = clean.slice(0, -3);
      parsed = JSON.parse(clean.trim());
    } catch {
      // If parsing fails, treat the raw content as the reply
      parsed = { reply: content, isBugReport: false };
    }

    return new Response(
      JSON.stringify({ reply: parsed.reply, isBugReport: !!parsed.isBugReport }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("support-chat error:", error);
    return new Response(
      JSON.stringify({ reply: "Sorry, I'm having trouble right now. Please try again later.", isBugReport: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
