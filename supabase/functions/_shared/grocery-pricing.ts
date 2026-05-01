// Shared price estimator for meal-plan generators.
// Mirrors the PRICE_TABLE in apply-budget-to-grocery-list — keep in lockstep.
// Used to enforce weekly grocery budgets at generation time (not just at
// quantity-tier optimization time).

type UnitPrice = { unit: string; price: number };

export const PRICE_TABLE: Record<string, UnitPrice> = {
  "chicken breast": { unit: "lb", price: 4.5 }, "chicken thigh": { unit: "lb", price: 3.5 }, "chicken": { unit: "lb", price: 4.0 },
  "ground beef": { unit: "lb", price: 6.0 }, "beef": { unit: "lb", price: 8.0 }, "steak": { unit: "lb", price: 12.0 },
  "ground turkey": { unit: "lb", price: 5.5 }, "turkey": { unit: "lb", price: 5.0 }, "pork": { unit: "lb", price: 5.5 },
  "bacon": { unit: "lb", price: 7.0 }, "salmon": { unit: "lb", price: 12.0 }, "tuna": { unit: "can", price: 1.5 },
  "shrimp": { unit: "lb", price: 10.0 }, "tilapia": { unit: "lb", price: 6.0 }, "cod": { unit: "lb", price: 9.0 },
  "fish": { unit: "lb", price: 9.0 }, "tofu": { unit: "pack", price: 2.5 }, "tempeh": { unit: "pack", price: 3.5 },
  "eggs": { unit: "dozen", price: 4.0 }, "egg whites": { unit: "cup", price: 2.0 },
  "milk": { unit: "gallon", price: 4.0 }, "almond milk": { unit: "quart", price: 3.5 }, "oat milk": { unit: "quart", price: 4.5 },
  "soy milk": { unit: "quart", price: 3.5 }, "greek yogurt": { unit: "cup", price: 1.5 }, "yogurt": { unit: "cup", price: 1.0 },
  "cheese": { unit: "lb", price: 6.0 }, "cheddar": { unit: "lb", price: 6.5 }, "mozzarella": { unit: "lb", price: 5.5 },
  "feta": { unit: "oz", price: 0.5 }, "parmesan": { unit: "oz", price: 0.6 }, "cottage cheese": { unit: "cup", price: 1.5 },
  "butter": { unit: "lb", price: 5.0 }, "cream cheese": { unit: "oz", price: 0.4 }, "heavy cream": { unit: "cup", price: 1.5 },
  "rice": { unit: "lb", price: 1.5 }, "brown rice": { unit: "lb", price: 2.0 }, "white rice": { unit: "lb", price: 1.5 },
  "quinoa": { unit: "lb", price: 4.5 }, "oats": { unit: "lb", price: 2.0 }, "oatmeal": { unit: "lb", price: 2.0 },
  "pasta": { unit: "lb", price: 1.5 }, "spaghetti": { unit: "lb", price: 1.5 }, "noodles": { unit: "lb", price: 1.8 },
  "bread": { unit: "loaf", price: 3.5 }, "whole grain bread": { unit: "loaf", price: 4.5 }, "tortilla": { unit: "pack", price: 3.0 },
  "tortillas": { unit: "pack", price: 3.0 }, "bagel": { unit: "pack", price: 3.5 }, "english muffin": { unit: "pack", price: 3.0 },
  "couscous": { unit: "box", price: 3.0 }, "cereal": { unit: "box", price: 4.0 }, "granola": { unit: "bag", price: 5.0 },
  "potato": { unit: "lb", price: 1.0 }, "potatoes": { unit: "lb", price: 1.0 }, "sweet potato": { unit: "lb", price: 1.5 },
  "sweet potatoes": { unit: "lb", price: 1.5 },
  "broccoli": { unit: "lb", price: 2.5 }, "cauliflower": { unit: "head", price: 3.5 }, "spinach": { unit: "bag", price: 3.5 },
  "kale": { unit: "bunch", price: 2.5 }, "lettuce": { unit: "head", price: 2.0 }, "romaine": { unit: "head", price: 2.5 },
  "mixed greens": { unit: "bag", price: 4.0 }, "salad mix": { unit: "bag", price: 4.0 },
  "carrot": { unit: "lb", price: 1.0 }, "carrots": { unit: "lb", price: 1.0 }, "celery": { unit: "bunch", price: 2.5 },
  "cucumber": { unit: "each", price: 1.0 }, "tomato": { unit: "lb", price: 2.5 }, "tomatoes": { unit: "lb", price: 2.5 },
  "cherry tomatoes": { unit: "pack", price: 3.5 }, "bell pepper": { unit: "each", price: 1.5 }, "bell peppers": { unit: "each", price: 1.5 },
  "onion": { unit: "lb", price: 1.2 }, "onions": { unit: "lb", price: 1.2 }, "garlic": { unit: "head", price: 0.75 },
  "ginger": { unit: "oz", price: 0.4 }, "mushroom": { unit: "lb", price: 4.0 }, "mushrooms": { unit: "lb", price: 4.0 },
  "zucchini": { unit: "lb", price: 2.0 }, "squash": { unit: "lb", price: 2.0 }, "asparagus": { unit: "lb", price: 4.5 },
  "green beans": { unit: "lb", price: 3.0 }, "peas": { unit: "bag", price: 3.0 }, "corn": { unit: "each", price: 0.75 },
  "avocado": { unit: "each", price: 1.5 }, "avocados": { unit: "each", price: 1.5 }, "cabbage": { unit: "head", price: 3.0 },
  "brussels sprouts": { unit: "lb", price: 3.5 }, "eggplant": { unit: "each", price: 2.5 },
  "apple": { unit: "lb", price: 2.0 }, "apples": { unit: "lb", price: 2.0 }, "banana": { unit: "lb", price: 0.65 },
  "bananas": { unit: "lb", price: 0.65 }, "berries": { unit: "pack", price: 4.5 }, "strawberries": { unit: "pack", price: 4.0 },
  "blueberries": { unit: "pack", price: 5.0 }, "raspberries": { unit: "pack", price: 5.0 },
  "orange": { unit: "lb", price: 1.5 }, "oranges": { unit: "lb", price: 1.5 }, "lemon": { unit: "each", price: 0.75 },
  "lemons": { unit: "each", price: 0.75 }, "lime": { unit: "each", price: 0.5 }, "limes": { unit: "each", price: 0.5 },
  "grapes": { unit: "lb", price: 3.5 }, "pineapple": { unit: "each", price: 4.0 }, "mango": { unit: "each", price: 1.5 },
  "watermelon": { unit: "each", price: 6.0 },
  "beans": { unit: "can", price: 1.25 }, "black beans": { unit: "can", price: 1.25 }, "chickpeas": { unit: "can", price: 1.5 },
  "lentils": { unit: "lb", price: 2.5 }, "kidney beans": { unit: "can", price: 1.25 },
  "almonds": { unit: "lb", price: 8.0 }, "walnuts": { unit: "lb", price: 9.0 }, "cashews": { unit: "lb", price: 10.0 },
  "peanuts": { unit: "lb", price: 4.5 }, "peanut butter": { unit: "jar", price: 4.5 }, "almond butter": { unit: "jar", price: 8.0 },
  "chia seeds": { unit: "oz", price: 0.5 }, "flax seeds": { unit: "oz", price: 0.4 }, "pumpkin seeds": { unit: "oz", price: 0.6 },
  "olive oil": { unit: "cup", price: 2.5 }, "coconut oil": { unit: "cup", price: 3.0 }, "vegetable oil": { unit: "cup", price: 1.5 },
  "soy sauce": { unit: "cup", price: 2.0 }, "vinegar": { unit: "cup", price: 1.0 }, "honey": { unit: "cup", price: 4.0 },
  "maple syrup": { unit: "cup", price: 6.0 }, "salt": { unit: "tsp", price: 0.02 }, "pepper": { unit: "tsp", price: 0.05 },
  "spices": { unit: "tsp", price: 0.15 }, "salsa": { unit: "jar", price: 3.5 }, "hummus": { unit: "pack", price: 4.0 },
  "ketchup": { unit: "tbsp", price: 0.1 }, "mustard": { unit: "tbsp", price: 0.1 }, "mayo": { unit: "tbsp", price: 0.15 },
  "hot sauce": { unit: "tbsp", price: 0.15 }, "broth": { unit: "quart", price: 3.0 }, "stock": { unit: "quart", price: 3.0 },
  "tomato sauce": { unit: "can", price: 1.5 }, "marinara": { unit: "jar", price: 3.5 }, "coconut milk": { unit: "can", price: 2.5 },
  "protein powder": { unit: "oz", price: 2.0 }, "whey": { unit: "oz", price: 2.0 },
};

