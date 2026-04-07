import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Upload, Trash2, Download, Loader2, GripVertical, ChevronLeft, ChevronRight,
  Plus, Eye, ArrowUp, ArrowDown, ImagePlus,
} from "lucide-react";

interface CarouselSlide {
  id: string;
  photoUrl: string;
  file?: File;
  headline: string;
  subheadline: string;
  ctaText: string;
  overlay: string;
  layout: string;
}

const PLATFORM_OPTIONS = [
  { value: "instagram_square", label: "Instagram Post", w: 1080, h: 1080 },
  { value: "instagram_story", label: "Instagram Story", w: 1080, h: 1920 },
  { value: "facebook_post", label: "Facebook Post", w: 1200, h: 630 },
];

const OVERLAY_OPTIONS = [
  { value: "gradient-bottom", label: "Bottom Fade" },
  { value: "gradient-full", label: "Full Darken" },
  { value: "none", label: "No Overlay" },
  { value: "vignette", label: "Vignette" },
];

const LAYOUT_OPTIONS = [
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "center", label: "Center" },
  { value: "top-left", label: "Top Left" },
];

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function applyOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, overlay: string) {
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
}

function drawSlideText(ctx: CanvasRenderingContext2D, W: number, H: number, slide: CarouselSlide) {
  const scale = W / 1080;
  const pad = 72 * scale;
  let textX = pad, textY = H - pad;
  let textAlign: CanvasTextAlign = "left";
  const maxW = W - pad * 2;

  if (slide.layout === "bottom-center") { textX = W / 2; textAlign = "center"; }
  else if (slide.layout === "center") { textX = W / 2; textY = H / 2; textAlign = "center"; }
  else if (slide.layout === "top-left") { textY = pad + 80 * scale; }

  ctx.textAlign = textAlign;

  const headlineFontSize = Math.round(64 * scale);
  const subFontSize = Math.round(22 * scale);
  const ctaFontSize = Math.round(18 * scale);
  const headlineLineH = headlineFontSize * 1.15;

  // Wrap headline
  ctx.font = `700 ${headlineFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  const words = (slide.headline || "").toUpperCase().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);

  const headlineBlockH = lines.length * headlineLineH;
  const subBlockH = slide.subheadline ? subFontSize * 1.5 : 0;
  const ctaBlockH = slide.ctaText ? ctaFontSize * 2.5 : 0;
  const totalH = headlineBlockH + subBlockH + ctaBlockH + 20 * scale;

  let startY = textY;
  if (slide.layout === "bottom-left" || slide.layout === "bottom-center") startY = textY - totalH;
  else if (slide.layout === "center") startY = textY - totalH / 2;

  let curY = startY;

  // Headline
  ctx.font = `700 ${headlineFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillStyle = "#F2F2F2";
  ctx.letterSpacing = `${3 * scale}px`;
  for (const l of lines) { curY += headlineLineH; ctx.fillText(l, textX, curY); }
  ctx.letterSpacing = "0px";
  curY += 12 * scale;

  // Subheadline
  if (slide.subheadline) {
    ctx.font = `300 ${subFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.fillStyle = "rgba(242,242,242,0.8)";
    ctx.letterSpacing = `${1.5 * scale}px`;
    curY += subFontSize * 1.4;
    ctx.fillText(slide.subheadline.toUpperCase(), textX, curY);
    ctx.letterSpacing = "0px";
    curY += 16 * scale;
  }

  // CTA pill
  if (slide.ctaText) {
    curY += 20 * scale;
    ctx.font = `600 ${ctaFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.letterSpacing = `${2 * scale}px`;
    const measuredW = ctx.measureText(slide.ctaText.toUpperCase()).width;
    const pillW = measuredW + 48 * scale;
    const pillH = ctaFontSize * 2.2;
    const pillR = pillH / 2;
    let pillX = textX;
    if (textAlign === "center") pillX = textX - pillW / 2;
    ctx.fillStyle = "#F2F2F2";
    ctx.beginPath();
    ctx.roundRect(pillX, curY, pillW, pillH, pillR);
    ctx.fill();
    ctx.fillStyle = "#0B0B0B";
    ctx.textAlign = "center";
    ctx.fillText(slide.ctaText.toUpperCase(), pillX + pillW / 2, curY + pillH * 0.65);
    ctx.textAlign = textAlign;
    ctx.letterSpacing = "0px";
  }

  // Logo watermark
  const logoSize = Math.round(12 * scale);
  ctx.font = `500 ${logoSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  ctx.fillStyle = "rgba(242,242,242,0.5)";
  ctx.letterSpacing = `${3 * scale}px`;
  ctx.textAlign = "right";
  ctx.fillText("APOLLO REBORN", W - pad, pad - 10 * scale);
  ctx.letterSpacing = "0px";
}

async function renderSlide(canvas: HTMLCanvasElement, slide: CarouselSlide, platform: string) {
  const plat = PLATFORM_OPTIONS.find(p => p.value === platform) || PLATFORM_OPTIONS[0];
  const W = plat.w, H = plat.h;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0B0B0B";
  ctx.fillRect(0, 0, W, H);

  if (slide.photoUrl) {
    const img = await loadImage(slide.photoUrl);
    const imgAspect = img.width / img.height;
    const canvasAspect = W / H;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgAspect > canvasAspect) { sw = img.height * canvasAspect; sx = (img.width - sw) / 2; }
    else { sh = img.width / canvasAspect; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  }

  applyOverlay(ctx, W, H, slide.overlay);
  drawSlideText(ctx, W, H, slide);
}

const MarketingCarousel = () => {
  const { user } = useAuth();
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [platform, setPlatform] = useState("instagram_square");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const activeSlide = slides[activeSlideIndex] || null;

  const addSlides = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newSlides: CarouselSlide[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      photoUrl: URL.createObjectURL(file),
      file,
      headline: "",
      subheadline: "",
      ctaText: "",
      overlay: "gradient-bottom",
      layout: "bottom-left",
    }));
    setSlides(prev => [...prev, ...newSlides]);
    if (slides.length === 0) setActiveSlideIndex(0);
    e.target.value = "";
  };

  const removeSlide = (index: number) => {
    setSlides(prev => prev.filter((_, i) => i !== index));
    if (activeSlideIndex >= slides.length - 1) setActiveSlideIndex(Math.max(0, slides.length - 2));
  };

  const moveSlide = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const updated = [...slides];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSlides(updated);
    setActiveSlideIndex(newIndex);
  };

  const updateSlide = (field: keyof CarouselSlide, value: string) => {
    setSlides(prev => prev.map((s, i) => i === activeSlideIndex ? { ...s, [field]: value } : s));
  };

  // Render preview
  useEffect(() => {
    const timer = setTimeout(async () => {
      const canvas = isPreviewMode ? previewCanvasRef.current : canvasRef.current;
      const slide = isPreviewMode ? slides[previewIndex] : activeSlide;
      if (!canvas || !slide) return;
      try { await renderSlide(canvas, slide, platform); } catch {}
    }, 200);
    return () => clearTimeout(timer);
  }, [activeSlide, slides, previewIndex, platform, isPreviewMode]);

  const handleSaveAll = async () => {
    if (!user || slides.length === 0) return;
    setSaving(true);
    try {
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        // Upload source photo
        let filePath = "";
        if (slide.file) {
          const ext = slide.file.name.split(".").pop();
          filePath = `carousel/${Date.now()}-${i}.${ext}`;
          await supabase.storage.from("marketing").upload(filePath, slide.file, { contentType: slide.file.type });
        }

        // Render final image
        const offscreen = document.createElement("canvas");
        await renderSlide(offscreen, slide, platform);
        const blob = await new Promise<Blob>((res, rej) =>
          offscreen.toBlob(b => b ? res(b) : rej(new Error("export failed")), "image/png", 1.0)
        );
        const genPath = `generated/carousel-${Date.now()}-${i}.png`;
        await supabase.storage.from("marketing").upload(genPath, blob, { contentType: "image/png" });

        const plat = PLATFORM_OPTIONS.find(p => p.value === platform)!;
        await supabase.from("marketing_posts").insert({
          created_by: user.id,
          title: slide.headline || `Carousel Slide ${i + 1}`,
          platform,
          width: plat.w,
          height: plat.h,
          headline: slide.headline,
          subheadline: slide.subheadline,
          cta_text: slide.ctaText,
          generated_image_path: genPath,
          status: "draft",
        });
      }
      toast({ title: `${slides.length} carousel slides saved!` });
      setSlides([]);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const downloadAll = async () => {
    for (let i = 0; i < slides.length; i++) {
      const offscreen = document.createElement("canvas");
      await renderSlide(offscreen, slides[i], platform);
      const a = document.createElement("a");
      a.href = offscreen.toDataURL("image/png", 1.0);
      a.download = `apollo-carousel-${i + 1}.png`;
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading tracking-wide">Carousel Post Editor</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Create multi-image posts for Instagram and Facebook</p>
        </div>
        <div className="flex gap-2">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="cursor-pointer">
            <input type="file" multiple accept="image/*" className="hidden" onChange={addSlides} />
            <Button asChild size="sm"><span><Plus className="w-4 h-4" /> Add Photos</span></Button>
          </label>
        </div>
      </div>

      {slides.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ImagePlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Add photos to start building your carousel post</p>
            <label className="cursor-pointer mt-4 inline-block">
              <input type="file" multiple accept="image/*" className="hidden" onChange={addSlides} />
              <Button asChild variant="outline"><span><Upload className="w-4 h-4" /> Upload Photos</span></Button>
            </label>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Slide list + editor */}
          <div className="space-y-4">
            {/* Slide thumbnails */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Slides ({slides.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {slides.map((slide, i) => (
                    <div key={slide.id} className="relative shrink-0 group">
                      <button
                        onClick={() => { setActiveSlideIndex(i); setIsPreviewMode(false); }}
                        className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          activeSlideIndex === i ? "border-foreground ring-1 ring-foreground" : "border-transparent hover:border-muted-foreground/30"
                        }`}
                      >
                        <img src={slide.photoUrl} alt="" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0.5 left-0.5">
                          <Badge variant="secondary" className="text-[9px] h-4 px-1">{i + 1}</Badge>
                        </div>
                      </button>
                      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <button onClick={() => moveSlide(i, "up")} className="w-4 h-4 rounded bg-background border border-border flex items-center justify-center" disabled={i === 0}>
                          <ArrowUp className="w-2.5 h-2.5" />
                        </button>
                        <button onClick={() => moveSlide(i, "down")} className="w-4 h-4 rounded bg-background border border-border flex items-center justify-center" disabled={i === slides.length - 1}>
                          <ArrowDown className="w-2.5 h-2.5" />
                        </button>
                        <button onClick={() => removeSlide(i)} className="w-4 h-4 rounded bg-destructive text-destructive-foreground flex items-center justify-center">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active slide editor */}
            {activeSlide && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Slide {activeSlideIndex + 1} — Text Overlay</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Headline</label>
                    <Input value={activeSlide.headline} onChange={e => updateSlide("headline", e.target.value)} placeholder="e.g. Train Like a God" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Subheadline</label>
                    <Input value={activeSlide.subheadline} onChange={e => updateSlide("subheadline", e.target.value)} placeholder="e.g. Personalized training" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA</label>
                    <Input value={activeSlide.ctaText} onChange={e => updateSlide("ctaText", e.target.value)} placeholder="e.g. Download Now" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Layout</label>
                      <Select value={activeSlide.layout} onValueChange={v => updateSlide("layout", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LAYOUT_OPTIONS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Overlay</label>
                      <Select value={activeSlide.overlay} onValueChange={v => updateSlide("overlay", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OVERLAY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setIsPreviewMode(true); setPreviewIndex(0); }} className="flex-1" disabled={slides.length === 0}>
                <Eye className="w-4 h-4" /> Preview All
              </Button>
              <Button variant="outline" onClick={downloadAll} className="flex-1" disabled={slides.length === 0}>
                <Download className="w-4 h-4" /> Download All
              </Button>
              <Button onClick={handleSaveAll} disabled={saving || slides.length === 0} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? "Saving..." : "Save All"}
              </Button>
            </div>
          </div>

          {/* Right: Preview */}
          <div>
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    {isPreviewMode ? `Preview ${previewIndex + 1} / ${slides.length}` : `Slide ${activeSlideIndex + 1} Preview`}
                  </CardTitle>
                  {isPreviewMode && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))} disabled={previewIndex === 0}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewIndex(Math.min(slides.length - 1, previewIndex + 1))} disabled={previewIndex >= slides.length - 1}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsPreviewMode(false)}>Exit</Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden border border-border bg-black">
                  {isPreviewMode ? (
                    <canvas ref={previewCanvasRef} className="w-full h-auto" style={{ display: "block" }} />
                  ) : (
                    <canvas ref={canvasRef} className="w-full h-auto" style={{ display: "block" }} />
                  )}
                </div>
                {isPreviewMode && (
                  <div className="flex justify-center gap-1.5 mt-3">
                    {slides.map((_, i) => (
                      <button key={i} onClick={() => setPreviewIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === previewIndex ? "bg-foreground w-4" : "bg-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingCarousel;
