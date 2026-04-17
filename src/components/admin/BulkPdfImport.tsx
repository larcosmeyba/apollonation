import { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Upload, FileText, ImagePlus, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ParsedRecipe {
  title: string;
  description?: string;
  category?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  calories_per_serving?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
  ingredients?: string[];
  instructions?: string;
  dietary_tags?: string[];
}

interface ReviewRecipe extends ParsedRecipe {
  _id: string;
  _selected: boolean;
  _thumbnail_base64: string | null;
  _thumbnail_mime: string | null;
  _thumbnail_preview: string | null;
}

interface Props {
  onComplete: () => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip data:application/pdf;base64,
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const BulkPdfImport = ({ onComplete }: Props) => {
  const { toast } = useToast();
  const [stage, setStage] = useState<"upload" | "processing" | "review" | "saving">("upload");
  const [recipes, setRecipes] = useState<ReviewRecipe[]>([]);
  const [progressMsg, setProgressMsg] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number | null>(null);

  const CHUNK_SIZE = 5; // pages per AI call

  const splitPdfIntoChunks = async (file: File): Promise<string[]> => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const src = await PDFDocument.load(bytes);
    const total = src.getPageCount();
    const chunks: string[] = [];
    for (let start = 0; start < total; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE, total);
      const sub = await PDFDocument.create();
      const pages = await sub.copyPages(src, Array.from({ length: end - start }, (_, i) => start + i));
      pages.forEach((p) => sub.addPage(p));
      const subBytes = await sub.save();
      // base64 encode
      let binary = "";
      const len = subBytes.byteLength;
      for (let i = 0; i < len; i++) binary += String.fromCharCode(subBytes[i]);
      chunks.push(btoa(binary));
    }
    return chunks;
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const f of files) {
      if (f.type !== "application/pdf") {
        toast({ title: `${f.name} is not a PDF`, variant: "destructive" });
        return;
      }
      if (f.size > 50 * 1024 * 1024) {
        toast({ title: `${f.name} exceeds 50MB`, variant: "destructive" });
        return;
      }
    }

    setStage("processing");
    const allRecipes: ReviewRecipe[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgressMsg(`Splitting ${file.name} (${i + 1}/${files.length})…`);
        const chunks = await splitPdfIntoChunks(file);

        setProgressMsg(
          `Extracting recipes from ${file.name} — ${chunks.length} chunk${chunks.length > 1 ? "s" : ""} in parallel…`
        );

        // Run chunks in parallel (3 at a time to avoid rate limits)
        const concurrency = 3;
        const results: ParsedRecipe[][] = [];
        for (let c = 0; c < chunks.length; c += concurrency) {
          const batch = chunks.slice(c, c + concurrency);
          const settled = await Promise.allSettled(
            batch.map((pdfBase64, idx) =>
              supabase.functions.invoke("bulk-import-recipes-pdf", {
                body: { pdfBase64, fileName: `${file.name} [chunk ${c + idx + 1}/${chunks.length}]` },
              })
            )
          );
          settled.forEach((s, idx) => {
            if (s.status === "fulfilled") {
              const { data, error } = s.value;
              if (error || data?.error) {
                console.error("Chunk failed:", error || data?.error);
              } else {
                results.push(data.recipes || []);
              }
            } else {
              console.error("Chunk rejected:", s.reason);
            }
          });
          setProgressMsg(
            `${file.name}: processed ${Math.min(c + concurrency, chunks.length)}/${chunks.length} chunks…`
          );
        }

        for (const parsed of results) {
          for (const r of parsed) {
            allRecipes.push({
              ...r,
              _id: crypto.randomUUID(),
              _selected: true,
              _thumbnail_base64: null,
              _thumbnail_mime: null,
              _thumbnail_preview: null,
            });
          }
        }
      }

      if (allRecipes.length === 0) {
        toast({
          title: "No recipes found",
          description: "Try a different PDF — make sure it contains recipe text.",
          variant: "destructive",
        });
        setStage("upload");
        return;
      }

      setRecipes(allRecipes);
      setStage("review");
      toast({
        title: `${allRecipes.length} recipes extracted`,
        description: "Review, attach photos if you have them, then save.",
      });
    } catch (err: any) {
      toast({
        title: "PDF processing failed",
        description: err.message || "Could not extract recipes",
        variant: "destructive",
      });
      setStage("upload");
    } finally {
      e.target.value = "";
    }
  };

  const toggleSelected = (id: string) => {
    setRecipes((prev) => prev.map((r) => (r._id === id ? { ...r, _selected: !r._selected } : r)));
  };

  const setAll = (val: boolean) => {
    setRecipes((prev) => prev.map((r) => ({ ...r, _selected: val })));
  };

  const handleAttachPhoto = (idx: number) => {
    setActivePhotoIdx(idx);
    photoInputRef.current?.click();
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activePhotoIdx === null) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5MB", variant: "destructive" });
      return;
    }

    const base64 = await fileToBase64(file);
    const dataUrl = await fileToDataUrl(file);

    setRecipes((prev) =>
      prev.map((r, i) =>
        i === activePhotoIdx
          ? {
              ...r,
              _thumbnail_base64: base64,
              _thumbnail_mime: file.type,
              _thumbnail_preview: dataUrl,
            }
          : r
      )
    );
    setActivePhotoIdx(null);
    e.target.value = "";
  };

  const handleSave = async () => {
    const selected = recipes.filter((r) => r._selected);
    if (selected.length === 0) {
      toast({ title: "Select at least one recipe to save", variant: "destructive" });
      return;
    }

    setStage("saving");
    try {
      // Save in batches of 10 to avoid edge function payload limits when photos are attached
      const batchSize = 10;
      let saved = 0;
      for (let i = 0; i < selected.length; i += batchSize) {
        const batch = selected.slice(i, i + batchSize).map((r) => ({
          title: r.title,
          description: r.description || null,
          category: r.category || "main",
          prep_time_minutes: r.prep_time_minutes ?? null,
          cook_time_minutes: r.cook_time_minutes ?? null,
          servings: r.servings ?? null,
          calories_per_serving: r.calories_per_serving ?? null,
          protein_grams: r.protein_grams ?? null,
          carbs_grams: r.carbs_grams ?? null,
          fat_grams: r.fat_grams ?? null,
          ingredients: r.ingredients || [],
          instructions: r.instructions || null,
          dietary_tags: r.dietary_tags || [],
          thumbnail_base64: r._thumbnail_base64,
          thumbnail_mime: r._thumbnail_mime,
        }));

        const { data, error } = await supabase.functions.invoke("save-imported-recipes", {
          body: { recipes: batch },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        saved += data.count || 0;
      }

      toast({
        title: `${saved} recipes saved!`,
        description: "They are now available in your library.",
      });
      onComplete();
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err.message || "Could not save recipes",
        variant: "destructive",
      });
      setStage("review");
    }
  };

  const updateField = <K extends keyof ReviewRecipe>(idx: number, key: K, value: ReviewRecipe[K]) => {
    setRecipes((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  if (stage === "upload") {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <FileText className="w-12 h-12 mx-auto text-primary mb-4" />
          <h3 className="font-heading text-lg mb-2">Bulk PDF Import</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Upload one or more cookbook-style PDFs. AI will extract every recipe — title,
            ingredients, macros, instructions — and you'll review them before they're saved.
          </p>
          <div className="relative inline-block">
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handlePdfUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="bulk-pdf-input"
            />
            <Button variant="apollo" asChild>
              <label htmlFor="bulk-pdf-input" className="cursor-pointer flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                Select PDF(s)
              </label>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Max 20MB per file</p>
        </div>
      </div>
    );
  }

  if (stage === "processing") {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-4" />
        <p className="font-medium text-foreground">{progressMsg}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Hang tight — large cookbooks can take a minute or two.
        </p>
      </div>
    );
  }

  if (stage === "saving") {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-4" />
        <p className="font-medium text-foreground">Saving recipes & uploading photos…</p>
      </div>
    );
  }

  // review stage
  const selectedCount = recipes.filter((r) => r._selected).length;

  return (
    <div className="space-y-4">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelected}
        className="hidden"
      />

      <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-3 border-b border-border">
        <div>
          <h3 className="font-heading text-lg">Review {recipes.length} extracted recipes</h3>
          <p className="text-sm text-muted-foreground">
            {selectedCount} selected · attach photos by clicking each thumbnail slot
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAll(true)}>
            Select all
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAll(false)}>
            Deselect all
          </Button>
          <Button variant="apollo" onClick={handleSave} disabled={selectedCount === 0}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Save {selectedCount} to library
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
        {recipes.map((r, idx) => (
          <Card
            key={r._id}
            className={`p-3 transition ${r._selected ? "border-primary/40" : "opacity-60"}`}
          >
            <div className="flex gap-3">
              <button
                onClick={() => handleAttachPhoto(idx)}
                className="relative w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border hover:border-primary transition group"
                aria-label="Attach photo"
              >
                {r._thumbnail_preview ? (
                  <img src={r._thumbnail_preview} alt={r.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-[10px] mt-1">Add photo</span>
                  </div>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={r._selected}
                    onCheckedChange={() => toggleSelected(r._id)}
                    className="mt-1"
                  />
                  <Input
                    value={r.title}
                    onChange={(e) => updateField(idx, "title", e.target.value)}
                    className="text-sm font-medium h-8"
                  />
                </div>

                <div className="grid grid-cols-4 gap-1 mt-2 text-xs">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Cal</Label>
                    <Input
                      type="number"
                      value={r.calories_per_serving ?? ""}
                      onChange={(e) =>
                        updateField(idx, "calories_per_serving", e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">P</Label>
                    <Input
                      type="number"
                      value={r.protein_grams ?? ""}
                      onChange={(e) =>
                        updateField(idx, "protein_grams", e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">C</Label>
                    <Input
                      type="number"
                      value={r.carbs_grams ?? ""}
                      onChange={(e) =>
                        updateField(idx, "carbs_grams", e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">F</Label>
                    <Input
                      type="number"
                      value={r.fat_grams ?? ""}
                      onChange={(e) =>
                        updateField(idx, "fat_grams", e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground mt-1 truncate">
                  {r.ingredients?.length || 0} ingredients · {r.category || "main"}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BulkPdfImport;
