import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Upload, Download, Loader2, Type, Sun, Contrast, ImagePlus, RotateCcw,
  Sparkles, Eye,
} from "lucide-react";

interface EditState {
  brightness: number;
  contrast: number;
  warmth: number;
  textOverlay: string;
  textPosition: string;
  textSize: string;
  showLogo: boolean;
  logoPosition: string;
  tintColor: string;
  tintOpacity: number;
}

const DEFAULT_STATE: EditState = {
  brightness: 100,
  contrast: 100,
  warmth: 0,
  textOverlay: "",
  textPosition: "bottom-center",
  textSize: "medium",
  showLogo: false,
  logoPosition: "top-right",
  tintColor: "none",
  tintOpacity: 15,
};

const TEXT_POSITIONS = [
  { value: "top-left", label: "Top Left" },
  { value: "top-center", label: "Top Center" },
  { value: "top-right", label: "Top Right" },
  { value: "center", label: "Center" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-right", label: "Bottom Right" },
];

const TEXT_SIZES = [
  { value: "small", label: "Small", factor: 0.03 },
  { value: "medium", label: "Medium", factor: 0.05 },
  { value: "large", label: "Large", factor: 0.07 },
  { value: "xl", label: "Extra Large", factor: 0.09 },
];

const TINT_OPTIONS = [
  { value: "none", label: "No Tint" },
  { value: "#0B0B0B", label: "Dark" },
  { value: "#1a1a2e", label: "Navy" },
  { value: "#2d1b3d", label: "Deep Purple" },
  { value: "#1b2d2a", label: "Forest" },
  { value: "#3d2b1b", label: "Warm Bronze" },
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

async function renderEdit(canvas: HTMLCanvasElement, imageUrl: string, state: EditState) {
  const img = await loadImage(imageUrl);
  const W = img.width;
  const H = img.height;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Apply filters
  const filters: string[] = [];
  if (state.brightness !== 100) filters.push(`brightness(${state.brightness}%)`);
  if (state.contrast !== 100) filters.push(`contrast(${state.contrast}%)`);
  if (state.warmth > 0) filters.push(`sepia(${state.warmth}%)`);
  if (state.warmth < 0) filters.push(`hue-rotate(${state.warmth * 2}deg)`);
  ctx.filter = filters.length > 0 ? filters.join(" ") : "none";

  ctx.drawImage(img, 0, 0, W, H);
  ctx.filter = "none";

  // Tint overlay
  if (state.tintColor !== "none") {
    ctx.globalAlpha = state.tintOpacity / 100;
    ctx.fillStyle = state.tintColor;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  const scale = Math.min(W, H) / 1080;
  const pad = 60 * scale;

  // Text overlay
  if (state.textOverlay.trim()) {
    const sizeFactor = TEXT_SIZES.find(s => s.value === state.textSize)?.factor || 0.05;
    const fontSize = Math.round(Math.min(W, H) * sizeFactor);
    const lineH = fontSize * 1.25;

    ctx.font = `700 ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.letterSpacing = `${2 * scale}px`;

    // Wrap text
    const maxW = W - pad * 2;
    const words = state.textOverlay.toUpperCase().split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);

    // Position
    let x: number, y: number;
    let align: CanvasTextAlign = "left";
    const blockH = lines.length * lineH;

    const pos = state.textPosition;
    if (pos.includes("center") && !pos.includes("top") && !pos.includes("bottom")) {
      x = W / 2; y = H / 2 - blockH / 2; align = "center";
    } else if (pos.includes("top")) {
      y = pad;
      if (pos.includes("right")) { x = W - pad; align = "right"; }
      else if (pos.includes("center")) { x = W / 2; align = "center"; }
      else { x = pad; }
    } else {
      y = H - pad - blockH;
      if (pos.includes("right")) { x = W - pad; align = "right"; }
      else if (pos.includes("center")) { x = W / 2; align = "center"; }
      else { x = pad; }
    }

    ctx.textAlign = align;

    // Text shadow for readability
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8 * scale;
    ctx.shadowOffsetY = 2 * scale;
    ctx.fillStyle = "#F2F2F2";

    let curY = y;
    for (const l of lines) {
      curY += lineH;
      ctx.fillText(l, x, curY);
    }
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.letterSpacing = "0px";
  }

  // Apollo Nation logo
  if (state.showLogo) {
    const logoFontSize = Math.round(14 * scale);
    ctx.font = `500 ${logoFontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.fillStyle = "rgba(242,242,242,0.6)";
    ctx.letterSpacing = `${3 * scale}px`;

    const pos = state.logoPosition;
    if (pos === "top-right") { ctx.textAlign = "right"; ctx.fillText("APOLLO NATION", W - pad, pad); }
    else if (pos === "top-left") { ctx.textAlign = "left"; ctx.fillText("APOLLO NATION", pad, pad); }
    else if (pos === "bottom-right") { ctx.textAlign = "right"; ctx.fillText("APOLLO NATION", W - pad, H - pad); }
    else { ctx.textAlign = "left"; ctx.fillText("APOLLO NATION", pad, H - pad); }
    ctx.letterSpacing = "0px";
  }
}

const MarketingQuickEdit = () => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [state, setState] = useState<EditState>({ ...DEFAULT_STATE });
  const [saving, setSaving] = useState(false);

  const update = (field: keyof EditState, value: any) => {
    setState(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setState({ ...DEFAULT_STATE });
    e.target.value = "";
  };

  // Live preview
  useEffect(() => {
    if (!imageUrl) return;
    const timer = setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try { await renderEdit(canvas, imageUrl, state); } catch {}
    }, 150);
    return () => clearTimeout(timer);
  }, [imageUrl, state]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png", 1.0);
    a.download = `apollo-edited-${Date.now()}.png`;
    a.click();
  };

  const handleSave = async () => {
    if (!user || !canvasRef.current) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob>((res, rej) =>
        canvasRef.current!.toBlob(b => b ? res(b) : rej(new Error("export failed")), "image/png", 1.0)
      );
      const filePath = `generated/edited-${Date.now()}.png`;
      const { error } = await supabase.storage.from("marketing").upload(filePath, blob, { contentType: "image/png" });
      if (error) throw error;

      await supabase.from("marketing_posts").insert({
        created_by: user.id,
        title: state.textOverlay || "Quick Edit",
        platform: "instagram_square",
        width: canvasRef.current!.width,
        height: canvasRef.current!.height,
        headline: state.textOverlay,
        generated_image_path: filePath,
        status: "draft",
      });

      toast({ title: "Saved to library" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setState({ ...DEFAULT_STATE });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-heading tracking-wide">Quick Photo Edit</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Make small adjustments — text overlays, brightness, color, and branding</p>
      </div>

      {!imageUrl ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ImagePlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Upload a photo to start editing</p>
            <label className="cursor-pointer mt-4 inline-block">
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <Button asChild variant="outline"><span><Upload className="w-4 h-4" /> Choose Photo</span></Button>
            </label>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Controls */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <label className="cursor-pointer flex-1">
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <Button asChild variant="outline" className="w-full" size="sm"><span><Upload className="w-4 h-4" /> Change Photo</span></Button>
              </label>
              <Button variant="ghost" size="sm" onClick={handleReset}><RotateCcw className="w-4 h-4" /> Reset</Button>
            </div>

            {/* Adjustments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Sun className="w-4 h-4" /> Adjustments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs text-muted-foreground">Brightness</label>
                    <span className="text-xs text-muted-foreground">{state.brightness}%</span>
                  </div>
                  <Slider value={[state.brightness]} onValueChange={([v]) => update("brightness", v)} min={30} max={170} step={1} />
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs text-muted-foreground">Contrast</label>
                    <span className="text-xs text-muted-foreground">{state.contrast}%</span>
                  </div>
                  <Slider value={[state.contrast]} onValueChange={([v]) => update("contrast", v)} min={50} max={150} step={1} />
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs text-muted-foreground">Warmth</label>
                    <span className="text-xs text-muted-foreground">{state.warmth > 0 ? `+${state.warmth}` : state.warmth}</span>
                  </div>
                  <Slider value={[state.warmth]} onValueChange={([v]) => update("warmth", v)} min={-30} max={30} step={1} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Color Tint</label>
                  <div className="flex gap-2">
                    {TINT_OPTIONS.map(t => (
                      <button key={t.value} onClick={() => update("tintColor", t.value)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${state.tintColor === t.value ? "border-foreground ring-1 ring-foreground" : "border-border"}`}
                        style={{ backgroundColor: t.value === "none" ? "transparent" : t.value }}
                        title={t.label}
                      >
                        {t.value === "none" && <span className="text-[8px] text-muted-foreground">OFF</span>}
                      </button>
                    ))}
                  </div>
                  {state.tintColor !== "none" && (
                    <div className="mt-2">
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-muted-foreground">Tint Strength</label>
                        <span className="text-xs text-muted-foreground">{state.tintOpacity}%</span>
                      </div>
                      <Slider value={[state.tintOpacity]} onValueChange={([v]) => update("tintOpacity", v)} min={5} max={50} step={1} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Text Overlay */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Type className="w-4 h-4" /> Text Overlay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={state.textOverlay} onChange={e => update("textOverlay", e.target.value)} placeholder="Add text to your image..." />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Position</label>
                    <Select value={state.textPosition} onValueChange={v => update("textPosition", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TEXT_POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Size</label>
                    <Select value={state.textSize} onValueChange={v => update("textSize", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TEXT_SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Branding */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" /> Branding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={state.showLogo} onChange={e => update("showLogo", e.target.checked)} className="rounded border-border" />
                  <span className="text-muted-foreground text-xs">Add "Apollo Nation" logo</span>
                </label>
                {state.showLogo && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Logo Position</label>
                    <Select value={state.logoPosition} onValueChange={v => update("logoPosition", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDownload} className="flex-1">
                <Download className="w-4 h-4" /> Download
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {saving ? "Saving..." : "Save to Library"}
              </Button>
            </div>
          </div>

          {/* Right: Preview */}
          <div>
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4" /> Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden border border-border bg-black">
                  <canvas ref={canvasRef} className="w-full h-auto" style={{ display: "block" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">Your photo stays untouched — only overlays are applied</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingQuickEdit;
