import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Clock, Users, Flame, Filter, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Sample recipe data
const sampleRecipes = [
  {
    id: "1",
    title: "High Protein Chicken Bowl",
    description: "Grilled chicken with quinoa and roasted vegetables",
    prep_time_minutes: 15,
    cook_time_minutes: 25,
    servings: 2,
    calories_per_serving: 450,
    protein_grams: 42,
    carbs_grams: 35,
    fat_grams: 12,
    category: "Lunch",
    dietary_tags: ["high-protein", "gluten-free"],
    thumbnail_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
  },
  {
    id: "2",
    title: "Green Power Smoothie",
    description: "Spinach, banana, almond milk, and protein powder",
    prep_time_minutes: 5,
    cook_time_minutes: 0,
    servings: 1,
    calories_per_serving: 280,
    protein_grams: 25,
    carbs_grams: 32,
    fat_grams: 8,
    category: "Breakfast",
    dietary_tags: ["vegan", "quick"],
    thumbnail_url: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400",
  },
  {
    id: "3",
    title: "Salmon with Asparagus",
    description: "Baked salmon with lemon butter and grilled asparagus",
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    servings: 2,
    calories_per_serving: 520,
    protein_grams: 38,
    carbs_grams: 12,
    fat_grams: 35,
    category: "Dinner",
    dietary_tags: ["keto", "high-protein"],
    thumbnail_url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400",
  },
  {
    id: "4",
    title: "Greek Yogurt Parfait",
    description: "Layered yogurt with berries, granola, and honey",
    prep_time_minutes: 5,
    cook_time_minutes: 0,
    servings: 1,
    calories_per_serving: 320,
    protein_grams: 18,
    carbs_grams: 42,
    fat_grams: 10,
    category: "Snack",
    dietary_tags: ["vegetarian", "quick"],
    thumbnail_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
  },
  {
    id: "5",
    title: "Turkey Lettuce Wraps",
    description: "Lean ground turkey with Asian-inspired sauce",
    prep_time_minutes: 10,
    cook_time_minutes: 15,
    servings: 4,
    calories_per_serving: 280,
    protein_grams: 28,
    carbs_grams: 8,
    fat_grams: 14,
    category: "Lunch",
    dietary_tags: ["low-carb", "high-protein"],
    thumbnail_url: "https://images.unsplash.com/photo-1529059997568-3d847b1154f0?w=400",
  },
  {
    id: "6",
    title: "Overnight Oats",
    description: "Prep-ahead oats with chia seeds and almond butter",
    prep_time_minutes: 5,
    cook_time_minutes: 0,
    servings: 1,
    calories_per_serving: 380,
    protein_grams: 14,
    carbs_grams: 48,
    fat_grams: 16,
    category: "Breakfast",
    dietary_tags: ["vegan", "meal-prep"],
    thumbnail_url: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400",
  },
];

const categories = ["All", "Breakfast", "Lunch", "Dinner", "Snack"];

const DashboardRecipes = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);

  const filteredRecipes = sampleRecipes.filter((recipe) => {
    const matchesSearch = recipe.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
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
            Healthy, delicious meals designed to fuel your fitness goals
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

        {/* Recipes grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="card-apollo group overflow-hidden hover:border-apollo-gold/50 transition-all cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={recipe.thumbnail_url}
                  alt={recipe.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
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
                  <span className="flex items-center gap-1 text-xs text-white/90">
                    <Clock className="w-3 h-3" />
                    {recipe.prep_time_minutes + recipe.cook_time_minutes} min
                  </span>
                  <span className="flex items-center gap-1 text-xs text-white/90">
                    <Users className="w-3 h-3" />
                    {recipe.servings} servings
                  </span>
                  <span className="flex items-center gap-1 text-xs text-white/90">
                    <Flame className="w-3 h-3" />
                    {recipe.calories_per_serving} cal
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-apollo-gold uppercase tracking-wide">
                    {recipe.category}
                  </span>
                </div>
                <h3 className="font-heading text-lg mb-2">{recipe.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {recipe.description}
                </p>

                {/* Macros */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span>P: {recipe.protein_grams}g</span>
                  <span>C: {recipe.carbs_grams}g</span>
                  <span>F: {recipe.fat_grams}g</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {recipe.dietary_tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
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
      </div>
    </DashboardLayout>
  );
};

export default DashboardRecipes;
