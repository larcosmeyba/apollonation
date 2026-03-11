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

// Curated luxury stock images — no people, minimal, premium aesthetic
const CURATED_IMAGES: Record<string, { url: string; alt: string }[]> = {
  wellness: [
    { url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80&auto=format", alt: "Yoga mat and candle in serene setting" },
    { url: "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?w=800&q=80&auto=format", alt: "Spa stones stacked on marble" },
    { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&auto=format", alt: "Essential oils and towels" },
    { url: "https://images.unsplash.com/photo-1540555700478-4be289fbec6d?w=800&q=80&auto=format", alt: "Minimal wellness space" },
    { url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80&auto=format", alt: "Steam sauna detail" },
    { url: "https://images.unsplash.com/photo-1552693673-1bf958298935?w=800&q=80&auto=format", alt: "Luxury bath products on marble" },
  ],
  recovery: [
    { url: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80&auto=format", alt: "Foam roller on dark floor" },
    { url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&auto=format", alt: "Ice bath tub in premium gym" },
    { url: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80&auto=format", alt: "Massage gun on dark surface" },
    { url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80&auto=format", alt: "Stretching bands and equipment" },
    { url: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80&auto=format", alt: "Recovery tools flat lay" },
    { url: "https://images.unsplash.com/photo-1519823551278-64ac92734314?w=800&q=80&auto=format", alt: "Minimalist recovery space" },
  ],
  nutrition: [
    { url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80&auto=format", alt: "Clean meal prep bowls" },
    { url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80&auto=format", alt: "Colorful healthy salad on dark plate" },
    { url: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80&auto=format", alt: "Fresh ingredients flat lay" },
    { url: "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&q=80&auto=format", alt: "Protein shake ingredients on marble" },
    { url: "https://images.unsplash.com/photo-1505576399279-0d0b15740f0f?w=800&q=80&auto=format", alt: "Avocado toast on dark surface" },
    { url: "https://images.unsplash.com/photo-1610348725531-acac202c9a51?w=800&q=80&auto=format", alt: "Luxury dining setup with healthy food" },
  ],
  training: [
    { url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format", alt: "Empty premium gym with dark lighting" },
    { url: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=800&q=80&auto=format", alt: "Dumbbells on rack in moody light" },
    { url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80&auto=format", alt: "Barbell plates close-up" },
    { url: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=800&q=80&auto=format", alt: "Kettlebells on dark floor" },
    { url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80&auto=format", alt: "Luxury gym interior" },
    { url: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80&auto=format", alt: "Minimalist weight room" },
  ],
  motivation: [
    { url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80&auto=format", alt: "Sunrise over mountains" },
    { url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80&auto=format", alt: "Misty forest path" },
    { url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80&auto=format", alt: "Luxury watch and journal on marble" },
    { url: "https://images.unsplash.com/photo-1483721310020-03333e577078?w=800&q=80&auto=format", alt: "Dark road leading forward" },
    { url: "https://images.unsplash.com/photo-1465188162913-8fb5709d6d57?w=800&q=80&auto=format", alt: "Ocean waves at golden hour" },
    { url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80&auto=format", alt: "Minimalist mountain landscape" },
  ],
  mindset: [
    { url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80&auto=format", alt: "Journal and coffee on clean desk" },
    { url: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&q=80&auto=format", alt: "Notebook with pen on marble" },
    { url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80&auto=format", alt: "Minimal desk workspace" },
    { url: "https://images.unsplash.com/photo-1476234251651-f353703a034d?w=800&q=80&auto=format", alt: "Meditation space with candles" },
    { url: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=800&q=80&auto=format", alt: "Open book on dark surface" },
    { url: "https://images.unsplash.com/photo-1501139083538-0139583c060f?w=800&q=80&auto=format", alt: "Hourglass on clean background" },
  ],
};

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

  const searchImages = useCallback((category?: string) => {
    setLoading(true);
    const cat = category || selectedCategory;

    if (!cat && !searchQuery.trim()) {
      setLoading(false);
      return;
    }

    // If a category is selected, use curated images
    if (cat && CURATED_IMAGES[cat]) {
      const results: StockImage[] = CURATED_IMAGES[cat].map((img, i) => ({
        id: `stock-${cat}-${i}`,
        url: img.url,
        alt: img.alt,
        category: cat,
      }));
      setImages(results);
      setLoading(false);
      return;
    }

    // For search queries, search across all curated categories
    const query = searchQuery.toLowerCase();
    const results: StockImage[] = [];
    Object.entries(CURATED_IMAGES).forEach(([catKey, imgs]) => {
      imgs.forEach((img, i) => {
        if (img.alt.toLowerCase().includes(query) || catKey.includes(query)) {
          results.push({ id: `stock-${catKey}-${i}`, url: img.url, alt: img.alt, category: catKey });
        }
      });
    });

    // If no matches, show all images
    if (results.length === 0) {
      Object.entries(CURATED_IMAGES).forEach(([catKey, imgs]) => {
        imgs.forEach((img, i) => {
          results.push({ id: `stock-${catKey}-${i}`, url: img.url, alt: img.alt, category: catKey });
        });
      });
    }

    setImages(results);
    setLoading(false);
  }, [searchQuery, selectedCategory]);

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
