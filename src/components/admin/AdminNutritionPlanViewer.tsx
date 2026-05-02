import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronLeft, ChevronRight, Edit2, Save, X } from "lucide-react";

interface PlanViewerProps {
  planId: string;
  onBack: () => void;
  isAdmin?: boolean;
}

interface Meal {
  id: string;
  plan_id: string;
  day_number: number;
  meal_type: string;
  meal_name: string;
  description: string | null;
  ingredients: any;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  sort_order: number;
}

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
  snack: "🍎 Snack",
};

const AdminNutritionPlanViewer = ({ planId, onBack, isAdmin }: PlanViewerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const { data: plan } = useQuery({
    queryKey: ["nutrition-plan", planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_plans")
        .select("*")
        .eq("id", planId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: meals } = useQuery({
    queryKey: ["nutrition-plan-meals", planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_plan_meals")
        .select("*")
        .eq("plan_id", planId)
        .order("day_number")
        .order("sort_order");
      if (error) throw error;
      return data as Meal[];
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
    const dayOfWeek = ((dayNum - 1) % 7);
    const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return names[dayOfWeek];
  };

  const startEditMeal = (meal: Meal) => {
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
    queryClient.invalidateQueries({ queryKey: ["nutrition-plan-meals", planId] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="font-heading text-xl">{plan?.title || "Meal Plan"}</h2>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{plan?.daily_calories} kcal/day</span>
              <span>P: {plan?.protein_grams}g</span>
              <span>C: {plan?.carbs_grams}g</span>
              <span>F: {plan?.fat_grams}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-4">
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
          disabled={currentWeek >= (plan?.duration_weeks || 4)}
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
          <Card key={dayNum} className="bg-card border-border">
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
                          placeholder="Description / instructions"
                          rows={2}
                        />
                        <Textarea
                          value={editForm.ingredients}
                          onChange={(e) => setEditForm({ ...editForm, ingredients: e.target.value })}
                          placeholder="Ingredients (one per line)"
                          rows={3}
                        />
                        <div className="grid grid-cols-4 gap-2">
                          <Input
                            type="number"
                            value={editForm.calories}
                            onChange={(e) => setEditForm({ ...editForm, calories: e.target.value })}
                            placeholder="Cal"
                          />
                          <Input
                            type="number"
                            value={editForm.protein_grams}
                            onChange={(e) => setEditForm({ ...editForm, protein_grams: e.target.value })}
                            placeholder="Protein"
                          />
                          <Input
                            type="number"
                            value={editForm.carbs_grams}
                            onChange={(e) => setEditForm({ ...editForm, carbs_grams: e.target.value })}
                            placeholder="Carbs"
                          />
                          <Input
                            type="number"
                            value={editForm.fat_grams}
                            onChange={(e) => setEditForm({ ...editForm, fat_grams: e.target.value })}
                            placeholder="Fat"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">
                              {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
                            </span>
                          </div>
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
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditMeal(meal)}
                            className="ml-2"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
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
    </div>
  );
};

export default AdminNutritionPlanViewer;
