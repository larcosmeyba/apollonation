import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Sparkles, FileText, Loader2, Upload, Library, Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import BulkPdfImport from "./BulkPdfImport";

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  calories_per_serving: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  ingredients: unknown;
  instructions: string | null;
  thumbnail_url: string | null;
  dietary_tags: string[] | null;
}

const AdminRecipes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(1);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "title" | "calories">("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "main",
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    servings: 2,
    calories_per_serving: 300,
    protein_grams: 25,
    carbs_grams: 30,
    fat_grams: 10,
    ingredients: "",
    instructions: "",
    thumbnail_url: "",
    dietary_tags: "",
  });

  const { data: recipes, isLoading } = useQuery({
    queryKey: ["admin-recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Recipe[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const ingredientsList = data.ingredients.split("\n").filter(Boolean);
      const tagsList = data.dietary_tags.split(",").map((t) => t.trim()).filter(Boolean);
      
      const { error } = await supabase.from("recipes").insert({
        title: data.title,
        description: data.description || null,
        category: data.category,
        prep_time_minutes: data.prep_time_minutes || null,
        cook_time_minutes: data.cook_time_minutes || null,
        servings: data.servings || null,
        calories_per_serving: data.calories_per_serving || null,
        protein_grams: data.protein_grams || null,
        carbs_grams: data.carbs_grams || null,
        fat_grams: data.fat_grams || null,
        ingredients: ingredientsList,
        instructions: data.instructions || null,
        thumbnail_url: data.thumbnail_url || null,
        dietary_tags: tagsList.length > 0 ? tagsList : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      toast({ title: "Recipe created successfully" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error creating recipe", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const ingredientsList = data.ingredients.split("\n").filter(Boolean);
      const tagsList = data.dietary_tags.split(",").map((t) => t.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from("recipes")
        .update({
          title: data.title,
          description: data.description || null,
          category: data.category,
          prep_time_minutes: data.prep_time_minutes || null,
          cook_time_minutes: data.cook_time_minutes || null,
          servings: data.servings || null,
          calories_per_serving: data.calories_per_serving || null,
          protein_grams: data.protein_grams || null,
          carbs_grams: data.carbs_grams || null,
          fat_grams: data.fat_grams || null,
          ingredients: ingredientsList,
          instructions: data.instructions || null,
          thumbnail_url: data.thumbnail_url || null,
          dietary_tags: tagsList.length > 0 ? tagsList : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      toast({ title: "Recipe updated successfully" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error updating recipe", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      toast({ title: "Recipe deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting recipe", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("recipes").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      toast({ title: `Deleted ${ids.length} recipe(s)` });
      setSelectedIds(new Set());
    },
    onError: (error) => {
      toast({ title: "Bulk delete failed", description: error.message, variant: "destructive" });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredRecipes = (recipes || [])
    .filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "calories") return (b.calories_per_serving || 0) - (a.calories_per_serving || 0);
      return 0; // newest is the default order from query
    });

  const allFilteredSelected = filteredRecipes.length > 0 && filteredRecipes.every((r) => selectedIds.has(r.id));
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecipes.map((r) => r.id)));
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "main",
      prep_time_minutes: 10,
      cook_time_minutes: 20,
      servings: 2,
      calories_per_serving: 300,
      protein_grams: 25,
      carbs_grams: 30,
      fat_grams: 10,
      ingredients: "",
      instructions: "",
      thumbnail_url: "",
      dietary_tags: "",
    });
    setEditingRecipe(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    const ingredients = Array.isArray(recipe.ingredients) 
      ? (recipe.ingredients as string[]).join("\n") 
      : "";
    const tags = recipe.dietary_tags?.join(", ") || "";
    
    setFormData({
      title: recipe.title,
      description: recipe.description || "",
      category: recipe.category || "main",
      prep_time_minutes: recipe.prep_time_minutes || 0,
      cook_time_minutes: recipe.cook_time_minutes || 0,
      servings: recipe.servings || 0,
      calories_per_serving: recipe.calories_per_serving || 0,
      protein_grams: recipe.protein_grams || 0,
      carbs_grams: recipe.carbs_grams || 0,
      fat_grams: recipe.fat_grams || 0,
      ingredients,
      instructions: recipe.instructions || "",
      thumbnail_url: recipe.thumbnail_url || "",
      dietary_tags: tags,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecipe) {
      updateMutation.mutate({ id: editingRecipe.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-recipes", {
        body: { mode: "ai", prompt: aiPrompt, count: aiCount },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: `${data.count} recipe(s) created!`,
        description: "AI-generated recipes have been added to your library.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
      setAiPrompt("");
    } catch (err: any) {
      toast({
        title: "Generation failed",
        description: err.message || "Could not generate recipes",
        variant: "destructive",
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({ title: "Please upload a PDF file", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10MB", variant: "destructive" });
      return;
    }

    setPdfProcessing(true);

    try {
      // Read PDF as text using FileReader — we'll extract text client-side
      // For PDFs, we'll read as ArrayBuffer and send the base64 to the edge function
      // Actually, let's extract text from PDF on the client side using a simple approach
      const text = await extractTextFromPdf(file);

      if (!text || text.trim().length < 20) {
        toast({
          title: "Could not extract text",
          description: "The PDF may be image-based or empty. Try a text-based PDF.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-recipes", {
        body: { mode: "pdf", pdfText: text.substring(0, 15000) }, // Limit to prevent token overflow
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: `${data.count} recipe(s) extracted!`,
        description: "Recipes from your PDF have been added to the library.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
    } catch (err: any) {
      toast({
        title: "PDF processing failed",
        description: err.message || "Could not process the PDF",
        variant: "destructive",
      });
    } finally {
      setPdfProcessing(false);
      // Reset the file input
      e.target.value = "";
    }
  };

  // Simple text extraction from PDF
  const extractTextFromPdf = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        // Basic text extraction from PDF binary - extracts readable strings
        // This works for text-based PDFs
        const textParts: string[] = [];
        
        // Match text between parentheses in PDF streams (basic approach)
        const matches = content.match(/\(([^)]+)\)/g);
        if (matches) {
          for (const match of matches) {
            const text = match.slice(1, -1)
              .replace(/\\\(/g, "(")
              .replace(/\\\)/g, ")")
              .replace(/\\\\/g, "\\");
            if (text.length > 1 && /[a-zA-Z]/.test(text)) {
              textParts.push(text);
            }
          }
        }

        // Also try to match text in BT/ET blocks
        const streamMatches = content.match(/BT[\s\S]*?ET/g);
        if (streamMatches) {
          for (const block of streamMatches) {
            const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g);
            if (tjMatches) {
              for (const tj of tjMatches) {
                const text = tj.replace(/\)\s*Tj$/, "").replace(/^\(/, "");
                if (text.length > 1) textParts.push(text);
              }
            }
          }
        }

        resolve(textParts.join(" "));
      };
      reader.readAsText(file, "latin1");
    });
  };

  return (
    <div className="space-y-6">
      {/* AI Tools */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* AI Recipe Creator */}
        <Card className="bg-card border-border border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Recipe Creator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Create a high-protein post-workout smoothie with banana and peanut butter, and a meal prep chicken breast recipe with rice and veggies"
              rows={3}
              className="text-sm"
            />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="ai-count" className="text-xs text-muted-foreground whitespace-nowrap">
                  Recipes:
                </Label>
                <Select
                  value={aiCount.toString()}
                  onValueChange={(v) => setAiCount(parseInt(v))}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="apollo"
                size="sm"
                onClick={handleAIGenerate}
                disabled={aiGenerating || !aiPrompt.trim()}
                className="flex-1"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk PDF Import */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Library className="w-5 h-5 text-primary" />
              Bulk PDF Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload one or more cookbook PDFs. AI extracts every recipe with macros — review and add photos before saving.
            </p>
            <Button
              variant="apollo-outline"
              className="w-full"
              onClick={() => setBulkImportOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Open Bulk Importer
            </Button>
            <p className="text-xs text-muted-foreground">
              Best for large recipe libraries · Max 20MB per file
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import recipes from PDF</DialogTitle>
          </DialogHeader>
          <BulkPdfImport
            onComplete={() => {
              setBulkImportOpen(false);
              queryClient.invalidateQueries({ queryKey: ["admin-recipes"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Recipe Library Header */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start gap-3 flex-wrap">
          <div>
            <h2 className="font-heading text-xl">Nutrition Recipes</h2>
            <p className="text-sm text-muted-foreground">
              {filteredRecipes.length} of {recipes?.length || 0} recipes
              {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete ${selectedIds.size} recipe(s)? This cannot be undone.`)) {
                    bulkDeleteMutation.mutate(Array.from(selectedIds));
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedIds.size}
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="apollo" onClick={() => resetForm()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingRecipe ? "Edit Recipe" : "Add New Recipe"}</DialogTitle>
                </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="main">Main</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                      <SelectItem value="smoothie">Smoothie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="prep">Prep Time (min)</Label>
                  <Input
                    id="prep"
                    type="number"
                    value={formData.prep_time_minutes}
                    onChange={(e) => setFormData((p) => ({ ...p, prep_time_minutes: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="cook">Cook Time (min)</Label>
                  <Input
                    id="cook"
                    type="number"
                    value={formData.cook_time_minutes}
                    onChange={(e) => setFormData((p) => ({ ...p, cook_time_minutes: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    type="number"
                    value={formData.servings}
                    onChange={(e) => setFormData((p) => ({ ...p, servings: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="calories">Calories/Serving</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={formData.calories_per_serving}
                    onChange={(e) => setFormData((p) => ({ ...p, calories_per_serving: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    value={formData.protein_grams}
                    onChange={(e) => setFormData((p) => ({ ...p, protein_grams: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    value={formData.carbs_grams}
                    onChange={(e) => setFormData((p) => ({ ...p, carbs_grams: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    value={formData.fat_grams}
                    onChange={(e) => setFormData((p) => ({ ...p, fat_grams: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Dietary Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.dietary_tags}
                    onChange={(e) => setFormData((p) => ({ ...p, dietary_tags: e.target.value }))}
                    placeholder="high-protein, low-carb, gluten-free"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="ingredients">Ingredients (one per line)</Label>
                <Textarea
                  id="ingredients"
                  value={formData.ingredients}
                  onChange={(e) => setFormData((p) => ({ ...p, ingredients: e.target.value }))}
                  rows={4}
                  placeholder="1 cup chicken breast&#10;2 tbsp olive oil&#10;..."
                />
              </div>
              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData((p) => ({ ...p, instructions: e.target.value }))}
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                <Input
                  id="thumbnail_url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData((p) => ({ ...p, thumbnail_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" variant="apollo" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingRecipe ? "Update" : "Create"}
                </Button>
              </div>
            </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search / Filter / Sort row */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes by title..."
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="main">Main</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
              <SelectItem value="dessert">Dessert</SelectItem>
              <SelectItem value="smoothie">Smoothie</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="title">Title (A–Z)</SelectItem>
              <SelectItem value="calories">Calories (high)</SelectItem>
            </SelectContent>
          </Select>
          {filteredRecipes.length > 0 && (
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              {allFilteredSelected ? "Clear selection" : "Select all"}
            </Button>
          )}
        </div>
      </div>

      {/* Recipe Card Grid */}
      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">Loading...</p>
      ) : filteredRecipes.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">
          {recipes?.length === 0
            ? "No recipes yet. Use AI or add one manually!"
            : "No recipes match your filters."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRecipes.map((recipe) => {
            const isSelected = selectedIds.has(recipe.id);
            return (
              <div
                key={recipe.id}
                className={`card-apollo overflow-hidden relative ${isSelected ? "ring-2 ring-primary" : ""}`}
              >
                <div className="absolute top-2 right-2 z-10">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(recipe.id)}
                    className="bg-background/80 border-foreground/40"
                  />
                </div>
                <div className="aspect-video bg-muted relative">
                  {recipe.thumbnail_url ? (
                    <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {recipe.category && (
                    <span className="absolute top-2 left-2 text-[10px] bg-background/80 px-1.5 py-0.5 rounded capitalize">{recipe.category}</span>
                  )}
                  {recipe.calories_per_serving && (
                    <span className="absolute bottom-2 right-2 text-[10px] bg-background/80 px-1.5 py-0.5 rounded">{recipe.calories_per_serving} cal</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{recipe.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {recipe.protein_grams || 0}g P · {recipe.carbs_grams || 0}g C · {recipe.fat_grams || 0}g F
                  </p>
                  <div className="flex gap-1 mt-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(recipe)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        if (confirm(`Delete "${recipe.title}"?`)) deleteMutation.mutate(recipe.id);
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminRecipes;
