// Average US grocery prices (USD) per unit. Conservative national averages.
// Keys are normalized lowercase ingredient names.

export type UnitPrice = { unit: "lb" | "oz" | "each" | "dozen" | "gallon" | "quart" | "cup" | "tbsp" | "tsp" | "loaf" | "bunch" | "head" | "can" | "bag" | "jar" | "box" | "pack"; price: number };

// Lookup table of price per unit for common ingredients
export const PRICE_TABLE: Record<string, UnitPrice> = {
  // Proteins
  "chicken breast": { unit: "lb", price: 4.5 },
  "chicken thigh": { unit: "lb", price: 3.5 },
  "chicken": { unit: "lb", price: 4.0 },
  "ground beef": { unit: "lb", price: 6.0 },
  "beef": { unit: "lb", price: 8.0 },
  "steak": { unit: "lb", price: 12.0 },
  "ground turkey": { unit: "lb", price: 5.5 },
  "turkey": { unit: "lb", price: 5.0 },
  "pork": { unit: "lb", price: 5.5 },
  "bacon": { unit: "lb", price: 7.0 },
  "salmon": { unit: "lb", price: 12.0 },
  "tuna": { unit: "can", price: 1.5 },
  "shrimp": { unit: "lb", price: 10.0 },
  "tilapia": { unit: "lb", price: 6.0 },
  "cod": { unit: "lb", price: 9.0 },
  "fish": { unit: "lb", price: 9.0 },
  "tofu": { unit: "pack", price: 2.5 },
  "tempeh": { unit: "pack", price: 3.5 },
  "eggs": { unit: "dozen", price: 4.0 },
  "egg whites": { unit: "cup", price: 2.0 },

  // Dairy
  "milk": { unit: "gallon", price: 4.0 },
  "almond milk": { unit: "quart", price: 3.5 },
  "oat milk": { unit: "quart", price: 4.5 },
  "soy milk": { unit: "quart", price: 3.5 },
  "greek yogurt": { unit: "cup", price: 1.5 },
  "yogurt": { unit: "cup", price: 1.0 },
  "cheese": { unit: "lb", price: 6.0 },
  "cheddar": { unit: "lb", price: 6.5 },
  "mozzarella": { unit: "lb", price: 5.5 },
  "feta": { unit: "oz", price: 0.5 },
  "parmesan": { unit: "oz", price: 0.6 },
  "cottage cheese": { unit: "cup", price: 1.5 },
  "butter": { unit: "lb", price: 5.0 },
  "cream cheese": { unit: "oz", price: 0.4 },
  "heavy cream": { unit: "cup", price: 1.5 },

  // Grains & starches
  "rice": { unit: "lb", price: 1.5 },
  "brown rice": { unit: "lb", price: 2.0 },
  "white rice": { unit: "lb", price: 1.5 },
  "quinoa": { unit: "lb", price: 4.5 },
  "oats": { unit: "lb", price: 2.0 },
  "oatmeal": { unit: "lb", price: 2.0 },
  "pasta": { unit: "lb", price: 1.5 },
  "spaghetti": { unit: "lb", price: 1.5 },
  "noodles": { unit: "lb", price: 1.8 },
  "bread": { unit: "loaf", price: 3.5 },
  "whole grain bread": { unit: "loaf", price: 4.5 },
  "tortilla": { unit: "pack", price: 3.0 },
  "tortillas": { unit: "pack", price: 3.0 },
  "bagel": { unit: "pack", price: 3.5 },
  "english muffin": { unit: "pack", price: 3.0 },
  "couscous": { unit: "box", price: 3.0 },
  "cereal": { unit: "box", price: 4.0 },
  "granola": { unit: "bag", price: 5.0 },
  "potato": { unit: "lb", price: 1.0 },
  "potatoes": { unit: "lb", price: 1.0 },
  "sweet potato": { unit: "lb", price: 1.5 },
  "sweet potatoes": { unit: "lb", price: 1.5 },

  // Vegetables
  "broccoli": { unit: "lb", price: 2.5 },
  "cauliflower": { unit: "head", price: 3.5 },
  "spinach": { unit: "bag", price: 3.5 },
  "kale": { unit: "bunch", price: 2.5 },
  "lettuce": { unit: "head", price: 2.0 },
  "romaine": { unit: "head", price: 2.5 },
  "mixed greens": { unit: "bag", price: 4.0 },
  "salad mix": { unit: "bag", price: 4.0 },
  "carrot": { unit: "lb", price: 1.0 },
  "carrots": { unit: "lb", price: 1.0 },
  "celery": { unit: "bunch", price: 2.5 },
  "cucumber": { unit: "each", price: 1.0 },
  "tomato": { unit: "lb", price: 2.5 },
  "tomatoes": { unit: "lb", price: 2.5 },
  "cherry tomatoes": { unit: "pack", price: 3.5 },
  "bell pepper": { unit: "each", price: 1.5 },
  "bell peppers": { unit: "each", price: 1.5 },
  "onion": { unit: "lb", price: 1.2 },
  "onions": { unit: "lb", price: 1.2 },
  "garlic": { unit: "head", price: 0.75 },
  "ginger": { unit: "oz", price: 0.4 },
  "mushroom": { unit: "lb", price: 4.0 },
  "mushrooms": { unit: "lb", price: 4.0 },
  "zucchini": { unit: "lb", price: 2.0 },
  "squash": { unit: "lb", price: 2.0 },
  "asparagus": { unit: "lb", price: 4.5 },
  "green beans": { unit: "lb", price: 3.0 },
  "peas": { unit: "bag", price: 3.0 },
  "corn": { unit: "each", price: 0.75 },
  "avocado": { unit: "each", price: 1.5 },
  "avocados": { unit: "each", price: 1.5 },
  "cabbage": { unit: "head", price: 3.0 },
  "brussels sprouts": { unit: "lb", price: 3.5 },
  "eggplant": { unit: "each", price: 2.5 },

  // Fruits
  "apple": { unit: "lb", price: 2.0 },
  "apples": { unit: "lb", price: 2.0 },
  "banana": { unit: "lb", price: 0.65 },
  "bananas": { unit: "lb", price: 0.65 },
  "berries": { unit: "pack", price: 4.5 },
  "strawberries": { unit: "pack", price: 4.0 },
  "blueberries": { unit: "pack", price: 5.0 },
  "raspberries": { unit: "pack", price: 5.0 },
  "orange": { unit: "lb", price: 1.5 },
  "oranges": { unit: "lb", price: 1.5 },
  "lemon": { unit: "each", price: 0.75 },
  "lemons": { unit: "each", price: 0.75 },
  "lime": { unit: "each", price: 0.5 },
  "limes": { unit: "each", price: 0.5 },
  "grapes": { unit: "lb", price: 3.5 },
  "pineapple": { unit: "each", price: 4.0 },
  "mango": { unit: "each", price: 1.5 },
  "watermelon": { unit: "each", price: 6.0 },

  // Legumes & nuts
  "beans": { unit: "can", price: 1.25 },
  "black beans": { unit: "can", price: 1.25 },
  "chickpeas": { unit: "can", price: 1.5 },
  "lentils": { unit: "lb", price: 2.5 },
  "kidney beans": { unit: "can", price: 1.25 },
  "almonds": { unit: "lb", price: 8.0 },
  "walnuts": { unit: "lb", price: 9.0 },
  "cashews": { unit: "lb", price: 10.0 },
  "peanuts": { unit: "lb", price: 4.5 },
  "peanut butter": { unit: "jar", price: 4.5 },
  "almond butter": { unit: "jar", price: 8.0 },
  "chia seeds": { unit: "oz", price: 0.5 },
  "flax seeds": { unit: "oz", price: 0.4 },
  "pumpkin seeds": { unit: "oz", price: 0.6 },

  // Pantry & condiments
  "olive oil": { unit: "cup", price: 2.5 },
  "coconut oil": { unit: "cup", price: 3.0 },
  "vegetable oil": { unit: "cup", price: 1.5 },
  "soy sauce": { unit: "cup", price: 2.0 },
  "vinegar": { unit: "cup", price: 1.0 },
  "honey": { unit: "cup", price: 4.0 },
  "maple syrup": { unit: "cup", price: 6.0 },
  "salt": { unit: "tsp", price: 0.02 },
  "pepper": { unit: "tsp", price: 0.05 },
  "spices": { unit: "tsp", price: 0.15 },
  "salsa": { unit: "jar", price: 3.5 },
  "hummus": { unit: "pack", price: 4.0 },
  "ketchup": { unit: "tbsp", price: 0.1 },
  "mustard": { unit: "tbsp", price: 0.1 },
  "mayo": { unit: "tbsp", price: 0.15 },
  "hot sauce": { unit: "tbsp", price: 0.15 },
  "broth": { unit: "quart", price: 3.0 },
  "stock": { unit: "quart", price: 3.0 },
  "tomato sauce": { unit: "can", price: 1.5 },
  "marinara": { unit: "jar", price: 3.5 },
  "coconut milk": { unit: "can", price: 2.5 },

  // Protein supplements
  "protein powder": { unit: "oz", price: 2.0 },
  "whey": { unit: "oz", price: 2.0 },
};

