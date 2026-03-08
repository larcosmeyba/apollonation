import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Utensils, ChevronLeft, ChevronRight, Edit2, Save, X, ShoppingCart, Loader2, Lightbulb, DollarSign, Store, RefreshCw, Check, CalendarSync, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
  snack: "🍎 Snack",
};

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
type MealSuggestion = {
  meal_name: string;
  description: string;
  ingredients: string[];
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
};

const DashboardNutrition = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [groceryWeek, setGroceryWeek] = useState(1);
  const [swapMeal, setSwapMeal] = useState<any | null>(null);
  const [swapSuggestion, setSwapSuggestion] = useState<MealSuggestion | null>(null);
  const [swapLoading, setSwapLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editForm, setEditForm] = useState({
    meal_name: "",
    description: "",
    ingredients: "",
    calories: "",
    protein_grams: "",
    carbs_grams: "",
    fat_grams: "",
  });

  const { data: plans } = useQuery({
    queryKey: ["my-nutrition-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_plans")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const activePlan = selectedPlanId
    ? plans?.find((p) => p.id === selectedPlanId)
    : plans?.find((p) => p.status === "active") || plans?.[0];

  const { data: meals } = useQuery({
    queryKey: ["my-plan-meals", activePlan?.id],
    queryFn: async () => {
      if (!activePlan) return [];
      const { data, error } = await supabase
        .from("nutrition_plan_meals")
        .select("*")
        .eq("plan_id", activePlan.id)
        .order("day_number")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!activePlan,
  });

  const groceryMutation = useMutation({
    mutationFn: async ({ planId, week }: { planId: string; week: number }) => {
      const { data, error } = await supabase.functions.invoke("generate-grocery-list", {
        body: { planId, week },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.groceryList as GroceryList;
    },
    onSuccess: (data) => {
      setGroceryList(data);
      toast({ title: "Grocery list generated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error generating list", description: error.message, variant: "destructive" });
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => (currentWeek - 1) * 7 + i + 1);

  const getMealsForDay = (dayNumber: number) => {
    if (!meals) return [];
    return meals
      .filter((m) => m.day_number === dayNumber)
      .sort((a, b) => MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type));
  };

  const getDayTotals = (dayNumber: number) => {
    const dayMeals = getMealsForDay(dayNumber);
    return {
      calories: dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0),
      protein: dayMeals.reduce((sum, m) => sum + (Number(m.protein_grams) || 0), 0),
      carbs: dayMeals.reduce((sum, m) => sum + (Number(m.carbs_grams) || 0), 0),
      fat: dayMeals.reduce((sum, m) => sum + (Number(m.fat_grams) || 0), 0),
    };
  };

  const dayLabel = (dayNum: number) => {
    const dayOfWeek = (dayNum - 1) % 7;
    const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return names[dayOfWeek];
  };

  const startEditMeal = (meal: any) => {
    setEditingMealId(meal.id);
    setEditForm({
      meal_name: meal.meal_name,
      description: meal.description || "",
      ingredients: Array.isArray(meal.ingredients) ? meal.ingredients.join("\n") : "",
      calories: meal.calories?.toString() || "",
      protein_grams: meal.protein_grams?.toString() || "",
      carbs_grams: meal.carbs_grams?.toString() || "",
      fat_grams: meal.fat_grams?.toString() || "",
    });
  };

  const saveMealEdit = async () => {
    if (!editingMealId) return;
    const { error } = await supabase
      .from("nutrition_plan_meals")
      .update({
        meal_name: editForm.meal_name,
        description: editForm.description || null,
        ingredients: editForm.ingredients
          ? editForm.ingredients.split("\n").map((s) => s.trim()).filter(Boolean)
          : [],
        calories: editForm.calories ? parseInt(editForm.calories) : null,
        protein_grams: editForm.protein_grams ? parseFloat(editForm.protein_grams) : null,
        carbs_grams: editForm.carbs_grams ? parseFloat(editForm.carbs_grams) : null,
        fat_grams: editForm.fat_grams ? parseFloat(editForm.fat_grams) : null,
      })
      .eq("id", editingMealId);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Meal updated" });
    setEditingMealId(null);
    queryClient.invalidateQueries({ queryKey: ["my-plan-meals", activePlan?.id] });
  };

  const openSwap = async (meal: any) => {
    setSwapMeal(meal);
    setSwapSuggestion(null);
    setSwapLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-meal-swap", {
        body: { mealId: meal.id, planId: meal.plan_id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setSwapSuggestion(data.suggestion);
    } catch (err: any) {
      toast({ title: "Could not generate alternative", description: err.message, variant: "destructive" });
      setSwapMeal(null);
    } finally {
      setSwapLoading(false);
    }
  };

  const acceptSwap = async () => {
    if (!swapMeal || !swapSuggestion) return;
    const { error } = await supabase.from("nutrition_plan_meals").update({
      meal_name: swapSuggestion.meal_name,
      description: swapSuggestion.description,
      ingredients: swapSuggestion.ingredients,
      calories: swapSuggestion.calories,
      protein_grams: swapSuggestion.protein_grams,
      carbs_grams: swapSuggestion.carbs_grams,
      fat_grams: swapSuggestion.fat_grams,
    }).eq("id", swapMeal.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Meal swapped!", description: `Replaced with ${swapSuggestion.meal_name}` });
    queryClient.invalidateQueries({ queryKey: ["my-plan-meals", activePlan?.id] });
    setSwapMeal(null);
    setSwapSuggestion(null);
  };

  return (
    <>
      {/* Meal Swap Dialog */}
      <Dialog open={!!swapMeal} onOpenChange={(open) => { if (!open) { setSwapMeal(null); setSwapSuggestion(null); } }}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Meal Alternative</DialogTitle>
          </DialogHeader>
          {swapLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Finding an alternative meal…</p>
            </div>
          ) : swapSuggestion ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Replacing</p>
                <p className="font-medium text-sm line-through text-muted-foreground">{swapMeal?.meal_name}</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <p className="text-xs text-primary font-medium uppercase tracking-wider">Suggested Alternative</p>
                <p className="font-heading text-base">{swapSuggestion.meal_name}</p>
                {swapSuggestion.description && <p className="text-xs text-muted-foreground">{swapSuggestion.description}</p>}
                <div className="flex items-center gap-3 text-xs font-medium">
                  <span className="text-primary">{swapSuggestion.calories} cal</span>
                  <span>P: {swapSuggestion.protein_grams}g</span>
                  <span>C: {swapSuggestion.carbs_grams}g</span>
                  <span>F: {swapSuggestion.fat_grams}g</span>
                </div>
                {swapSuggestion.ingredients?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Ingredients:</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                      {swapSuggestion.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="apollo-outline" className="flex-1" onClick={() => openSwap(swapMeal)}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Try Another
                </Button>
                <Button variant="apollo" className="flex-1" onClick={acceptSwap}>
                  <Check className="w-4 h-4 mr-2" /> Use This Meal
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="font-heading text-3xl md:text-4xl mb-2">
              My <span className="text-apollo-gold">Nutrition Plan</span>
            </h1>
            <p className="text-muted-foreground">
              Your personalized meal plan created by Coach Marcos
            </p>
          </div>

          {!activePlan ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg mb-2">No Nutrition Plan Yet</h3>
                <p className="text-muted-foreground text-sm">
                  Your coach hasn't created a nutrition plan for you yet. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Plan selector */}
              {plans && plans.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {plans.map((p) => (
                    <Button
                      key={p.id}
                      variant={activePlan.id === p.id ? "apollo" : "apollo-outline"}
                      size="sm"
                      onClick={() => { setSelectedPlanId(p.id); setCurrentWeek(1); }}
                    >
                      {p.title}
                    </Button>
                  ))}
                </div>
              )}

              {/* Macro targets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Card className="bg-card border-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-heading text-apollo-gold">{activePlan.daily_calories}</p>
                    <p className="text-xs text-muted-foreground">Daily Cal</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-heading">{activePlan.protein_grams}g</p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-heading">{activePlan.carbs_grams}g</p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-heading">{activePlan.fat_grams}g</p>
                    <p className="text-xs text-muted-foreground">Fat</p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="meals" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="meals" className="gap-2">
                    <Utensils className="w-4 h-4" /> Meal Plan
                  </TabsTrigger>
                  <TabsTrigger value="grocery" className="gap-2">
                    <ShoppingCart className="w-4 h-4" /> Grocery List
                  </TabsTrigger>
                </TabsList>

                {/* MEAL PLAN TAB */}
                <TabsContent value="meals">
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <Button variant="ghost" size="sm" disabled={currentWeek <= 1} onClick={() => setCurrentWeek((w) => w - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="font-heading text-lg">Week {currentWeek}</span>
                    <Button variant="ghost" size="sm" disabled={currentWeek >= (activePlan.duration_weeks || 4)} onClick={() => setCurrentWeek((w) => w + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {weekDays.map((dayNum) => {
                    const dayMeals = getMealsForDay(dayNum);
                    const totals = getDayTotals(dayNum);
                    return (
                      <Card key={dayNum} className="bg-card border-border mb-4">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{dayLabel(dayNum)} — Day {dayNum}</CardTitle>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="font-normal">{totals.calories} kcal</Badge>
                              <span>P: {totals.protein}g</span>
                              <span>C: {totals.carbs}g</span>
                              <span>F: {totals.fat}g</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {dayMeals.length > 0 ? (
                            dayMeals.map((meal) => (
                              <div key={meal.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                {editingMealId === meal.id ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">{MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}</span>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={saveMealEdit}><Save className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => setEditingMealId(null)}><X className="w-4 h-4" /></Button>
                                      </div>
                                    </div>
                                    <Input value={editForm.meal_name} onChange={(e) => setEditForm({ ...editForm, meal_name: e.target.value })} placeholder="Meal name" />
                                    <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" rows={2} />
                                    <Textarea value={editForm.ingredients} onChange={(e) => setEditForm({ ...editForm, ingredients: e.target.value })} placeholder="Ingredients (one per line)" rows={3} />
                                    <div className="grid grid-cols-4 gap-2">
                                      <Input type="number" value={editForm.calories} onChange={(e) => setEditForm({ ...editForm, calories: e.target.value })} placeholder="Cal" />
                                      <Input type="number" value={editForm.protein_grams} onChange={(e) => setEditForm({ ...editForm, protein_grams: e.target.value })} placeholder="P" />
                                      <Input type="number" value={editForm.carbs_grams} onChange={(e) => setEditForm({ ...editForm, carbs_grams: e.target.value })} placeholder="C" />
                                      <Input type="number" value={editForm.fat_grams} onChange={(e) => setEditForm({ ...editForm, fat_grams: e.target.value })} placeholder="F" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <span className="text-xs text-muted-foreground">{MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}</span>
                                      <p className="font-medium text-sm">{meal.meal_name}</p>
                                      {meal.description && <p className="text-xs text-muted-foreground mt-1">{meal.description}</p>}
                                      {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                                        <div className="mt-2">
                                          <p className="text-xs text-muted-foreground font-medium">Ingredients:</p>
                                          <ul className="text-xs text-muted-foreground list-disc list-inside">
                                            {(meal.ingredients as string[]).map((ing, i) => <li key={i}>{ing}</li>)}
                                          </ul>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                        <span>{meal.calories} kcal</span>
                                        <span>P: {meal.protein_grams}g</span>
                                        <span>C: {meal.carbs_grams}g</span>
                                        <span>F: {meal.fat_grams}g</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openSwap(meal)}
                                        title="Swap this meal"
                                        className="text-muted-foreground hover:text-primary"
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => startEditMeal(meal)}>
                                        <Edit2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No meals for this day.</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>

                {/* GROCERY LIST TAB */}
                <TabsContent value="grocery">
                  <div className="space-y-4">
                    <Card className="bg-card border-border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" disabled={groceryWeek <= 1} onClick={() => setGroceryWeek((w) => w - 1)}>
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="font-heading text-sm">Week {groceryWeek}</span>
                            <Button variant="ghost" size="sm" disabled={groceryWeek >= (activePlan.duration_weeks || 4)} onClick={() => setGroceryWeek((w) => w + 1)}>
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                          <Button
                            variant="apollo"
                            size="sm"
                            onClick={() => groceryMutation.mutate({ planId: activePlan.id, week: groceryWeek })}
                            disabled={groceryMutation.isPending}
                          >
                            {groceryMutation.isPending ? (
                              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating...</>
                            ) : (
                              <><ShoppingCart className="w-4 h-4 mr-1.5" /> Generate List</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {groceryList && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <Card className="bg-card border-border">
                            <CardContent className="p-3 flex items-center gap-2">
                              <Store className="w-4 h-4 text-apollo-gold flex-shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">Store</p>
                                <p className="text-sm font-medium truncate">{groceryList.store}</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className={`border-border ${groceryList.budget_status === "over_budget" ? "bg-destructive/10 border-destructive/30" : "bg-card"}`}>
                            <CardContent className="p-3 flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-apollo-gold flex-shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">Est. Total</p>
                                <p className="text-sm font-medium">
                                  ${groceryList.estimated_total.toFixed(2)}
                                  <span className="text-xs text-muted-foreground ml-1">/ {groceryList.budget}</span>
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {groceryList.categories.map((cat) => (
                          <Card key={cat.name} className="bg-card border-border">
                            <CardHeader className="py-3 px-4 pb-2">
                              <CardTitle className="text-sm font-heading">{cat.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-3">
                              <div className="space-y-1.5">
                                {cat.items.map((item, i) => (
                                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm truncate">{item.name}</p>
                                      <p className="text-xs text-muted-foreground">{item.quantity}{item.note ? ` · ${item.note}` : ""}</p>
                                    </div>
                                    <span className="text-sm text-muted-foreground ml-2">${item.estimated_price.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {groceryList.savings_tips?.length > 0 && (
                          <Card className="bg-apollo-gold/5 border-apollo-gold/20">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-apollo-gold" />
                                <p className="font-heading text-sm">Money-Saving Tips</p>
                              </div>
                              <ul className="space-y-1">
                                {groceryList.savings_tips.map((tip, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                    <span className="text-apollo-gold mt-0.5">•</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}

                    {!groceryList && !groceryMutation.isPending && (
                      <Card className="bg-card border-border">
                        <CardContent className="py-12 text-center">
                          <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <h3 className="font-heading text-base mb-1">Generate Your Grocery List</h3>
                          <p className="text-muted-foreground text-xs max-w-xs mx-auto">
                            Select a week and tap "Generate List" to get a personalized shopping list based on your meals, budget, and preferred store.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
};

export default DashboardNutrition;
