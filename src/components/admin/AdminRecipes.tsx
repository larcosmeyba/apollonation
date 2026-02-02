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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-xl">Nutrition Recipes</h2>
          <p className="text-sm text-muted-foreground">Healthy meal recipes with macros</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="apollo" onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Recipe
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

      <div className="card-apollo overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Calories</TableHead>
              <TableHead>Protein</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : recipes?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No recipes yet. Add your first recipe!
                </TableCell>
              </TableRow>
            ) : (
              recipes?.map((recipe) => (
                <TableRow key={recipe.id}>
                  <TableCell className="font-medium">{recipe.title}</TableCell>
                  <TableCell className="capitalize">{recipe.category}</TableCell>
                  <TableCell>{recipe.calories_per_serving} cal</TableCell>
                  <TableCell>{recipe.protein_grams}g</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(recipe)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(recipe.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminRecipes;