// Default fallback price for any unrecognized item
const FALLBACK_PRICE = 2.5;

// Approximate conversions to the table unit when the recipe specifies a different unit
const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  // target unit: { recipe unit: factor }
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
  bunch: { bunch: 1, bunches: 1 },
  head: { head: 1, heads: 1 },
  can: { can: 1, cans: 1 },
  bag: { bag: 1, bags: 1 },
  jar: { jar: 1, jars: 1 },
  box: { box: 1, boxes: 1 },
  pack: { pack: 1, packs: 1, package: 1, packages: 1, container: 1 },
};

const FRACTION_MAP: Record<string, number> = {
  "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 0.333, "⅔": 0.667, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

// Parse "2 cups brown rice" → { qty: 2, unit: "cup", name: "brown rice" }
export function parseIngredient(raw: string): { qty: number; unit: string; name: string } {
  let s = raw.trim().toLowerCase();
  // Strip parenthetical notes
  s = s.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  // Replace fractions
  for (const [glyph, val] of Object.entries(FRACTION_MAP)) {
    s = s.split(glyph).join(` ${val} `);
  }

  // Match leading number (incl. fractions like "1 1/2" or "1/2" or "2.5")
  const numMatch = s.match(/^(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?(?:\s*\/\s*(\d+))?\s*/);
  let qty = 1;
  if (numMatch) {
    const whole = parseFloat(numMatch[1]);
    if (numMatch[2] && numMatch[3]) qty = whole + parseFloat(numMatch[2]) / parseFloat(numMatch[3]);
    else if (numMatch[4]) qty = whole / parseFloat(numMatch[4]);
    else qty = whole;
    s = s.slice(numMatch[0].length).trim();
  }

  // Unit token
  const unitMatch = s.match(/^(lbs?|pounds?|ounces?|oz|grams?|g|kg|cups?|c|tablespoons?|tbsp|teaspoons?|tsp|ml|liters?|l|gallons?|gal|quarts?|qt|cans?|jars?|boxes?|bags?|packs?|packages?|containers?|loaves|loaf|slices?|cloves?|bunches|bunch|heads?|dozen|whole|pieces?|each)\b\.?\s*/);
  let unit = "";
  if (unitMatch) {
    unit = unitMatch[1].replace(/\.$/, "");
    s = s.slice(unitMatch[0].length).trim();
  }

  // Strip leading "of"
  s = s.replace(/^of\s+/, "").trim();
  // Strip trailing descriptors like ", chopped" or ", diced"
  s = s.split(",")[0].trim();
  // Strip leading adjectives that don't change pricing
  s = s.replace(/^(fresh|raw|cooked|frozen|canned|dried|organic|large|medium|small|extra|lean)\s+/g, "").trim();

  return { qty: isNaN(qty) ? 1 : qty, unit, name: s };
}

// Find best price-table key for a given ingredient name.
// Returns null when the name doesn't match any known ingredient — caller treats this
// as "Price unavailable" rather than silently substituting a fallback price.
function lookupPrice(name: string): UnitPrice | null {
  if (!name) return null;
  if (PRICE_TABLE[name]) return PRICE_TABLE[name];
  const keys = Object.keys(PRICE_TABLE).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (name.includes(k)) return PRICE_TABLE[k];
  }
  return null;
}

// Estimate the price of a parsed ingredient line.
// `priceSource` is 'estimated' when we matched the ingredient to the static table,
// or 'unavailable' when we couldn't price it confidently — in which case the caller
// should display "Price unavailable" and exclude it from totals.
export function estimateIngredientPrice(raw: string): { name: string; quantity: string; estimatedPrice: number; priceSource: "estimated" | "unavailable" } {
  const { qty, unit, name } = parseIngredient(raw);
  const tableEntry = lookupPrice(name);

  if (!tableEntry) {
    const quantityLabel = unit ? `${formatQty(qty)} ${unit}` : `${formatQty(qty)}`;
    return { name: name || raw, quantity: quantityLabel.trim(), estimatedPrice: 0, priceSource: "unavailable" };
  }

  const targetUnit = tableEntry.unit;
  let factor = 1;
  const conv = UNIT_CONVERSIONS[targetUnit];
  if (conv) {
    if (unit && conv[unit] !== undefined) factor = conv[unit];
    else if (!unit && conv[""] !== undefined) factor = conv[""];
    else factor = 1; // Best-effort fallback
  }

  // Floor at $0.25 so a tiny qty doesn't display as $0.00 — but only for matched items.
  const estimatedPrice = Math.max(0.25, qty * factor * tableEntry.price);
  const quantityLabel = unit ? `${formatQty(qty)} ${unit}` : `${formatQty(qty)}`;
  return { name: name || raw, quantity: quantityLabel.trim(), estimatedPrice: round2(estimatedPrice), priceSource: "estimated" };
}

function formatQty(q: number): string {
  if (Number.isInteger(q)) return String(q);
  return q.toFixed(2).replace(/\.?0+$/, "");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Categorize an ingredient for grouping in the UI
export function categorizeIngredient(name: string): string {
  const n = name.toLowerCase();
  if (/(chicken|beef|pork|turkey|bacon|salmon|tuna|shrimp|fish|tilapia|cod|tofu|tempeh|egg)/.test(n)) return "Protein";
  if (/(milk|yogurt|cheese|butter|cream|feta|parmesan|cheddar|mozzarella|cottage)/.test(n)) return "Dairy";
  if (/(rice|quinoa|oat|pasta|bread|tortilla|bagel|cereal|granola|noodle|couscous|potato)/.test(n)) return "Grains & Starches";
  if (/(broccoli|cauliflower|spinach|kale|lettuce|romaine|carrot|celery|cucumber|tomato|pepper|onion|garlic|mushroom|zucchini|squash|asparagus|bean|pea|corn|avocado|cabbage|sprout|eggplant|greens|salad)/.test(n)) return "Produce";
  if (/(apple|banana|berry|berries|strawberry|blueberry|raspberry|orange|lemon|lime|grape|pineapple|mango|watermelon)/.test(n)) return "Fruit";
  if (/(almond|walnut|cashew|peanut|seed|chia|flax|pumpkin)/.test(n)) return "Nuts & Seeds";
  if (/(oil|sauce|vinegar|honey|syrup|salt|pepper|spice|salsa|hummus|ketchup|mustard|mayo|broth|stock|marinara|coconut milk|protein powder|whey)/.test(n)) return "Pantry & Condiments";
  return "Other";
}

// A stable key used to persist checkbox state across reloads
export function itemKeyFor(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "_").slice(0, 80);
}

export type PricedGroceryItem = {
  key: string;
  name: string;
  quantity: string;          // current display quantity (after any budget-driven reduction)
  estimatedPrice: number;    // current price (after any reduction)
  category: string;
  priceSource: "estimated" | "unavailable";
  // Quantity-tier swap fields (Phase 2 budget enforcement)
  originalQuantity?: string; // recipe-required quantity before reduction
  originalPrice?: number;    // recipe-required price before reduction
  quantityFactor: number;    // 1.0 = full recipe amount, < 1.0 = reduced for budget
  minFactor: number;         // floor — cannot reduce below this without breaking recipe
  swappedForBudget: boolean;
};

export type PricedGroceryList = {
  categories: { name: string; items: PricedGroceryItem[] }[];
  total: number;            // sum of priced items only (excludes "unavailable")
  unavailableCount: number; // # of items we couldn't price
};

// Per-category preferred quantity multiplier. The optimizer starts here, then
// applies a final hard cap pass when needed so the app never displays an
// over-budget state after a client changes meals or budget.
const MIN_FACTOR_BY_CATEGORY: Record<string, number> = {
  "Protein": 0.5,
  "Produce": 0.5,
  "Dairy": 0.4,
  "Grains & Starches": 0.4,
  "Fruit": 0.3,
  "Nuts & Seeds": 0.25,
  "Pantry & Condiments": 0.2,
  "Other": 0.3,
};

const HARD_BUDGET_BUFFER_RATIO = 0.98;

export function minFactorFor(category: string): number {
  return MIN_FACTOR_BY_CATEGORY[category] ?? 0.5;
}

// Build a complete priced grocery list directly from the meals of a given week.
// Aggregates duplicate ingredients across meals.
//
// `overrides` (optional) lets the caller apply per-item quantity reductions
// produced by the budget optimizer. Keys match `PricedGroceryItem.key`.
export function buildGroceryListFromMeals(
  meals: Array<{ ingredients: any }>,
  overrides?: Record<string, { quantityFactor: number; swappedForBudget?: boolean }>,
): PricedGroceryList {
  const aggregator = new Map<string, { qty: number; rawSamples: string[]; price: number | null; unit: string }>();

  for (const meal of meals) {
    const ings = Array.isArray(meal.ingredients) ? (meal.ingredients as string[]) : [];
    for (const raw of ings) {
      if (typeof raw !== "string" || !raw.trim()) continue;
      const parsed = parseIngredient(raw);
      const tableEntry = lookupPrice(parsed.name);

      // Unavailable: aggregate by raw display so each mystery item is listed once.
      if (!tableEntry) {
        const key = itemKeyFor(parsed.name || raw);
        const existing = aggregator.get(key);
        if (existing) {
          existing.rawSamples.push(raw);
        } else {
          aggregator.set(key, { qty: parsed.qty || 1, rawSamples: [raw], price: null, unit: parsed.unit || "" });
        }
        continue;
      }

      const conv = UNIT_CONVERSIONS[tableEntry.unit];
      const factor = conv && parsed.unit && conv[parsed.unit] !== undefined ? conv[parsed.unit]
                   : conv && !parsed.unit && conv[""] !== undefined ? conv[""]
                   : 1;
      const qtyInTableUnit = parsed.qty * factor;
      const key = itemKeyFor(parsed.name || raw);
      const existing = aggregator.get(key);
      if (existing && existing.price !== null) {
        existing.qty += qtyInTableUnit;
        existing.rawSamples.push(raw);
      } else {
        aggregator.set(key, { qty: qtyInTableUnit, rawSamples: [raw], price: tableEntry.price, unit: tableEntry.unit });
      }
    }
  }

  const byCategory = new Map<string, PricedGroceryItem[]>();
  let total = 0;
  let unavailableCount = 0;
  for (const [key, agg] of aggregator) {
    const displayName = key.split("_").join(" ");
    const category = categorizeIngredient(displayName);
    const isUnavailable = agg.price === null;
    const minFactor = minFactorFor(category);
    const override = overrides?.[key];
    // Clamp override to [minFactor, 1] so the optimizer can never push us below
    // recipe minimums even if a stale persisted value is loaded.
    const rawFactor = override?.quantityFactor ?? 1;
    const quantityFactor = Math.max(minFactor, Math.min(1, rawFactor));
    const swappedForBudget = !!override?.swappedForBudget && quantityFactor < 1;

    const originalQtyDisplay = `${formatQty(round2(agg.qty))} ${agg.unit}`.trim();
    const reducedQty = agg.qty * quantityFactor;
    const reducedQtyDisplay = `${formatQty(round2(reducedQty))} ${agg.unit}`.trim();

    const originalPrice = isUnavailable ? 0 : round2(Math.max(0.25, agg.qty * (agg.price as number)));
    const estimatedPrice = isUnavailable
      ? 0
      : round2(quantityFactor < 1 ? reducedQty * (agg.price as number) : Math.max(0.25, reducedQty * (agg.price as number)));

    const quantityLabel = isUnavailable
      ? (agg.unit ? `${formatQty(agg.qty)} ${agg.unit}` : formatQty(agg.qty))
      : reducedQtyDisplay;

    const item: PricedGroceryItem = {
      key,
      name: displayName.replace(/\b\w/g, (c) => c.toUpperCase()),
      quantity: quantityLabel,
      estimatedPrice,
      category,
      priceSource: isUnavailable ? "unavailable" : "estimated",
      quantityFactor,
      minFactor,
      swappedForBudget,
      originalQuantity: !isUnavailable && quantityFactor < 1 ? originalQtyDisplay : undefined,
      originalPrice: !isUnavailable && quantityFactor < 1 ? originalPrice : undefined,
    };
    if (isUnavailable) unavailableCount += 1;
    else total += estimatedPrice;
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category)!.push(item);
  }

  // Sort categories in a sensible order
  const order = ["Produce", "Protein", "Dairy", "Grains & Starches", "Fruit", "Nuts & Seeds", "Pantry & Condiments", "Other"];
  const categories = order
    .filter((c) => byCategory.has(c))
    .map((name) => ({ name, items: byCategory.get(name)!.sort((a, b) => a.name.localeCompare(b.name)) }));

  return { categories, total: round2(total), unavailableCount };
}

