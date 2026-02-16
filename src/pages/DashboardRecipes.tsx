import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Clock, Users, Flame, Filter, Heart, X, ChefHat } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Tables } from "@/integrations/supabase/types";

type Recipe = Tables<"recipes">;

const categories = ["All", "High Protein", "Meal Prep", "Low Carb", "Vegetarian", "Quick Meals", "Snacks", "Muscle Gain", "Weight Loss"];

const DashboardRecipes = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["client-recipes"],
    queryFn: async () => {
      const allRecipes: Recipe[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("recipes")
          .select("*")
          .order("title")
          .range(offset, offset + batchSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allRecipes.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      return allRecipes;
    },
  });

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const parseIngredients = (ingredients: any): string[] => {
    if (!ingredients) return [];
    if (Array.isArray(ingredients)) return ingredients as string[];
    if (typeof ingredients === "string") {
      try { return JSON.parse(ingredients); } catch { return [ingredients]; }
    }
    return [];
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl mb-2">
            Nutrition <span className="text-apollo-gold">Recipes</span>
          </h1>
          <p className="text-muted-foreground">
            {recipes.length} healthy, delicious meals designed to fuel your fitness goals
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted border-border"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-muted border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground animate-pulse">Loading recipes...</p>
          </div>
        ) : (
          <>
            {/* Recipes grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedRecipe(recipe)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedRecipe(recipe)}
                  className="card-apollo group overflow-hidden hover:border-apollo-gold/50 transition-all cursor-pointer select-none"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {recipe.thumbnail_url ? (
                      <img
                        src={recipe.thumbnail_url}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Favorite button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(recipe.id);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites.includes(recipe.id)
                            ? "fill-apollo-gold text-apollo-gold"
                            : "text-white"
                        }`}
                      />
                    </button>

                    {/* Meta info */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3">
                      {(recipe.prep_time_minutes || recipe.cook_time_minutes) && (
                        <span className="flex items-center gap-1 text-xs text-white/90">
                          <Clock className="w-3 h-3" />
                          {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min
                        </span>
                      )}
                      {recipe.servings && (
                        <span className="flex items-center gap-1 text-xs text-white/90">
                          <Users className="w-3 h-3" />
                          {recipe.servings} servings
                        </span>
                      )}
                      {recipe.calories_per_serving && (
                        <span className="flex items-center gap-1 text-xs text-white/90">
                          <Flame className="w-3 h-3" />
                          {recipe.calories_per_serving} cal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-apollo-gold uppercase tracking-wide">
                        {recipe.category || "Recipe"}
                      </span>
                    </div>
                    <h3 className="font-heading text-lg mb-2">{recipe.title}</h3>
                    {recipe.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}

                    {/* Macros */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {recipe.protein_grams != null && <span>P: {recipe.protein_grams}g</span>}
                      {recipe.carbs_grams != null && <span>C: {recipe.carbs_grams}g</span>}
                      {recipe.fat_grams != null && <span>F: {recipe.fat_grams}g</span>}
                    </div>

                    {/* Tags */}
                    {recipe.dietary_tags && (
                      <div className="flex flex-wrap gap-1">
                        {recipe.dietary_tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredRecipes.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No recipes found matching your criteria.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Recipe Detail Modal */}
      <Dialog open={!!selectedRecipe} onOpenChange={(open) => { if (!open) setSelectedRecipe(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6" onPointerDownOutside={(e) => e.preventDefault()}>
          {selectedRecipe ? (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-apollo-gold uppercase tracking-wide">
                    {selectedRecipe.category || "Recipe"}
                  </span>
                </div>
                <DialogTitle className="font-heading text-2xl">
                  {selectedRecipe.title}
                </DialogTitle>
                {selectedRecipe.description && (
                  <p className="text-muted-foreground text-sm mt-1">
                    {selectedRecipe.description}
                  </p>
                )}
              </DialogHeader>

              {/* Hero image */}
              {selectedRecipe.thumbnail_url && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                  <img
                    src={selectedRecipe.thumbnail_url}
                    alt={selectedRecipe.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedRecipe.prep_time_minutes != null && (
                      <div className="bg-muted/50 p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Prep</p>
                        <p className="font-medium text-sm">{selectedRecipe.prep_time_minutes} min</p>
                      </div>
                    )}
                    {selectedRecipe.cook_time_minutes != null && (
                      <div className="bg-muted/50 p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Cook</p>
                        <p className="font-medium text-sm">{selectedRecipe.cook_time_minutes} min</p>
                      </div>
                    )}
                    {selectedRecipe.servings != null && (
                      <div className="bg-muted/50 p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Servings</p>
                        <p className="font-medium text-sm">{selectedRecipe.servings}</p>
                      </div>
                    )}
                    {selectedRecipe.calories_per_serving != null && (
                      <div className="bg-muted/50 p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Calories</p>
                        <p className="font-medium text-sm">{selectedRecipe.calories_per_serving}</p>
                      </div>
                    )}
                  </div>

                  {/* Macros bar */}
                  {(selectedRecipe.protein_grams || selectedRecipe.carbs_grams || selectedRecipe.fat_grams) && (
                    <div className="flex items-center gap-4 p-3 bg-apollo-gold/5 border border-apollo-gold/20 rounded-lg">
                      <span className="text-xs font-medium text-apollo-gold uppercase tracking-wide">Macros</span>
                      <div className="flex gap-4 text-sm">
                        {selectedRecipe.protein_grams != null && (
                          <span>Protein: <strong>{selectedRecipe.protein_grams}g</strong></span>
                        )}
                        {selectedRecipe.carbs_grams != null && (
                          <span>Carbs: <strong>{selectedRecipe.carbs_grams}g</strong></span>
                        )}
                        {selectedRecipe.fat_grams != null && (
                          <span>Fat: <strong>{selectedRecipe.fat_grams}g</strong></span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Ingredients */}
                  {parseIngredients(selectedRecipe.ingredients).length > 0 && (
                    <div>
                      <h3 className="font-heading text-lg mb-3">Ingredients</h3>
                      <ul className="space-y-2">
                        {parseIngredients(selectedRecipe.ingredients).map((ingredient, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-apollo-gold mt-1.5 flex-shrink-0" />
                            {ingredient}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Instructions */}
                  {selectedRecipe.instructions && (
                    <div>
                      <h3 className="font-heading text-lg mb-3">Instructions</h3>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedRecipe.instructions}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedRecipe.dietary_tags && selectedRecipe.dietary_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedRecipe.dietary_tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardRecipes;