const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  lb: { lb: 1, lbs: 1, pound: 1, pounds: 1, oz: 1 / 16, ounce: 1 / 16, ounces: 1 / 16, g: 1 / 453.6, gram: 1 / 453.6, grams: 1 / 453.6, kg: 2.205 },
  oz: { oz: 1, ounce: 1, ounces: 1, lb: 16, lbs: 16, g: 1 / 28.35, gram: 1 / 28.35, grams: 1 / 28.35 },
  cup: { cup: 1, cups: 1, c: 1, tbsp: 1 / 16, tablespoon: 1 / 16, tablespoons: 1 / 16, tsp: 1 / 48, teaspoon: 1 / 48, teaspoons: 1 / 48, ml: 1 / 240, l: 4.23, liter: 4.23, liters: 4.23 },
  tbsp: { tbsp: 1, tablespoon: 1, tablespoons: 1, tsp: 1 / 3, teaspoon: 1 / 3, teaspoons: 1 / 3, cup: 16, cups: 16 },
  tsp: { tsp: 1, teaspoon: 1, teaspoons: 1, tbsp: 3, tablespoon: 3, tablespoons: 3 },
  each: { each: 1, "": 1, whole: 1, piece: 1, pieces: 1, slice: 1, slices: 1, clove: 1, cloves: 1 },
  dozen: { dozen: 1, each: 1 / 12, "": 1 / 12 },
  gallon: { gallon: 1, gallons: 1, gal: 1, quart: 1 / 4, quarts: 1 / 4, qt: 1 / 4, cup: 1 / 16, cups: 1 / 16, ml: 1 / 3785, l: 1 / 3.785 },
  quart: { quart: 1, quarts: 1, qt: 1, gallon: 4, cup: 1 / 4, cups: 1 / 4, ml: 1 / 946, l: 1.057 },
  loaf: { loaf: 1, loaves: 1, slice: 1 / 20, slices: 1 / 20 },
  bunch: { bunch: 1, bunches: 1 }, head: { head: 1, heads: 1 }, can: { can: 1, cans: 1 },
  bag: { bag: 1, bags: 1 }, jar: { jar: 1, jars: 1 }, box: { box: 1, boxes: 1 },
  pack: { pack: 1, packs: 1, package: 1, packages: 1, container: 1 },
};

