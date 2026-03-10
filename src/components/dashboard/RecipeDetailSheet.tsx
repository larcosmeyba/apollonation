import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Recipe = Tables<"recipes">;

interface RecipeDetailSheetProps {
  recipe: Recipe | null;
  onClose: () => void;
}

const parseIngredients = (ingredients: any): string[] => {
  if (!ingredients) return [];
  if (typeof ingredients === "string") {
    try { ingredients = JSON.parse(ingredients); } catch { return [ingredients]; }
  }
  if (Array.isArray(ingredients)) {
    return ingredients.map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "object" && item !== null) {
        const parts: string[] = [];
        if (item.amount || item.quantity) parts.push(String(item.amount || item.quantity));
        if (item.unit) parts.push(item.unit);
        if (item.name || item.ingredient || item.item) parts.push(item.name || item.ingredient || item.item);
        return parts.length > 0 ? parts.join(" ") : JSON.stringify(item);
      }
      return String(item);
    });
  }
  return [];
};

const RecipeDetailSheet = ({ recipe, onClose }: RecipeDetailSheetProps) => {
  useEffect(() => {
    if (recipe) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [recipe]);

  if (!recipe) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[85vh] bg-card border border-border rounded-t-2xl sm:rounded-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start justify-between p-4 border-b border-border flex-shrink-0">
          <div className="pr-4">
            <span className="text-xs text-primary uppercase tracking-wide">
              {recipe.category || "Recipe"}
            </span>
            <h2 className="font-heading text-xl mt-1 text-foreground">{recipe.title}</h2>
            {recipe.description && (
              <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-6">
          {recipe.thumbnail_url && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recipe.prep_time_minutes != null && (
              <div className="bg-muted/50 p-3 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Prep</p>
                <p className="font-medium text-sm text-foreground">{recipe.prep_time_minutes} min</p>
              </div>
            )}
            {recipe.cook_time_minutes != null && (
              <div className="bg-muted/50 p-3 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Cook</p>
                <p className="font-medium text-sm text-foreground">{recipe.cook_time_minutes} min</p>
              </div>
            )}
            {recipe.servings != null && (
              <div className="bg-muted/50 p-3 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Servings</p>
                <p className="font-medium text-sm text-foreground">{recipe.servings}</p>
              </div>
            )}
            {recipe.calories_per_serving != null && (
              <div className="bg-muted/50 p-3 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Calories</p>
                <p className="font-medium text-sm text-foreground">{recipe.calories_per_serving}</p>
              </div>
            )}
          </div>

          {(recipe.protein_grams || recipe.carbs_grams || recipe.fat_grams) && (
            <div className="flex flex-wrap items-center gap-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <span className="text-xs font-medium text-primary uppercase tracking-wide">Macros</span>
              <div className="flex flex-wrap gap-4 text-sm text-foreground">
                {recipe.protein_grams != null && <span>Protein: <strong>{recipe.protein_grams}g</strong></span>}
                {recipe.carbs_grams != null && <span>Carbs: <strong>{recipe.carbs_grams}g</strong></span>}
                {recipe.fat_grams != null && <span>Fat: <strong>{recipe.fat_grams}g</strong></span>}
              </div>
            </div>
          )}

          {parseIngredients(recipe.ingredients).length > 0 && (
            <div>
              <h3 className="font-heading text-lg mb-3 text-foreground">Ingredients</h3>
              <ul className="space-y-2">
                {parseIngredients(recipe.ingredients).map((ingredient, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    {ingredient}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recipe.instructions && (
            <div>
              <h3 className="font-heading text-lg mb-3 text-foreground">Instructions</h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {recipe.instructions}
              </div>
            </div>
          )}

          {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {recipe.dietary_tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailSheet;
