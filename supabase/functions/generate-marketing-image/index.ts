import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildCorsHeaders, handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { validateExternalImageUrl } from "../_shared/url-validator.ts";

// Whitelisted style/platform values to prevent prompt-content injection via these enums.
const ALLOWED_PLATFORMS = new Set([
  "instagram_square",
  "instagram_story",
  "facebook_post",
  "tiktok",
]);
const ALLOWED_STYLES = new Set(["dark", "minimal", "premium"]);

function sanitizeText(input: unknown, maxLen = 200): string {
  if (typeof input !== "string") return "";
  return input.replace(/[\r\n\t]+/g, " ").slice(0, maxLen).trim();
}

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  const corsHeaders = buildCorsHeaders(req);

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

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Admin access required");

    const body = await req.json().catch(() => ({}));
    const platform = ALLOWED_PLATFORMS.has(body.platform) ? body.platform : "instagram_square";
    const headline = sanitizeText(body.headline);
    const subheadline = sanitizeText(body.subheadline);
    const cta_text = sanitizeText(body.cta_text, 80);
    const style = ALLOWED_STYLES.has(body.style) ? body.style : "premium";
    const photo_url = typeof body.photo_url === "string" ? body.photo_url : null;

    // ── SSRF VALIDATION: any user-supplied photo_url must be in the allowlist
    //    AND resolve to a public IP (no RFC1918, loopback, link-local, etc.)
    if (photo_url) {
      const v = await validateExternalImageUrl(photo_url);
      if (!v.ok) {
        console.warn("[generate-marketing-image] Rejected photo_url", { reason: v.reason });
        return jsonResponse(
          req,
          { error: "Invalid photo URL — must be HTTPS, hosted on an allowed domain, and resolve to a public IP." },
          400,
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const dimensions: Record<string, { w: number; h: number }> = {
      instagram_square: { w: 1080, h: 1080 },
      instagram_story: { w: 1080, h: 1920 },
      facebook_post: { w: 1200, h: 630 },
      tiktok: { w: 1080, h: 1920 },
    };
    const dim = dimensions[platform] || dimensions.instagram_square;

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
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages,
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse(req, { error: "Rate limit exceeded. Please try again in a moment." }, 429);
      }
      if (response.status === 402) {
        return jsonResponse(req, { error: "AI credits exhausted. Please add credits in Settings." }, 402);
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI image generation failed");
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content || "";

    if (!imageUrl) throw new Error("No image was generated");

    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `generated/${Date.now()}-${platform}.png`;

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { error: uploadError } = await serviceClient.storage
      .from("marketing")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to save generated image");
    }

    const { data: publicUrlData } = serviceClient.storage.from("marketing").getPublicUrl(fileName);

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

    return jsonResponse(req, {
      image_url: publicUrlData.publicUrl,
      file_path: fileName,
      message: textResponse,
    });
  } catch (e) {
    console.error("generate-marketing-image error:", e instanceof Error ? e.message : String(e));
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
