import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2, Search, Download, Plus, Heart, Dumbbell, Salad, Brain, Flame,
  TreePine, Sparkles,
} from "lucide-react";

interface StockImage {
  id: string;
  url: string;
  alt: string;
  category: string;
}

const CATEGORIES = [
  { value: "wellness", label: "Health & Wellness", icon: Heart, color: "text-emerald-500" },
  { value: "recovery", label: "Recovery & Stretching", icon: TreePine, color: "text-sky-500" },
  { value: "nutrition", label: "Nutrition & Meals", icon: Salad, color: "text-amber-500" },
  { value: "training", label: "Training Environments", icon: Dumbbell, color: "text-rose-500" },
  { value: "motivation", label: "Motivation & Lifestyle", icon: Flame, color: "text-violet-500" },
  { value: "mindset", label: "Mindset & Focus", icon: Brain, color: "text-cyan-500" },
];

const CONTENT_IDEAS = [
  { category: "App Features", ideas: ["Custom training plans", "AI-powered meal planning", "Progress tracking dashboard", "In-app messaging with your coach"] },
  { category: "What Sets Us Apart", ideas: ["1-on-1 personalized coaching", "Not a cookie-cutter program", "Plans that adapt to your schedule", "Real coach, real accountability"] },
  { category: "Training Tips", ideas: ["Recovery day essentials", "How to warm up properly", "Progressive overload explained", "Mind-muscle connection tips"] },
  { category: "Wellness Education", ideas: ["Sleep optimization for gains", "Hydration tracking importance", "Stress management for athletes", "Benefits of macro tracking"] },
];

const MarketingStockImages = () => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState<StockImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const searchImages = useCallback(async (category?: string) => {
    setLoading(true);
    const query = category
      ? CATEGORIES.find(c => c.value === category)?.label || category
      : searchQuery;

    if (!query.trim()) {
      setLoading(false);
      return;
    }

    try {
      // Use Unsplash Source for free stock images (no API key needed)
      const terms = `${query} fitness luxury dark`;
      const results: StockImage[] = Array.from({ length: 12 }, (_, i) => ({
        id: `stock-${Date.now()}-${i}`,
        url: `https://source.unsplash.com/800x800/?${encodeURIComponent(terms)}&sig=${Date.now() + i}`,
        alt: `${query} stock image ${i + 1}`,
        category: category || "search",
      }));
      setImages(results);
    } catch {
      toast({ title: "Failed to load images", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const saveToLibrary = async (image: StockImage) => {
    if (!user) return;
    setSavingId(image.id);
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const filePath = `photos/stock-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("marketing")
        .upload(filePath, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      await supabase.from("marketing_photos").insert({
        uploaded_by: user.id,
        file_path: filePath,
        file_name: `stock-${image.category}.jpg`,
        category: "stock",
        tags: [image.category],
      });

      toast({ title: "Saved to photo library" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-heading tracking-wide">Stock Image Suggestions</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Find premium images to balance your feed with informative, lifestyle content</p>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => { setSelectedCategory(cat.value); searchImages(cat.value); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                selectedCategory === cat.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchImages()}
            placeholder="Search for specific images..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => searchImages()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </Button>
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map(image => (
            <div key={image.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border">
              <img src={image.url} alt={image.alt} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="icon" className="h-8 w-8" onClick={() => saveToLibrary(image)} disabled={savingId === image.id}>
                  {savingId === image.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Ideas */}
      <div>
        <h3 className="text-sm font-heading tracking-wide mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Content Category Ideas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONTENT_IDEAS.map(group => (
            <Card key={group.category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{group.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {group.ideas.map(idea => (
                    <li key={idea} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-foreground/30 mt-0.5">•</span>
                      {idea}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketingStockImages;