const FRACTION_MAP: Record<string, number> = {
  "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 0.333, "⅔": 0.667, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

function parseIngredient(raw: string): { qty: number; unit: string; name: string } {
  let s = raw.trim().toLowerCase();
  s = s.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  for (const [glyph, val] of Object.entries(FRACTION_MAP)) s = s.split(glyph).join(` ${val} `);
  const numMatch = s.match(/^(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?(?:\s*\/\s*(\d+))?\s*/);
  let qty = 1;
  if (numMatch) {
    const whole = parseFloat(numMatch[1]);
    if (numMatch[2] && numMatch[3]) qty = whole + parseFloat(numMatch[2]) / parseFloat(numMatch[3]);
    else if (numMatch[4]) qty = whole / parseFloat(numMatch[4]);
    else qty = whole;
    s = s.slice(numMatch[0].length).trim();
  }
  const unitMatch = s.match(/^(lbs?|pounds?|ounces?|oz|grams?|g|kg|cups?|c|tablespoons?|tbsp|teaspoons?|tsp|ml|liters?|l|gallons?|gal|quarts?|qt|cans?|jars?|boxes?|bags?|packs?|packages?|containers?|loaves|loaf|slices?|cloves?|bunches|bunch|heads?|dozen|whole|pieces?|each)\b\.?\s*/);
  let unit = "";
  if (unitMatch) { unit = unitMatch[1].replace(/\.$/, ""); s = s.slice(unitMatch[0].length).trim(); }
  s = s.replace(/^of\s+/, "").trim().split(",")[0].trim();
  s = s.replace(/^(fresh|raw|cooked|frozen|canned|dried|organic|large|medium|small|extra|lean)\s+/g, "").trim();
  return { qty: isNaN(qty) ? 1 : qty, unit, name: s };
}

function lookupPrice(name: string): UnitPrice | null {
  if (!name) return null;
  if (PRICE_TABLE[name]) return PRICE_TABLE[name];
  const keys = Object.keys(PRICE_TABLE).sort((a, b) => b.length - a.length);
  for (const k of keys) if (name.includes(k)) return PRICE_TABLE[k];
  return null;
}

/** Aggregate raw ingredient strings across many meals into an estimated total $. */
export function estimateGroceryTotal(meals: Array<{ ingredients?: any }>): number {
  const agg = new Map<string, { qty: number; price: number; unit: string }>();
  for (const meal of meals) {
    const ings = Array.isArray(meal.ingredients) ? (meal.ingredients as any[]) : [];
    for (const raw of ings) {
      if (typeof raw !== "string" || !raw.trim()) continue;
      const parsed = parseIngredient(raw);
      const tableEntry = lookupPrice(parsed.name);
      if (!tableEntry) continue;
      const conv = UNIT_CONVERSIONS[tableEntry.unit];
      const factor = conv && parsed.unit && conv[parsed.unit] !== undefined
        ? conv[parsed.unit]
        : conv && !parsed.unit && conv[""] !== undefined ? conv[""] : 1;
      const qtyInTableUnit = parsed.qty * factor;
      const key = parsed.name;
      const existing = agg.get(key);
      if (existing) existing.qty += qtyInTableUnit;
      else agg.set(key, { qty: qtyInTableUnit, price: tableEntry.price, unit: tableEntry.unit });
    }
  }
  let total = 0;
  for (const a of agg.values()) total += Math.max(0.25, a.qty * a.price);
  return Math.round(total * 100) / 100;
}
