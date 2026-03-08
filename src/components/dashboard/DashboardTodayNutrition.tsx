import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Utensils,
  ShoppingCart,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Camera,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
  snack: "🍎 Snack",
};
const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"];

type GroceryItem = { name: string; quantity: string; estimated_price: number; note?: string };
type GroceryCategory = { name: string; items: GroceryItem[] };
type GroceryList = {
  store: string;
  budget: string;
  categories: GroceryCategory[];
  estimated_total: number;
  budget_status: string;
  savings_tips: string[];
};

// Parse a YYYY-MM-DD date string as LOCAL midnight (not UTC).
// new Date("2026-02-01") parses as UTC 00:00, which is wrong for clients in UTC-N timezones.
const parseLocalDate = (dateStr: string) => new Date(dateStr + "T00:00:00");

const DashboardTodayNutrition = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [groceryOpen, setGroceryOpen] = useState(false);

  // Today in client's local time (no UTC offset issues)
  const today = new Date();
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Day-of-week fallback (Mon=1 ... Sun=7)
  const todayDOW = today.getDay();
  const planDayOfWeek = todayDOW === 0 ? 7 : todayDOW;

  // Fetch active nutrition plan
  const { data: activePlan } = useQuery({
    queryKey: ["nutrition-plan-today", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("nutrition_plans")
        .select("id, title, daily_calories, protein_grams, carbs_grams, fat_grams, duration_weeks, start_date")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Determine today's day_number within the plan using LOCAL dates
  const todayDayNumber = (() => {
    if (!activePlan?.start_date) return planDayOfWeek;
    const start = parseLocalDate(activePlan.start_date);
    const diffDays = Math.floor((todayLocal.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 1;
    const totalDays = (activePlan.duration_weeks || 4) * 7;
    return (diffDays % totalDays) + 1;
  })();

  // Current week number in the plan using LOCAL dates
  const currentWeek = activePlan?.start_date
    ? Math.max(
        1,
        Math.min(
          Math.ceil(
            (Math.floor((todayLocal.getTime() - parseLocalDate(activePlan.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1) / 7
          ),
          activePlan.duration_weeks || 4
        )
      )
    : 1;

  // Fetch today's logged macro entries
  const todayDateStr = format(today, "yyyy-MM-dd");
  const { data: macroLogs = [] } = useQuery({
    queryKey: ["macro-logs", user?.id, todayDateStr],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("macro_logs")
        .select("calories, protein_grams, carbs_grams, fat_grams")
        .eq("user_id", user.id)
        .eq("log_date", todayDateStr);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const loggedTotals = macroLogs.reduce(
    (acc, entry) => ({
      calories: acc.calories + (entry.calories || 0),
      protein: acc.protein + (entry.protein_grams || 0),
      carbs: acc.carbs + (entry.carbs_grams || 0),
      fat: acc.fat + (entry.fat_grams || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Fetch today's meals
  const { data: todayMeals = [] } = useQuery({
    queryKey: ["nutrition-today-meals", activePlan?.id, todayDayNumber],
    queryFn: async () => {
      if (!activePlan) return [];
      const { data, error } = await supabase
        .from("nutrition_plan_meals")
        .select("*")
        .eq("plan_id", activePlan.id)
        .eq("day_number", todayDayNumber)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!activePlan,
  });

  const sortedMeals = [...todayMeals].sort(
    (a, b) => MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type)
  );

  const groceryMutation = useMutation({
    mutationFn: async () => {
      if (!activePlan) throw new Error("No plan");
      const { data, error } = await supabase.functions.invoke("generate-grocery-list", {
        body: { planId: activePlan.id, week: currentWeek },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.groceryList as GroceryList;
    },
    onSuccess: (data) => {
      setGroceryList(data);
      setGroceryOpen(true);
      toast({ title: "Grocery list generated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Check if user has a questionnaire
  const { data: hasQuestionnaire } = useQuery({
    queryKey: ["has-questionnaire-widget", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { count, error } = await supabase
        .from("client_questionnaires")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (error) return false;
      return (count ?? 0) > 0;
    },
    enabled: !!user && !activePlan,
  });

  if (!activePlan) {
    // Show notification for clients without a questionnaire
    if (hasQuestionnaire === false) {
      return (
        <div className="card-apollo p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-heading text-sm mb-1">Complete Your Questionnaire</p>
              <p className="text-xs text-muted-foreground mb-3">
                Fill out your profile so Coach Marcos can create your personalized weekly meal plan with meals tailored to your goals and preferences.
              </p>
              <Link to="/questionnaire">
                <Button variant="apollo" size="sm" className="gap-2">
                  <ClipboardList className="w-3.5 h-3.5" /> Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const todayLabel = format(today, "EEEE");

  return (
    <>
      {/* TODAY'S MEAL PLAN */}
      <div className="card-apollo p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Utensils className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-heading text-sm">{todayLabel}'s Meals</p>
              <p className="text-[10px] text-primary">{activePlan.daily_calories} kcal · refreshes weekly</p>
            </div>
          </div>
          <Link to="/dashboard/nutrition">
            <Button variant="ghost" size="sm" className="text-primary text-xs h-7">
              Full Plan <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Logged Macros Progress — compact single row */}
        {macroLogs.length > 0 && (
          <div className="mb-3 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-3">
            <Camera className="w-3 h-3 text-primary flex-shrink-0" />
            <div className="flex gap-3 flex-1 text-xs">
              <span className="text-primary font-medium">{loggedTotals.calories} cal</span>
              <span className="text-muted-foreground">P:{loggedTotals.protein}g</span>
              <span className="text-muted-foreground">C:{loggedTotals.carbs}g</span>
              <span className="text-muted-foreground">F:{loggedTotals.fat}g</span>
            </div>
            <Link to="/dashboard/macros" className="text-[10px] text-muted-foreground hover:text-primary flex-shrink-0">
              View →
            </Link>
          </div>
        )}

        {sortedMeals.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No meals scheduled for today.
          </p>
        ) : (
          <div className="space-y-1.5">
            {sortedMeals.slice(0, 3).map((meal) => (
              <div
                key={meal.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide flex-shrink-0">
                      {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
                    </p>
                    <p className="font-medium text-xs truncate">{meal.meal_name}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span className="font-medium">{meal.calories} cal</span>
                    <span>P:{meal.protein_grams}g</span>
                    <span>C:{meal.carbs_grams}g</span>
                    <span>F:{meal.fat_grams}g</span>
                  </div>
                </div>
              </div>
            ))}
            {sortedMeals.length > 3 && (
              <Link to="/dashboard/nutrition">
                <p className="text-xs text-primary text-center hover:underline cursor-pointer">
                  +{sortedMeals.length - 3} more meals — tap to view
                </p>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* GROCERY LIST */}
      <div className="card-apollo p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-heading text-sm">Grocery List</p>
              <p className="text-[10px] text-muted-foreground">Week {currentWeek} of {activePlan.duration_weeks || 4}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {groceryList && (
              <button
                onClick={() => setGroceryOpen((o) => !o)}
                className="text-muted-foreground hover:text-foreground"
              >
                {groceryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
            <Link to="/dashboard/nutrition">
              <Button variant="ghost" size="sm" className="text-primary text-xs h-7">
                Full View <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {!groceryList ? (
          <Button
            variant="apollo-outline"
            size="sm"
            className="w-full"
            onClick={() => groceryMutation.mutate()}
            disabled={groceryMutation.isPending}
          >
            {groceryMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><ShoppingCart className="w-4 h-4 mr-2" /> Generate This Week's List</>
            )}
          </Button>
        ) : (
          <>
            {/* Summary row */}
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-muted-foreground">{groceryList.store}</span>
              <span className={`font-medium ${groceryList.budget_status === "over" ? "text-destructive" : "text-primary"}`}>
                ${groceryList.estimated_total.toFixed(2)} / {groceryList.budget}
              </span>
            </div>

            {groceryOpen && (
              <div className="space-y-3">
                {groceryList.categories.map((cat) => (
                  <div key={cat.name}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {cat.name}
                    </p>
                    <div className="space-y-1">
                      {cat.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0"
                        >
                          <span className="truncate flex-1">{item.name}</span>
                          <span className="text-muted-foreground text-xs ml-3 flex-shrink-0">
                            {item.quantity}
                          </span>
                          <span className="text-muted-foreground text-xs ml-3 flex-shrink-0">
                            ${item.estimated_price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {groceryList.savings_tips?.length > 0 && (
                  <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-xs font-medium text-primary mb-1">💡 Savings Tips</p>
                    {groceryList.savings_tips.map((tip, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{tip}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs text-muted-foreground"
              onClick={() => groceryMutation.mutate()}
              disabled={groceryMutation.isPending}
            >
              {groceryMutation.isPending ? "Regenerating..." : "Regenerate"}
            </Button>
          </>
        )}
      </div>
    </>
  );
};

export default DashboardTodayNutrition;
