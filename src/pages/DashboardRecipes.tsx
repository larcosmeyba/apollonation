import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Clock, Users, Flame, Heart, ChefHat, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import RecipeDetailSheet from "@/components/dashboard/RecipeDetailSheet";
import type { Tables } from "@/integrations/supabase/types";

type Recipe = Tables<"recipes">;

const CATEGORIES = [
  "All",
  "High Protein",
  "Meal Prep",
  "Low Carb",
  "Vegetarian",
  "Quick Meals",
  "Snacks",
  "Muscle Gain",
  "Weight Loss",
] as const;

type Category = (typeof CATEGORIES)[number];

const norm = (s?: string | null) => (s ?? "").toLowerCase().trim();

const matchesCategory = (recipe: Recipe, category: Category): boolean => {
  if (category === "All") return true;

  const cat = norm(recipe.category);
  const tags = (recipe.dietary_tags ?? []).map(norm);
  const has = (...needles: string[]) =>
    needles.some((n) => tags.includes(n) || cat === n);
  const totalTime =
    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  switch (category) {
    case "High Protein":
      return (
        has("high-protein", "hp") ||
        (recipe.protein_grams ?? 0) >= 25
      );
    case "Meal Prep":
      return (
        has(
          "meal-prep",
          "mp",
          "meal-prep/freezer friendly",
          "meal-prep/freezer-friendly",
          "meal-prep-friendly",
          "mp (meal prep)",
        )
      );
    case "Low Carb":
      return (
        has("low-carb", "lc", "lc (low carb)", "keto-friendly") ||
        (recipe.carbs_grams ?? 99) <= 20
      );
    case "Vegetarian":
      return has(
        "vegetarian",
        "v",
        "v (vegetarian)",
        "vegan",
        "plant-based",
      );
    case "Quick Meals":
      return (
        has("quick", "q", "q (quick)", "quick-easy", "5-ingredient", "quick-meals") ||
        (totalTime > 0 && totalTime <= 20)
      );
    case "Snacks":
      return cat === "snack" || cat === "snacks" || tags.some((t) => t.includes("snack"));
    case "Muscle Gain":
      return (
        cat === "muscle-gain" ||
        has("high-protein", "hp") ||
        (recipe.protein_grams ?? 0) >= 30
      );
    case "Weight Loss":
      return (
        cat === "weight-loss" ||
        ((recipe.calories_per_serving ?? 9999) <= 400 &&
          (recipe.protein_grams ?? 0) >= 20)
      );
    default:
      return true;
  }
};

const DashboardRecipes = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
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

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      if (!matchesCategory(r, selectedCategory)) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.dietary_tags?.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [recipes, searchQuery, selectedCategory]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <>
      <DashboardLayout>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-heading text-4xl md:text-5xl mb-2 leading-tight">
              Nutrition <span className="text-primary">Recipes</span>
            </h1>
            <p className="text-muted-foreground">
              {recipes.length} healthy, delicious meals designed to fuel your fitness goals
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <Input
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card border-border rounded-full pl-11 h-12"
            />
          </div>

          {/* Category chips (horizontal scroll) */}
          <div
            className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 mb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {CATEGORIES.map((c) => {
              const active = selectedCategory === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`whitespace-nowrap px-4 h-9 rounded-full text-sm font-semibold border transition-colors flex-shrink-0 ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground/80 border-border hover:border-foreground/30"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-5 text-sm">
            <span className="text-foreground/60">
              {filteredRecipes.length} {filteredRecipes.length === 1 ? "recipe" : "recipes"}
            </span>
            {selectedCategory !== "All" && (
              <button
                onClick={() => setSelectedCategory("All")}
                className="text-primary font-semibold"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Loading / Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground animate-pulse">Loading recipes...</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredRecipes.map((recipe) => {
                  const totalTime =
                    (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
                  return (
                    <div
                      key={recipe.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedRecipe(recipe)}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedRecipe(recipe)}
                      className="bg-card rounded-2xl border border-border group overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all cursor-pointer select-none"
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
                            <ChefHat className="w-10 h-10 text-foreground/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                        {/* Category badge */}
                        {selectedCategory !== "All" && matchesCategory(recipe, selectedCategory) && (
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                            {selectedCategory}
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(recipe.id);
                          }}
                          aria-label="Save recipe"
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/55 flex items-center justify-center hover:bg-black/75 transition-colors"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              favorites.includes(recipe.id)
                                ? "fill-primary text-primary"
                                : "text-white"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-heading text-lg text-foreground leading-snug mb-2 line-clamp-2">
                          {recipe.title}
                        </h3>

                        {/* Macros line */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/60 mb-2 tabular-nums">
                          {recipe.calories_per_serving != null && (
                            <span className="font-semibold text-foreground/80">
                              {recipe.calories_per_serving} cal
                            </span>
                          )}
                          {recipe.protein_grams != null && (
                            <>
                              <span>·</span>
                              <span>{recipe.protein_grams}g P</span>
                            </>
                          )}
                          {recipe.carbs_grams != null && (
                            <>
                              <span>·</span>
                              <span>{recipe.carbs_grams}g C</span>
                            </>
                          )}
                          {recipe.fat_grams != null && (
                            <>
                              <span>·</span>
                              <span>{recipe.fat_grams}g F</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-foreground/55">
                          {totalTime > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {totalTime} min
                            </span>
                          )}
                          {recipe.servings != null && recipe.servings > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {recipe.servings}
                            </span>
                          )}
                          {recipe.calories_per_serving != null && totalTime === 0 && (
                            <span className="flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              {recipe.calories_per_serving} cal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredRecipes.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">
                    No recipes found. Try a different category or search term.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>

      <RecipeDetailSheet recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
    </>
  );
};

export default DashboardRecipes;
