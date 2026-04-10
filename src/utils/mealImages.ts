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
    image: mealSnack,
    keywords: [
      "almond butter rice cake", "rice cakes with", "almond butter banana",
      "peanut butter rice cake", "nut butter rice cake",
      "cottage cheese with pineapple", "cottage cheese with",
      "greek yogurt with", "yogurt parfait", "yogurt bowl",
      "chia pudding", "chia seed pudding", "overnight chia",
      "protein bar", "energy ball", "protein ball",
      "trail mix", "mixed nuts", "nut mix",
      "apple with peanut butter", "banana with almond butter",
      "celery with peanut butter", "hummus and veggies",
      "dark chocolate", "edamame",
      "snack", "nuts", "almonds", "almond butter", "peanut butter",
      "yogurt", "fruit", "apple", "banana", "berries", "bar",
      "energy ball", "trail mix", "hummus", "cheese",
      "cottage cheese", "crackers", "rice cake", "rice cakes",
      "celery", "carrot sticks", "granola bar", "dried fruit",
      "seeds", "sunflower", "nut butter", "cashew", "pistachio",
      "popcorn",
    ],
  },
  {
    image: mealBreakfast,
    keywords: [
      "overnight oats", "protein oatmeal", "baked oatmeal",
      "egg white omelet", "veggie omelet", "spinach omelet",
      "french toast", "protein pancake", "banana pancake",
      "breakfast burrito", "breakfast wrap", "breakfast bowl",
      "acai bowl", "smoothie bowl",
      "frittata with", "hash brown",
      "breakfast", "oatmeal", "oats", "pancake", "waffle", "eggs", "egg",
      "omelet", "omelette", "cereal", "granola", "muesli",
      "porridge", "toast", "bagel", "muffin", "frittata", "hash",
      "overnight", "acai bowl",
    ],
  },
  {
    image: mealChicken,
    keywords: [
      "grilled chicken breast", "baked chicken thigh", "chicken stir fry",
      "honey mustard chicken", "lemon herb chicken", "chicken lettuce wrap",
      "chicken caesar", "teriyaki chicken",
      "turkey meatball", "turkey burger", "ground turkey",
      "chicken", "turkey", "poultry", "grilled chicken", "roast chicken",
      "baked chicken", "breast", "thigh", "wing",
    ],
  },
  {
    image: mealFish,
    keywords: [
      "salmon fillet", "baked salmon", "grilled salmon",
      "tuna salad", "tuna steak", "tuna wrap",
      "shrimp stir fry", "grilled shrimp",
      "salmon", "fish", "tuna", "cod", "tilapia", "shrimp", "prawn",
      "seafood", "sushi", "mahi", "trout", "halibut", "sea bass",
      "crab", "lobster", "scallop",
    ],
  },
  {
    image: mealSteak,
    keywords: [
      "turkey meatloaf", "lean meatloaf", "beef meatloaf",
      "steak with", "grilled steak", "sirloin steak",
      "ground beef bowl", "beef stir fry",
      "pork tenderloin", "grilled pork",
      "steak", "beef", "sirloin", "ribeye", "filet", "ground beef",
      "burger", "meatball", "pork", "lamb", "brisket", "roast",
      "tenderloin", "meatloaf",
    ],
  },
  {
    image: mealSalad,
    keywords: [
      "mediterranean salmon salad", "quinoa salad", "greek salad",
      "chicken caesar salad", "kale salad", "spinach salad",
      "grain bowl", "buddha bowl", "power bowl",
      "lentil soup", "vegetable soup", "minestrone",
      "salad", "bowl", "greens", "kale", "spinach", "arugula",
      "lettuce", "mediterranean", "greek", "caesar", "cobb",
      "quinoa bowl", "buddha bowl", "grain bowl",
      "soup", "lentil",
    ],
  },
  {
    image: mealPasta,
    keywords: [
      "chicken stir fry with rice", "beef stir fry with noodles",
      "burrito bowl", "chicken wrap", "taco bowl",
      "curry with rice", "chicken curry",
      "pasta", "spaghetti", "penne", "noodle", "macaroni", "lasagna",
      "fettuccine", "linguine", "rice", "risotto", "stir fry",
      "stir-fry", "fried rice", "lo mein", "pad thai", "curry",
      "burrito", "wrap", "taco",
    ],
  },
  {
    image: mealSmoothie,
    keywords: [
      "protein smoothie", "green smoothie", "berry smoothie",
      "post-workout shake", "recovery shake",
      "smoothie", "shake", "protein shake", "juice", "acai",
      "milkshake", "drink", "protein drink", "blend",
    ],
  },
];

/**
 * Returns a food category image based on the meal name and meal type.
 * Uses keyword matching — longest match first for accuracy.
 */
export function getMealImage(mealName: string, mealType?: string): string {
  const name = mealName.toLowerCase();

  // Score each category by longest keyword match
  let bestMatch: { image: string; length: number } | null = null;

  for (const category of FOOD_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (name.includes(keyword) && (!bestMatch || keyword.length > bestMatch.length)) {
        bestMatch = { image: category.image, length: keyword.length };
      }
    }
  }

  if (bestMatch) return bestMatch.image;

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
