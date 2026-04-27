// Dietary restriction enforcement.
// Hard-blocks any meal whose ingredients/name contain forbidden keywords for the
// active restrictions. Used both in the UI (to filter incoming meals) and to
// validate freshly-generated plans.

export type Restriction =
  | "vegan"
  | "vegetarian"
  | "pescatarian"
  | "dairy-free"
  | "gluten-free"
  | "nut-free"
  | "shellfish-free"
  | "egg-free"
  | "soy-free";

// Keyword groups (lowercase, matched as substrings on ingredient text).
const KEYWORDS = {
  meat: [
    "beef", "steak", "veal", "lamb", "pork", "ham", "bacon", "sausage", "prosciutto",
    "salami", "pepperoni", "chorizo", "chicken", "turkey", "duck", "goose", "rabbit",
    "venison", "bison", "ground meat", "meatball", "meat sauce", "gelatin", "lard",
    "broth", "stock", "anchov",
  ],
  fish_or_shellfish: [
    "salmon", "tuna", "tilapia", "cod", "halibut", "trout", "sardine", "mackerel",
    "swordfish", "snapper", "bass", "fish", "shrimp", "prawn", "crab", "lobster",
    "clam", "oyster", "mussel", "scallop", "squid", "octopus", "calamari", "anchovy",
    "anchovies", "caviar",
  ],
  shellfish: [
    "shrimp", "prawn", "crab", "lobster", "clam", "oyster", "mussel", "scallop",
    "squid", "octopus", "calamari",
  ],
  dairy: [
    "milk", "cream", "butter", "cheese", "yogurt", "yoghurt", "ghee", "whey",
    "casein", "lactose", "kefir", "cheddar", "mozzarella", "parmesan", "ricotta",
    "feta", "brie", "gouda", "swiss", "cottage cheese", "cream cheese", "ice cream",
    "half and half", "buttermilk",
  ],
  eggs: ["egg", "eggs", "egg white", "egg yolk", "mayonnaise", "mayo", "meringue", "aioli"],
  gluten: [
    "wheat", "flour", "bread", "pasta", "noodle", "spaghetti", "macaroni", "couscous",
    "barley", "rye", "bulgur", "semolina", "farro", "spelt", "seitan", "soy sauce",
    "teriyaki", "tortilla", "bagel", "pita", "cracker", "cake", "cookie", "pancake",
    "waffle", "muffin", "croissant", "biscuit", "panko", "breadcrumb", "cereal",
    "granola", "oats", "oatmeal",
  ],
  nuts: [
    "almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "macadamia",
    "brazil nut", "pine nut", "peanut", "nut butter", "marzipan", "praline",
  ],
  soy: ["soy", "tofu", "tempeh", "edamame", "miso", "tamari", "natto", "soybean"],
  honey: ["honey"], // for strict vegans
};

type Group = keyof typeof KEYWORDS;

// Map each restriction → groups that must be excluded
const RESTRICTION_GROUPS: Record<Restriction, Group[]> = {
  vegan: ["meat", "fish_or_shellfish", "dairy", "eggs", "honey"],
  vegetarian: ["meat", "fish_or_shellfish"],
  pescatarian: ["meat"],
  "dairy-free": ["dairy"],
  "gluten-free": ["gluten"],
  "nut-free": ["nuts"],
  "shellfish-free": ["shellfish"],
  "egg-free": ["eggs"],
  "soy-free": ["soy"],
};

// Friendly display labels
export const RESTRICTION_LABELS: Record<Restriction, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  pescatarian: "Pescatarian",
  "dairy-free": "Dairy-Free",
  "gluten-free": "Gluten-Free",
  "nut-free": "Nut-Free",
  "shellfish-free": "Shellfish-Free",
  "egg-free": "Egg-Free",
  "soy-free": "Soy-Free",
};

const ALL_RESTRICTIONS = Object.keys(RESTRICTION_GROUPS) as Restriction[];

// Normalize a free-form restriction string from the questionnaire to our enum
export function normalizeRestrictions(raw: unknown): Restriction[] {
  if (!Array.isArray(raw)) return [];
  const result = new Set<Restriction>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const v = item.toLowerCase().trim().replace(/\s+/g, "-");
    for (const r of ALL_RESTRICTIONS) {
      if (v === r || v.includes(r) || r.includes(v.replace(/-free$/, ""))) {
        result.add(r);
      }
    }
    // Common synonyms
    if (/\b(no|free).*dairy\b|lactose/.test(item)) result.add("dairy-free");
    if (/\b(no|free).*gluten\b|celiac/.test(item)) result.add("gluten-free");
    if (/\b(no|free).*nut|nut.*allerg/.test(item)) result.add("nut-free");
    if (/\b(no|free).*shellfish/.test(item)) result.add("shellfish-free");
    if (/\b(no|free).*egg/.test(item)) result.add("egg-free");
    if (/\b(no|free).*soy/.test(item)) result.add("soy-free");
    if (/vegan/i.test(item)) result.add("vegan");
    if (/vegetarian/i.test(item)) result.add("vegetarian");
    if (/pescatarian/i.test(item)) result.add("pescatarian");
  }
  return Array.from(result);
}

// Returns the list of forbidden keyword groups for the given restrictions
function forbiddenGroupsFor(restrictions: Restriction[]): Group[] {
  const set = new Set<Group>();
  for (const r of restrictions) {
    for (const g of RESTRICTION_GROUPS[r] || []) set.add(g);
  }
  return Array.from(set);
}

export type MealLike = {
  id?: string;
  meal_name?: string | null;
  description?: string | null;
  ingredients?: any;
};

// Test whether a meal violates any active restriction. Returns the offending
// keyword if it does, else null. Meals lacking ingredients are treated as
// violating (safer default).
export function findViolation(meal: MealLike, restrictions: Restriction[]): string | null {
  if (restrictions.length === 0) return null;
  const groups = forbiddenGroupsFor(restrictions);
  if (groups.length === 0) return null;

  const ings = Array.isArray(meal.ingredients) ? meal.ingredients : [];
  if (ings.length === 0) return "no ingredients listed";

  const haystack = [
    meal.meal_name || "",
    meal.description || "",
    ...ings.map((i: any) => (typeof i === "string" ? i : "")),
  ]
    .join(" \n ")
    .toLowerCase();

  for (const g of groups) {
    for (const kw of KEYWORDS[g]) {
      // Use word boundary for short words to avoid false positives
      const pattern = kw.length <= 4
        ? new RegExp(`\\b${kw}s?\\b`, "i")
        : new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (pattern.test(haystack)) return kw;
    }
  }
  return null;
}

export function filterMealsByRestrictions<T extends MealLike>(
  meals: T[],
  restrictions: Restriction[]
): { allowed: T[]; blocked: { meal: T; reason: string }[] } {
  const allowed: T[] = [];
  const blocked: { meal: T; reason: string }[] = [];
  for (const m of meals) {
    const v = findViolation(m, restrictions);
    if (v) blocked.push({ meal: m, reason: v });
    else allowed.push(m);
  }
  return { allowed, blocked };
}
