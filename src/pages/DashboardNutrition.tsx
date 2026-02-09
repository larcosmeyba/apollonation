import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Utensils, ArrowLeft, ChevronLeft, ChevronRight, Edit2, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
  snack: "🍎 Snack",
};

const DashboardNutrition = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
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
            {/* Plan selector if multiple */}
            {plans && plans.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {plans.map((p) => (
                  <Button
                    key={p.id}
                    variant={activePlan.id === p.id ? "apollo" : "apollo-outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedPlanId(p.id);
                      setCurrentWeek(1);
                    }}
                  >
                    {p.title}
                  </Button>
                ))}
              </div>
            )}

            {/* Macro targets */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-heading text-apollo-gold">{activePlan.daily_calories}</p>
                  <p className="text-xs text-muted-foreground">Daily Calories</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-heading">{activePlan.protein_grams}g</p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-heading">{activePlan.carbs_grams}g</p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-heading">{activePlan.fat_grams}g</p>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </CardContent>
              </Card>
            </div>

            {/* Week navigation */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentWeek <= 1}
                onClick={() => setCurrentWeek((w) => w - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-heading text-lg">Week {currentWeek}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentWeek >= (activePlan.duration_weeks || 4)}
                onClick={() => setCurrentWeek((w) => w + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Days */}
            {weekDays.map((dayNum) => {
              const dayMeals = getMealsForDay(dayNum);
              const totals = getDayTotals(dayNum);

              return (
                <Card key={dayNum} className="bg-card border-border mb-4">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {dayLabel(dayNum)} — Day {dayNum}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="font-normal">
                          {totals.calories} kcal
                        </Badge>
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
                                <span className="text-sm font-medium">
                                  {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
                                </span>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={saveMealEdit}>
                                    <Save className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setEditingMealId(null)}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              <Input
                                value={editForm.meal_name}
                                onChange={(e) => setEditForm({ ...editForm, meal_name: e.target.value })}
                                placeholder="Meal name"
                              />
                              <Textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                placeholder="Description"
                                rows={2}
                              />
                              <Textarea
                                value={editForm.ingredients}
                                onChange={(e) => setEditForm({ ...editForm, ingredients: e.target.value })}
                                placeholder="Ingredients (one per line)"
                                rows={3}
                              />
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
                                <span className="text-xs text-muted-foreground">
                                  {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
                                </span>
                                <p className="font-medium text-sm">{meal.meal_name}</p>
                                {meal.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{meal.description}</p>
                                )}
                                {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground font-medium">Ingredients:</p>
                                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                                      {(meal.ingredients as string[]).map((ing, i) => (
                                        <li key={i}>{ing}</li>
                                      ))}
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditMeal(meal)}
                                className="ml-2"
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardNutrition;
