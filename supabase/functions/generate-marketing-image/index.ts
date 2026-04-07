import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Admin access required");

    const { platform, headline, subheadline, cta_text, photo_url, style } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build dimensions based on platform
    const dimensions: Record<string, { w: number; h: number }> = {
      instagram_square: { w: 1080, h: 1080 },
      instagram_story: { w: 1080, h: 1920 },
      facebook_post: { w: 1200, h: 630 },
      tiktok: { w: 1080, h: 1920 },
    };

    const dim = dimensions[platform] || dimensions.instagram_square;

    // Build the image generation prompt
    const photoContext = photo_url
      ? `Use this reference photo of a fitness coach as inspiration: ${photo_url}. `
      : "";

    const styleDesc = style === "dark" 
      ? "dark black marble background with subtle gold accents" 
      : style === "minimal"
      ? "clean white and black minimalist design"
      : "dark premium fitness brand aesthetic with marble textures";

    const prompt = `Create a professional fitness marketing graphic for social media. 
${photoContext}
Design specs:
- ${styleDesc}
- Premium, luxury fitness brand called "Apollo Reborn"
- The image should look like a high-end fitness brand advertisement
- Use bold, clean typography
- Include these text elements prominently displayed:
  ${headline ? `Main headline: "${headline}"` : ""}
  ${subheadline ? `Subheadline: "${subheadline}"` : ""}
  ${cta_text ? `Call to action: "${cta_text}"` : ""}
- The overall aesthetic should be masculine, powerful, and premium
- Use dark tones with gold/white accents
- Make it look like content from a top-tier fitness influencer
- Aspect ratio: ${dim.w}x${dim.h}
- on a clean background`;

    const messages: any[] = [
      {
        role: "user",
        content: photo_url
          ? [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: photo_url } },
            ]
          : prompt,
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages,
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI image generation failed");
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content || "";

    if (!imageUrl) {
      throw new Error("No image was generated");
    }

    // Upload base64 image to storage
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `generated/${Date.now()}-${platform}.png`;

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: uploadError } = await serviceClient.storage
      .from("marketing")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to save generated image");
    }

    const { data: publicUrlData } = serviceClient.storage
      .from("marketing")
      .getPublicUrl(fileName);

    // Save to marketing_posts
    await serviceClient.from("marketing_posts").insert({
      created_by: user.id,
      title: headline || "Marketing Post",
      platform,
      width: dim.w,
      height: dim.h,
      headline,
      subheadline,
      cta_text,
      generated_image_path: fileName,
      status: "draft",
    });

    return new Response(
      JSON.stringify({
        image_url: publicUrlData.publicUrl,
        file_path: fileName,
        message: textResponse,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-marketing-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
