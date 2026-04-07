import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Download, Save, Wand2, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: Date;
}

const PROMPT_SUGGESTIONS = [
  "Luxury gym interior with dark lighting and gold accents",
  "Minimalist flat lay of healthy meal prep containers",
  "Close-up of premium dumbbells on dark marble surface",
  "Zen meditation space with soft natural light and plants",
  "Abstract golden light rays on dark textured background",
  "Fresh green smoothie bowl with elegant garnish on stone",
  "Moody shot of a yoga mat and candle in dim lighting",
  "Clean water bottle and towel on polished concrete",
];

const MarketingAIImages = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a description", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-marketing-ai-image", {
        body: { prompt: prompt.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.imageUrl) {
        const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          prompt: prompt.trim(),
          imageUrl: data.imageUrl,
          timestamp: new Date(),
        };
        setGeneratedImages((prev) => [newImage, ...prev]);
        toast({ title: "Image generated!" });
      } else {
        toast({ title: "No image returned", description: "Try a different prompt", variant: "destructive" });
      }
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToLibrary = async (image: GeneratedImage) => {
    if (!user) return;
    setSaving(image.id);
    try {
      // Convert base64 to blob
      const base64Data = image.imageUrl.split(",")[1];
      const byteArray = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: "image/png" });

      const filePath = `ai-generated/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      const { error: uploadError } = await supabase.storage
        .from("marketing")
        .upload(filePath, blob, { contentType: "image/png" });

      if (uploadError) throw uploadError;

      await supabase.from("marketing_photos").insert({
        uploaded_by: user.id,
        file_path: filePath,
        file_name: `ai-${image.prompt.slice(0, 30)}.png`,
        category: "ai-generated",
        tags: ["ai", "generated"],
      });

      toast({ title: "Saved to Photo Library!" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleDownload = (image: GeneratedImage) => {
    const link = document.createElement("a");
    link.href = image.imageUrl;
    link.download = `apollo-ai-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-lg">AI Image Generator</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Describe what you need and AI will create it — luxury, minimal, no people
        </p>
      </div>

      {/* Prompt input */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want… e.g. 'Dark moody shot of premium gym equipment with warm golden lighting'"
            rows={3}
            className="resize-none"
          />

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-1.5">
            {PROMPT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                className="text-[10px] px-2.5 py-1 rounded-full border border-border hover:bg-muted hover:text-foreground transition-colors text-muted-foreground"
              >
                {s}
              </button>
            ))}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            variant="apollo"
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated images */}
      {generatedImages.length === 0 && !generating && (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Describe what you need and AI will create it</p>
          <p className="text-xs mt-1 opacity-70">Images are generated in the Apollo Reborn style — luxury, minimal, no people</p>
        </div>
      )}

      {generating && (
        <div className="flex flex-col items-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Creating your image…</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {generatedImages.map((image) => (
          <Card key={image.id} className="overflow-hidden group">
            <div className="aspect-square bg-muted relative">
              <img
                src={image.imageUrl}
                alt={image.prompt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  onClick={() => handleDownload(image)}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  onClick={() => handleSaveToLibrary(image)}
                  disabled={saving === image.id}
                >
                  {saving === image.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground line-clamp-2">{image.prompt}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MarketingAIImages;