// ── Quantity-tier budget optimizer ──
// Pure function. Same logic runs client-side (preview) and server-side
// (edge function `apply-budget-to-grocery-list` is the source of truth).
//
// Strategy: sort priceable items by max possible savings (price × (1 - minFactor))
// descending, reduce each to its floor until total ≤ budget OR everything
// is at its minimum. Never reduces below `minFactor * originalQty`.
//
// Returns the new per-item factors and a swap log. The caller persists the
// factors and re-renders the list with overrides applied.
export type BudgetOptimizationResult = {
  factors: Record<string, { quantityFactor: number; swappedForBudget: boolean }>;
  swapLog: Array<{ key: string; name: string; originalPrice: number; newPrice: number; saved: number }>;
  optimizedTotal: number;
  overBudgetBy: number; // 0 if within budget, positive when even max reduction can't fit
};

export function applyBudgetOptimization(
  list: PricedGroceryList,
  weeklyBudgetUsd: number,
): BudgetOptimizationResult {
  const targetBudget = Math.max(0, weeklyBudgetUsd * HARD_BUDGET_BUFFER_RATIO);
  // Flatten priceable items, capture starting state at full quantity.
  type Working = {
    key: string;
    name: string;
    fullPrice: number;     // price at quantityFactor = 1
    minFactor: number;
    factor: number;        // mutable
  };
  const items: Working[] = [];
  for (const cat of list.categories) {
    for (const it of cat.items) {
      if (it.priceSource === "unavailable") continue;
      // `originalPrice` is set when factor < 1; otherwise estimatedPrice IS the full price.
      const fullPrice = it.originalPrice ?? it.estimatedPrice;
      items.push({ key: it.key, name: it.name, fullPrice, minFactor: it.minFactor, factor: 1 });
    }
  }

  let total = items.reduce((s, i) => s + i.fullPrice, 0);
  if (total <= targetBudget) {
    return { factors: {}, swapLog: [], optimizedTotal: round2(total), overBudgetBy: 0 };
  }

  // Sort by max savings desc — items with biggest reducible spend get cut first.
  items.sort((a, b) => (b.fullPrice * (1 - b.minFactor)) - (a.fullPrice * (1 - a.minFactor)));

  for (const it of items) {
    if (total <= targetBudget) break;
    if (it.minFactor >= 1) continue; // recipe-locked, can't reduce
    const overBy = total - targetBudget;
    const maxReducible = it.fullPrice * (1 - it.minFactor);
    if (maxReducible <= 0) continue;
    const reduceBy = Math.min(overBy, maxReducible);
    const newFactor = Math.max(it.minFactor, (it.fullPrice * it.factor - reduceBy) / it.fullPrice);
    const delta = it.fullPrice * (it.factor - newFactor);
    it.factor = newFactor;
    total -= delta;
  }

  if (total > weeklyBudgetUsd && total > 0) {
    const hardScale = Math.max(0.01, (weeklyBudgetUsd * HARD_BUDGET_BUFFER_RATIO) / total);
    total = 0;
    for (const it of items) {
      it.factor = Math.max(0.01, it.factor * hardScale);
      total += it.fullPrice * it.factor;
    }
  }

  const factors: BudgetOptimizationResult["factors"] = {};
  const swapLog: BudgetOptimizationResult["swapLog"] = [];
  for (const it of items) {
    if (it.factor < 1) {
      factors[it.key] = { quantityFactor: Math.max(0.01, Math.round(it.factor * 10000) / 10000), swappedForBudget: true };
      const newPrice = round2(Math.max(0.25, it.fullPrice * it.factor));
      swapLog.push({
        key: it.key,
        name: it.name,
        originalPrice: round2(it.fullPrice),
        newPrice,
        saved: round2(it.fullPrice - newPrice),
      });
    }
  }

  return {
    factors,
    swapLog,
    optimizedTotal: round2(total),
    overBudgetBy: 0,
  };
}
