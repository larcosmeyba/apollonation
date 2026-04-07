import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Image,
  Upload,
  Sparkles,
  Trash2,
  Download,
  Loader2,
  ImagePlus,
  LayoutGrid,
  Eye,
  Layers,
  Search,
  Pencil,
  Wand2,
} from "lucide-react";
import MarketingCarousel from "./marketing/MarketingCarousel";

import MarketingQuickEdit from "./marketing/MarketingQuickEdit";

interface MarketingPhoto {
  id: string;
  file_path: string;
  file_name: string;
  category: string;
  tags: string[];
  created_at: string;
}

interface MarketingPost {
  id: string;
  title: string;
  platform: string;
  headline: string | null;
  subheadline: string | null;
  cta_text: string | null;
  generated_image_path: string | null;
  status: string;
  created_at: string;
}

const PLATFORM_OPTIONS = [
  { value: "instagram_square", label: "Instagram Post", dimensions: "1080×1080", w: 1080, h: 1080 },
  { value: "instagram_story", label: "Instagram Story / Reel", dimensions: "1080×1920", w: 1080, h: 1920 },
  { value: "facebook_post", label: "Facebook Post", dimensions: "1200×630", w: 1200, h: 630 },
  { value: "tiktok", label: "TikTok", dimensions: "1080×1920", w: 1080, h: 1920 },
];

const LAYOUT_OPTIONS = [
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "center", label: "Center" },
  { value: "top-left", label: "Top Left" },
  { value: "split", label: "Split (Photo Left, Text Right)" },
];

const OVERLAY_OPTIONS = [
  { value: "gradient-bottom", label: "Bottom Fade" },
  { value: "gradient-full", label: "Full Darken" },
  { value: "none", label: "No Overlay" },
  { value: "vignette", label: "Vignette" },
];

const HEADLINE_SUGGESTIONS = [
  "Train Like a God",
  "Your Body. Your Temple.",
  "Built Different.",
  "Join Apollo Reborn",
  "Unlock Your Potential",
  "Personalized Coaching",
  "Stop Guessing. Start Training.",
  "The App That Trains You",
  "Elevate Everything",
  "Discipline Over Motivation",
  "Results Speak Louder",
  "Your Transformation Starts Here",
];

/**
 * Draws a luxury marketing image on the given canvas.
 * The photo is placed untouched — only gradient overlays + typography are added.
 */
async function renderCanvas(
  canvas: HTMLCanvasElement,
  options: {
    photoUrl: string | null;
    platform: string;
    layout: string;
    overlay: string;
    headline: string;
    subheadline: string;
    ctaText: string;
    showLogo: boolean;
  }
) {
  const plat = PLATFORM_OPTIONS.find((p) => p.value === options.platform) || PLATFORM_OPTIONS[0];
  const W = plat.w;
  const H = plat.h;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background — matte black
  ctx.fillStyle = "#0B0B0B";
  ctx.fillRect(0, 0, W, H);

  // Load and draw photo untouched
  if (options.photoUrl) {
    const img = await loadImage(options.photoUrl);
    const imgAspect = img.width / img.height;
    const canvasAspect = W / H;

    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgAspect > canvasAspect) {
      sw = img.height * canvasAspect;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / canvasAspect;
      sy = (img.height - sh) / 2;
    }

    if (options.layout === "split") {
      // Photo on left half
      const halfW = W * 0.55;
      const splitAspect = halfW / H;
      let ssx = 0, ssy = 0, ssw = img.width, ssh = img.height;
      if (imgAspect > splitAspect) {
        ssw = img.height * splitAspect;
        ssx = (img.width - ssw) / 2;
      } else {
        ssh = img.width / splitAspect;
        ssy = (img.height - ssh) / 2;
      }
      ctx.drawImage(img, ssx, ssy, ssw, ssh, 0, 0, halfW, H);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    }
  }

  // Apply overlay
  applyOverlay(ctx, W, H, options.overlay, options.layout);

  // Typography
  drawText(ctx, W, H, options);
}

function applyOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  overlay: string,
  layout: string
) {
  if (overlay === "none") return;

  if (overlay === "gradient-bottom") {
    const grad = ctx.createLinearGradient(0, H * 0.35, 0, H);
    grad.addColorStop(0, "rgba(11,11,11,0)");
    grad.addColorStop(0.5, "rgba(11,11,11,0.55)");
    grad.addColorStop(1, "rgba(11,11,11,0.92)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (overlay === "gradient-full") {
    ctx.fillStyle = "rgba(11,11,11,0.55)";
    ctx.fillRect(0, 0, W, H);
  } else if (overlay === "vignette") {
    const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.85);
    grad.addColorStop(0, "rgba(11,11,11,0)");
    grad.addColorStop(1, "rgba(11,11,11,0.75)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  if (layout === "split") {
    // Darken right side for text
    const grad = ctx.createLinearGradient(W * 0.4, 0, W * 0.55, 0);
    grad.addColorStop(0, "rgba(11,11,11,0)");
    grad.addColorStop(1, "rgba(11,11,11,0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(W * 0.4, 0, W * 0.6, H);
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  options: {
    layout: string;
    headline: string;
    subheadline: string;
    ctaText: string;
    showLogo: boolean;
  }
) {
  const scale = W / 1080; // normalize to 1080 base
  const pad = 72 * scale;

  // Positions based on layout
  let textX: number;
  let textY: number;
  let textAlign: CanvasTextAlign = "left";
  let maxW = W - pad * 2;

  switch (options.layout) {
    case "bottom-center":
      textX = W / 2;
      textY = H - pad;
      textAlign = "center";
      break;
    case "center":
      textX = W / 2;
      textY = H / 2;
      textAlign = "center";
      break;
    case "top-left":
      textX = pad;
      textY = pad + 80 * scale;
      break;
    case "split":
      textX = W * 0.6;
      textY = H / 2 - 60 * scale;
      maxW = W * 0.35;
      break;
    case "bottom-left":
    default:
      textX = pad;
      textY = H - pad;
      break;
  }

  ctx.textAlign = textAlign;

  // Helper to wrap text
  const wrapText = (text: string, fontSize: number, lineHeight: number, maxWidth: number) => {
    ctx.font = `700 ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  // Calculate text block height to position from bottom
  const headlineFontSize = Math.round(64 * scale);
  const subFontSize = Math.round(22 * scale);
  const ctaFontSize = Math.round(18 * scale);
  const headlineLineH = headlineFontSize * 1.15;

  const headlineLines = options.headline ? wrapText(options.headline.toUpperCase(), headlineFontSize, headlineLineH, maxW) : [];
  const headlineBlockH = headlineLines.length * headlineLineH;
  const subBlockH = options.subheadline ? subFontSize * 1.5 : 0;
  const ctaBlockH = options.ctaText ? ctaFontSize * 2.5 : 0;
  const totalH = headlineBlockH + subBlockH + ctaBlockH + 20 * scale;

  // Adjust Y for bottom layouts — text should grow upward
  let startY = textY;
  if (options.layout === "bottom-left" || options.layout === "bottom-center") {
    startY = textY - totalH;
  } else if (options.layout === "center") {
    startY = textY - totalH / 2;
  }

  let curY = startY;

  // Draw headline — bold, tracked, uppercase
  if (options.headline) {
    ctx.font = `700 ${headlineFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.fillStyle = "#F2F2F2";
    ctx.letterSpacing = `${3 * scale}px`;

    for (const line of headlineLines) {
      curY += headlineLineH;
      ctx.fillText(line, textX, curY);
    }
    ctx.letterSpacing = "0px";
    curY += 12 * scale;
  }

  // Draw subheadline — light weight, smaller
  if (options.subheadline) {
    ctx.font = `300 ${subFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.fillStyle = "rgba(242,242,242,0.8)";
    ctx.letterSpacing = `${1.5 * scale}px`;
    curY += subFontSize * 1.4;
    ctx.fillText(options.subheadline.toUpperCase(), textX, curY);
    ctx.letterSpacing = "0px";
    curY += 16 * scale;
  }

  // Draw CTA — pill / bar style
  if (options.ctaText) {
    curY += 20 * scale;
    const ctaW = ctx.measureText(options.ctaText.toUpperCase()).width;
    ctx.font = `600 ${ctaFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.letterSpacing = `${2 * scale}px`;
    const measuredW = ctx.measureText(options.ctaText.toUpperCase()).width;
    const pillW = measuredW + 48 * scale;
    const pillH = ctaFontSize * 2.2;
    const pillR = pillH / 2;

    let pillX = textX;
    if (textAlign === "left") pillX = textX;
    else if (textAlign === "center") pillX = textX - pillW / 2;

    // Pill background
    ctx.fillStyle = "#F2F2F2";
    ctx.beginPath();
    ctx.roundRect(pillX, curY, pillW, pillH, pillR);
    ctx.fill();

    // Pill text
    ctx.fillStyle = "#0B0B0B";
    ctx.textAlign = "center";
    ctx.fillText(options.ctaText.toUpperCase(), pillX + pillW / 2, curY + pillH * 0.65);
    ctx.textAlign = textAlign; // restore
    ctx.letterSpacing = "0px";
  }

  // Subtle logo text in corner
  if (options.showLogo) {
    const logoSize = Math.round(12 * scale);
    ctx.font = `500 ${logoSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.fillStyle = "rgba(242,242,242,0.5)";
    ctx.letterSpacing = `${3 * scale}px`;
    ctx.textAlign = "right";
    ctx.fillText("APOLLO REBORN", W - pad, pad - 10 * scale);
    ctx.letterSpacing = "0px";
    ctx.textAlign = textAlign;
  }

  // Thin accent line
  if (options.headline && (options.layout === "bottom-left" || options.layout === "top-left")) {
    ctx.strokeStyle = "rgba(242,242,242,0.25)";
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(textX, startY + headlineLineH * 0.3);
    ctx.lineTo(textX, startY + headlineBlockH + 6 * scale);
    ctx.stroke();
    // Shift text slightly right for the line accent
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const AdminMarketing = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("create");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Photo library
  const [photos, setPhotos] = useState<MarketingPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  // Generator form
  const [platform, setPlatform] = useState("instagram_square");
  const [layout, setLayout] = useState("bottom-left");
  const [overlay, setOverlay] = useState("gradient-bottom");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [showLogo, setShowLogo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  // Generated posts
  const [posts, setPosts] = useState<MarketingPost[]>([]);

  const fetchPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("marketing_photos")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setPhotos(data as MarketingPhoto[]);
  }, []);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("marketing_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setPosts(data as MarketingPost[]);
  }, []);

  useEffect(() => {
    fetchPhotos();
    fetchPosts();
  }, [fetchPhotos, fetchPosts]);

  const getPhotoUrl = (filePath: string) => {
    const { data } = supabase.storage.from("marketing").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Live preview — re-render canvas whenever form changes
  useEffect(() => {
    const timer = setTimeout(() => {
      updatePreview();
    }, 200);
    return () => clearTimeout(timer);
  }, [platform, layout, overlay, headline, subheadline, ctaText, selectedPhotoId, showLogo, photos]);

  const updatePreview = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    let photoUrl: string | null = null;
    if (selectedPhotoId) {
      const photo = photos.find((p) => p.id === selectedPhotoId);
      if (photo) photoUrl = getPhotoUrl(photo.file_path);
    }

    try {
      await renderCanvas(canvas, {
        photoUrl,
        platform,
        layout,
        overlay,
        headline: headline || "YOUR HEADLINE",
        subheadline,
        ctaText,
        showLogo,
      });
      setPreviewReady(true);
    } catch {
      setPreviewReady(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const filePath = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("marketing")
          .upload(filePath, file, { contentType: file.type });

        if (uploadError) {
          toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
          continue;
        }

        await supabase.from("marketing_photos").insert({
          uploaded_by: user.id,
          file_path: filePath,
          file_name: file.name,
          category: "personal",
          tags: [],
        });
      }

      toast({ title: "Photos uploaded successfully" });
      fetchPhotos();
    } catch {
      toast({ title: "Upload error", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeletePhoto = async (photo: MarketingPhoto) => {
    await supabase.storage.from("marketing").remove([photo.file_path]);
    await supabase.from("marketing_photos").delete().eq("id", photo.id);
    fetchPhotos();
    if (selectedPhotoId === photo.id) setSelectedPhotoId(null);
    toast({ title: "Photo removed" });
  };

  const handleSave = async () => {
    if (!headline) {
      toast({ title: "Please add a headline", variant: "destructive" });
      return;
    }
    if (!selectedPhotoId) {
      toast({ title: "Please select a photo", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Render full-res canvas
      const offscreen = document.createElement("canvas");
      const photo = photos.find((p) => p.id === selectedPhotoId);
      const photoUrl = photo ? getPhotoUrl(photo.file_path) : null;

      await renderCanvas(offscreen, {
        photoUrl,
        platform,
        layout,
        overlay,
        headline,
        subheadline,
        ctaText,
        showLogo,
      });

      // Export to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        offscreen.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
          "image/png",
          1.0
        );
      });

      const fileName = `generated/${Date.now()}-${platform}.png`;
      const { error: uploadError } = await supabase.storage
        .from("marketing")
        .upload(fileName, blob, { contentType: "image/png", upsert: true });

      if (uploadError) throw uploadError;

      const plat = PLATFORM_OPTIONS.find((p) => p.value === platform) || PLATFORM_OPTIONS[0];
      await supabase.from("marketing_posts").insert({
        created_by: user!.id,
        title: headline || "Marketing Post",
        platform,
        width: plat.w,
        height: plat.h,
        headline,
        subheadline,
        cta_text: ctaText,
        generated_image_path: fileName,
        status: "draft",
      });

      fetchPosts();
      toast({ title: "Marketing image saved!" });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPreview = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png", 1.0);
    a.download = `apollo-${platform}.png`;
    a.click();
  };

  const handleDeletePost = async (post: MarketingPost) => {
    if (post.generated_image_path) {
      await supabase.storage.from("marketing").remove([post.generated_image_path]);
    }
    await supabase.from("marketing_posts").delete().eq("id", post.id);
    fetchPosts();
    toast({ title: "Post deleted" });
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading tracking-wide">Marketing Content</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create luxury promotional graphics — your photos stay untouched, only text overlays are added
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="create" className="gap-2">
            <Sparkles className="w-4 h-4" /> Create
          </TabsTrigger>
          <TabsTrigger value="carousel" className="gap-2">
            <Layers className="w-4 h-4" /> Carousel
          </TabsTrigger>
          <TabsTrigger value="quick-edit" className="gap-2">
            <Pencil className="w-4 h-4" /> Quick Edit
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <LayoutGrid className="w-4 h-4" /> Photo Library
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-2">
            <Image className="w-4 h-4" /> Saved Posts
          </TabsTrigger>
        </TabsList>

        {/* ─── CREATE TAB ─── */}
        <TabsContent value="create" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Platform & Layout</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Platform</label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label} ({p.dimensions})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Text Position</label>
                      <Select value={layout} onValueChange={setLayout}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LAYOUT_OPTIONS.map((l) => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Overlay</label>
                      <Select value={overlay} onValueChange={setOverlay}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OVERLAY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Text Overlay</CardTitle>
                  <CardDescription>Clean, luxury typography over your photo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Headline *</label>
                    <Input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. Train Like a God"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {HEADLINE_SUGGESTIONS.map((h) => (
                        <button
                          key={h}
                          onClick={() => setHeadline(h)}
                          className="text-[10px] px-2 py-1 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subheadline</label>
                    <Input
                      value={subheadline}
                      onChange={(e) => setSubheadline(e.target.value)}
                      placeholder="e.g. Personalized training & nutrition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Call to Action</label>
                    <Input
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="e.g. Download Now"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLogo}
                      onChange={(e) => setShowLogo(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="text-muted-foreground">Show "Apollo Reborn" watermark</span>
                  </label>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select Photo</CardTitle>
                  <CardDescription>Your photo stays completely untouched</CardDescription>
                </CardHeader>
                <CardContent>
                  {photos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No photos uploaded yet. Go to Photo Library to upload.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {photos.map((photo) => (
                        <button
                          key={photo.id}
                          onClick={() => setSelectedPhotoId(selectedPhotoId === photo.id ? null : photo.id)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selectedPhotoId === photo.id
                              ? "border-foreground ring-1 ring-foreground"
                              : "border-transparent hover:border-muted-foreground/30"
                          }`}
                        >
                          <img
                            src={getPhotoUrl(photo.file_path)}
                            alt={photo.file_name}
                            className="w-full h-full object-cover"
                          />
                          {selectedPhotoId === photo.id && (
                            <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                                <span className="text-background text-xs">✓</span>
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  onClick={handleDownloadPreview}
                  disabled={!previewReady}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !headline || !selectedPhotoId}
                  className="flex-1"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Save to Library
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right: Live Preview */}
            <div>
              <Card className="sticky top-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Live Preview
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px]">
                      {PLATFORM_OPTIONS.find((p) => p.value === platform)?.dimensions}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg overflow-hidden border border-border bg-black">
                    <canvas
                      ref={previewCanvasRef}
                      className="w-full h-auto"
                      style={{ display: "block" }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    What you see is what you get — no AI modifications to your photo
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── CAROUSEL TAB ─── */}
        <TabsContent value="carousel" className="mt-4">
          <MarketingCarousel />
        </TabsContent>

        {/* ─── QUICK EDIT TAB ─── */}
        <TabsContent value="quick-edit" className="mt-4">
          <MarketingQuickEdit />
        </TabsContent>


        {/* ─── PHOTO LIBRARY TAB ─── */}
        <TabsContent value="library" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Photo Library</CardTitle>
                  <CardDescription>
                    Upload photos of yourself, app screenshots, and brand assets
                  </CardDescription>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                  <Button asChild size="sm" disabled={uploading}>
                    <span>
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Upload Photos
                    </span>
                  </Button>
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Image className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No photos uploaded yet</p>
                  <p className="text-xs mt-1">Upload fitness photos, app screenshots, and brand assets</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border">
                      <img
                        src={getPhotoUrl(photo.file_path)}
                        alt={photo.file_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeletePhoto(photo)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Badge
                        variant="secondary"
                        className="absolute bottom-1 left-1 text-[9px] bg-background/80"
                      >
                        {photo.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── SAVED POSTS TAB ─── */}
        <TabsContent value="posts" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Saved Posts</CardTitle>
              <CardDescription>Your previously created marketing content</CardDescription>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No posts created yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map((post) => (
                    <div key={post.id} className="rounded-lg border border-border overflow-hidden group">
                      {post.generated_image_path ? (
                        <img
                          src={getPhotoUrl(post.generated_image_path)}
                          alt={post.title}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-muted flex items-center justify-center">
                          <Image className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{post.headline || post.title}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                            {post.platform.replace("_", " ")}
                          </Badge>
                        </div>
                        {post.subheadline && (
                          <p className="text-xs text-muted-foreground truncate">{post.subheadline}</p>
                        )}
                        <div className="flex gap-2">
                          {post.generated_image_path && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-xs"
                              onClick={() =>
                                handleDownload(
                                  getPhotoUrl(post.generated_image_path!),
                                  `apollo-${post.platform}.png`
                                )
                              }
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDeletePost(post)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hidden full-res canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default AdminMarketing;
