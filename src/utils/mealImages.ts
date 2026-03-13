import mealBreakfast from "@/assets/meals/meal-breakfast.jpg";
import mealChicken from "@/assets/meals/meal-chicken.jpg";
import mealSalad from "@/assets/meals/meal-salad.jpg";
import mealFish from "@/assets/meals/meal-fish.jpg";
import mealPasta from "@/assets/meals/meal-pasta.jpg";
import mealSmoothie from "@/assets/meals/meal-smoothie.jpg";
import mealSteak from "@/assets/meals/meal-steak.jpg";
import mealSnack from "@/assets/meals/meal-snack.jpg";

type FoodCategory = {
  image: string;
  keywords: string[];
};

const FOOD_CATEGORIES: FoodCategory[] = [
  {
    image: mealBreakfast,
    keywords: [
      "breakfast", "oatmeal", "oats", "pancake", "waffle", "eggs", "egg",
      "omelet", "omelette", "french toast", "cereal", "granola", "muesli",
      "porridge", "toast", "bagel", "muffin", "frittata", "hash",
    ],
  },
  {
    image: mealChicken,
    keywords: [
      "chicken", "turkey", "poultry", "grilled chicken", "roast chicken",
      "baked chicken", "breast", "thigh", "wing",
    ],
  },
  {
    image: mealFish,
    keywords: [
      "salmon", "fish", "tuna", "cod", "tilapia", "shrimp", "prawn",
      "seafood", "sushi", "mahi", "trout", "halibut", "sea bass",
      "crab", "lobster", "scallop",
    ],
  },
  {
    image: mealSteak,
    keywords: [
      "steak", "beef", "sirloin", "ribeye", "filet", "ground beef",
      "burger", "meatball", "pork", "lamb", "brisket", "roast",
      "tenderloin", "meatloaf",
    ],
  },
  {
    image: mealSalad,
    keywords: [
      "salad", "bowl", "greens", "kale", "spinach", "arugula",
      "lettuce", "mediterranean", "greek", "caesar", "cobb",
      "quinoa bowl", "buddha bowl", "grain bowl",
    ],
  },
  {
    image: mealPasta,
    keywords: [
      "pasta", "spaghetti", "penne", "noodle", "macaroni", "lasagna",
      "fettuccine", "linguine", "rice", "risotto", "stir fry",
      "stir-fry", "fried rice", "lo mein", "pad thai", "curry",
      "burrito", "wrap", "taco",
    ],
  },
  {
    image: mealSmoothie,
    keywords: [
      "smoothie", "shake", "protein shake", "juice", "acai",
      "milkshake", "drink", "protein drink", "blend",
    ],
  },
  {
    image: mealSnack,
    keywords: [
      "snack", "nuts", "almonds", "yogurt", "fruit", "apple",
      "banana", "berries", "bar", "protein bar", "energy ball",
      "trail mix", "hummus", "cheese", "cottage cheese", "crackers",
      "dark chocolate", "edamame", "rice cake",
    ],
  },
];

/**
 * Returns a food category image based on the meal name and meal type.
 * Uses keyword matching to find the best visual representation.
 */
export function getMealImage(mealName: string, mealType?: string): string {
  const name = mealName.toLowerCase();

  // Check specific food keywords first
  for (const category of FOOD_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (name.includes(keyword)) {
        return category.image;
      }
    }
  }

  // Fall back to meal type
  switch (mealType?.toLowerCase()) {
    case "breakfast":
      return mealBreakfast;
    case "snack":
      return mealSnack;
    case "lunch":
      return mealChicken;
    case "dinner":
      return mealSteak;
    default:
      return mealChicken;
  }
}
