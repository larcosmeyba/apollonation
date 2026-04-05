import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Utensils, ChevronLeft, ChevronRight, Edit2, Save, X, ShoppingCart,
  Loader2, Lightbulb, DollarSign, Store, RefreshCw, Check, Sparkles,
  ClipboardList, AlertCircle, Plus, Trash2, Upload, Clock, Pencil,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { getMealImage } from "@/utils/mealImages";
import FuelCalendar from "@/components/dashboard/FuelCalendar";

const MEAL_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
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

const calculateMacros = (age: number, sex: string, heightInches: number, weightLbs: number, activityLevel: string, goal: string) => {
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;
  // Mifflin-St Jeor
  let bmr = sex === "female"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const multipliers: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  let tdee = bmr * (multipliers[activityLevel] || 1.55);
  if (goal === "lose_fat") tdee -= 500;
  else if (goal === "gain_weight" || goal === "gain_muscle") tdee += 350;
  const calories = Math.round(tdee);
  const protein = Math.round(weightLbs * (goal === "gain_muscle" ? 1.0 : 0.8));
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  return { calories, protein, carbs, fat };
};

const DashboardNutrition = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null);
  const [groceryWeek, setGroceryWeek] = useState(1);
  const [swapMeal, setSwapMeal] = useState<any | null>(null);
  const [swapSuggestions, setSwapSuggestions] = useState<MealSuggestion[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editForm, setEditForm] = useState({
    meal_name: "", description: "", ingredients: "",
    calories: "", protein_grams: "", carbs_grams: "", fat_grams: "",
  });
  const [manualEntry, setManualEntry] = useState({
    meal_name: "", calories: "", protein: "", carbs: "", fat: "",
  });
  const [macroCalc, setMacroCalc] = useState({
    height_ft: "", height_in: "", weight: "", sex: "male", age: "", activity_level: "moderate", goal: "maintain",
  });
  const [calculatedMacros, setCalculatedMacros] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  const [macroEditing, setMacroEditing] = useState(false);
  const [macroSaving, setMacroSaving] = useState(false);

  const selectedDate = format(new Date(), "yyyy-MM-dd");
  const isElite = profile?.subscription_tier === "elite";

  // ── Queries ──
  const { data: plans } = useQuery({
    queryKey: ["my-nutrition-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("nutrition_plans").select("*").eq("user_id", user?.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: hasQuestionnaire } = useQuery({
    queryKey: ["has-questionnaire", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { count } = await supabase.from("client_questionnaires").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_active", true);
      return (count ?? 0) > 0;
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
      const { data, error } = await supabase.from("nutrition_plan_meals").select("*").eq("plan_id", activePlan.id).order("day_number").order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!activePlan,
  });

  // Macro logs for today
  const { data: macroEntries = [] } = useQuery({
    queryKey: ["macro-logs", user?.id, selectedDate],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("macro_logs").select("*").eq("user_id", user.id).eq("log_date", selectedDate).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Recipes
  const { data: recipes = [] } = useQuery({
    queryKey: ["all-recipes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recipes").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  // ── Nutrition Profile (macro calculator saved data) ──
  const { data: nutritionProfile } = useQuery({
    queryKey: ["nutrition-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("client_nutrition_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Load saved profile into calculator
  const profileLoaded = !!nutritionProfile;
  if (nutritionProfile && !macroEditing && calculatedMacros === null && profileLoaded) {
    const totalInches = nutritionProfile.height_inches || 0;
    const ft = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    setMacroCalc({
      height_ft: ft.toString(),
      height_in: inches.toString(),
      weight: nutritionProfile.weight_lbs?.toString() || "",
      sex: (nutritionProfile.dietary_preferences?.[0] === "female" ? "female" : "male"),
      age: nutritionProfile.age?.toString() || "",
      activity_level: nutritionProfile.activity_level || "moderate",
      goal: nutritionProfile.goals || "maintain",
    });
    // Recalculate
    const calcMacros = calculateMacros(
      nutritionProfile.age || 25,
      nutritionProfile.dietary_preferences?.[0] === "female" ? "female" : "male",
      nutritionProfile.height_inches || 68,
      Number(nutritionProfile.weight_lbs) || 150,
      nutritionProfile.activity_level || "moderate",
      nutritionProfile.goals || "maintain"
    );
    setCalculatedMacros(calcMacros);
  }

  // ── Derived state ──
  const targets = {
    calories: activePlan?.daily_calories || 2500,
    protein: activePlan?.protein_grams || 180,
    carbs: activePlan?.carbs_grams || 300,
    fat: activePlan?.fat_grams || 70,
  };

  const loggedTotals = macroEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein_grams || 0),
      carbs: acc.carbs + (e.carbs_grams || 0),
      fat: acc.fat + (e.fat_grams || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const remaining = {
    calories: Math.max(0, targets.calories - loggedTotals.calories),
    protein: Math.max(0, targets.protein - loggedTotals.protein),
    carbs: Math.max(0, targets.carbs - loggedTotals.carbs),
    fat: Math.max(0, targets.fat - loggedTotals.fat),
  };

  const dailyPercent = Math.min(Math.round((loggedTotals.calories / targets.calories) * 100), 100);

  // ── Meal logging helpers ──
  const saveEntry = async (entry: { meal_name: string; calories: number; protein_grams: number; carbs_grams: number; fat_grams: number; ai_estimated: boolean; notes?: string }, logDate?: string) => {
    if (!user) return;
    const { error } = await supabase.from("macro_logs").insert({ user_id: user.id, log_date: logDate || selectedDate, ...entry });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["macro-logs"] });
  };

  const removeEntry = async (id: string) => {
    await supabase.from("macro_logs").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["macro-logs"] });
  };

  const handleManualSubmit = async () => {
    if (!manualEntry.meal_name || !manualEntry.calories) {
      toast({ title: "Missing info", description: "Enter meal name & calories", variant: "destructive" });
      return;
    }
    try {
      await saveEntry({
        meal_name: manualEntry.meal_name,
        calories: parseInt(manualEntry.calories) || 0,
        protein_grams: parseInt(manualEntry.protein) || 0,
        carbs_grams: parseInt(manualEntry.carbs) || 0,
        fat_grams: parseInt(manualEntry.fat) || 0,
        ai_estimated: false,
      });
      setManualEntry({ meal_name: "", calories: "", protein: "", carbs: "", fat: "" });
      setIsLogDialogOpen(false);
      toast({ title: "Meal logged!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Max 5MB", variant: "destructive" }); return; }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAiAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const imageBase64 = await fileToBase64(selectedFile);
      const { data, error } = await supabase.functions.invoke("analyze-food", { body: { imageBase64 } });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      const n = data.data;
      await saveEntry({ meal_name: n.meal_name || "Analyzed Meal", calories: Math.round(n.calories) || 0, protein_grams: Math.round(n.protein_grams) || 0, carbs_grams: Math.round(n.carbs_grams) || 0, fat_grams: Math.round(n.fat_grams) || 0, ai_estimated: true });
      setSelectedFile(null); setPreviewUrl(null); setIsLogDialogOpen(false);
      toast({ title: "Meal analyzed!", description: `AI identified: ${n.meal_name}` });
    } catch (err) {
      toast({ title: "Analysis failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally { setIsAnalyzing(false); }
  };

  // ── Meal plan helpers ──
  const weekDays = Array.from({ length: 7 }, (_, i) => (currentWeek - 1) * 7 + i + 1);
  const getMealsForDay = (dayNumber: number) => meals?.filter((m) => m.day_number === dayNumber).sort((a, b) => MEAL_TYPE_ORDER.indexOf(a.meal_type) - MEAL_TYPE_ORDER.indexOf(b.meal_type)) || [];
  const getDayTotals = (dayNumber: number) => {
    const dm = getMealsForDay(dayNumber);
    return { calories: dm.reduce((s, m) => s + (m.calories || 0), 0), protein: dm.reduce((s, m) => s + (Number(m.protein_grams) || 0), 0), carbs: dm.reduce((s, m) => s + (Number(m.carbs_grams) || 0), 0), fat: dm.reduce((s, m) => s + (Number(m.fat_grams) || 0), 0) };
  };
  const dayLabel = (d: number) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(d - 1) % 7];

  const startEditMeal = (meal: any) => {
    setEditingMealId(meal.id);
    setEditForm({ meal_name: meal.meal_name, description: meal.description || "", ingredients: Array.isArray(meal.ingredients) ? meal.ingredients.join("\n") : "", calories: meal.calories?.toString() || "", protein_grams: meal.protein_grams?.toString() || "", carbs_grams: meal.carbs_grams?.toString() || "", fat_grams: meal.fat_grams?.toString() || "" });
  };

  const saveMealEdit = async () => {
    if (!editingMealId) return;
    const { error } = await supabase.from("nutrition_plan_meals").update({ meal_name: editForm.meal_name, description: editForm.description || null, ingredients: editForm.ingredients ? editForm.ingredients.split("\n").map(s => s.trim()).filter(Boolean) : [], calories: editForm.calories ? parseInt(editForm.calories) : null, protein_grams: editForm.protein_grams ? parseFloat(editForm.protein_grams) : null, carbs_grams: editForm.carbs_grams ? parseFloat(editForm.carbs_grams) : null, fat_grams: editForm.fat_grams ? parseFloat(editForm.fat_grams) : null }).eq("id", editingMealId);
    if (error) { toast({ title: "Error saving", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Meal updated" });
    setEditingMealId(null);
    queryClient.invalidateQueries({ queryKey: ["my-plan-meals", activePlan?.id] });
  };

  const groceryMutation = useMutation({
    mutationFn: async ({ planId, week }: { planId: string; week: number }) => {
      const { data, error } = await supabase.functions.invoke("generate-grocery-list", { body: { planId, week } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.groceryList as GroceryList;
    },
    onSuccess: (data) => { setGroceryList(data); toast({ title: "Grocery list generated!" }); },
    onError: (error: Error) => { toast({ title: "Error generating list", description: error.message, variant: "destructive" }); },
  });

  const openSwap = async (meal: any) => {
    setSwapMeal(meal); setSwapSuggestions([]); setSwapLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-meal-swap", { body: { mealId: meal.id, planId: meal.plan_id } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setSwapSuggestions(data.suggestions || []);
    } catch (err: any) { toast({ title: "Could not generate alternatives", description: err.message, variant: "destructive" }); setSwapMeal(null); }
    finally { setSwapLoading(false); }
  };

  const acceptSwap = async (suggestion: MealSuggestion) => {
    if (!swapMeal) return;
    const { error } = await supabase.from("nutrition_plan_meals").update({ meal_name: suggestion.meal_name, description: suggestion.description, ingredients: suggestion.ingredients, calories: suggestion.calories, protein_grams: suggestion.protein_grams, carbs_grams: suggestion.carbs_grams, fat_grams: suggestion.fat_grams }).eq("id", swapMeal.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Meal swapped!", description: `Replaced with ${suggestion.meal_name}` });
    queryClient.invalidateQueries({ queryKey: ["my-plan-meals", activePlan?.id] });
    setSwapMeal(null); setSwapSuggestions([]);
  };

  const regenerateWeek = async () => {
    if (!activePlan || regenerating) return;
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("client-regenerate-meal-plan", { body: { planId: activePlan.id, week: currentWeek } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "Meal plan refreshed!", description: `Week ${currentWeek} has been regenerated.` });
      queryClient.invalidateQueries({ queryKey: ["my-plan-meals", activePlan.id] });
    } catch (err: any) { toast({ title: "Could not regenerate", description: err.message, variant: "destructive" }); }
    finally { setRegenerating(false); }
  };

  const MacroRing = ({ current, target, color, label }: { current: number; target: number; color: string; label: string }) => {
    const pct = Math.min(Math.round((current / target) * 100), 100);
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative w-14 h-14">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth="3.5" strokeDasharray={`${pct}, 100`} strokeLinecap="round" className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-foreground">{current}g</span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
        <span className="text-[9px] text-muted-foreground">{target - current > 0 ? `${target - current}g left` : "Done"}</span>
      </div>
    );
  };

  const MacroBar = ({ current, target, color }: { current: number; target: number; color: string }) => (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min((current / target) * 100, 100)}%` }} />
    </div>
  );

  return (
    <>
      {/* Meal Swap Dialog */}
      <Dialog open={!!swapMeal} onOpenChange={(open) => { if (!open) { setSwapMeal(null); setSwapSuggestions([]); } }}>
        <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading text-xl">Choose an Alternative</DialogTitle></DialogHeader>
          {swapLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Finding alternatives…</p>
            </div>
          ) : swapSuggestions.length > 0 ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Replacing</p>
                <p className="font-medium text-sm line-through text-muted-foreground">{swapMeal?.meal_name}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>{swapMeal?.calories} cal</span>
                  <span>P: {swapMeal?.protein_grams}g</span>
                  <span>C: {swapMeal?.carbs_grams}g</span>
                  <span>F: {swapMeal?.fat_grams}g</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Pick one of these macro-matched alternatives:</p>

              <div className="space-y-2">
                {swapSuggestions.map((suggestion, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-muted/20 border border-border/50 hover:border-primary/40 transition-all cursor-pointer group" onClick={() => acceptSwap(suggestion)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="font-heading text-sm">{suggestion.meal_name}</p>
                        {suggestion.description && <p className="text-xs text-muted-foreground">{suggestion.description}</p>}
                        <div className="flex items-center gap-3 text-[10px] font-medium">
                          <span className="text-primary">{suggestion.calories} cal</span>
                          <span className="text-muted-foreground">P: {suggestion.protein_grams}g</span>
                          <span className="text-muted-foreground">C: {suggestion.carbs_grams}g</span>
                          <span className="text-muted-foreground">F: {suggestion.fat_grams}g</span>
                        </div>
                        {suggestion.ingredients?.length > 0 && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {suggestion.ingredients.slice(0, 4).join(" · ")}{suggestion.ingredients.length > 4 ? ` +${suggestion.ingredients.length - 4} more` : ""}
                          </p>
                        )}
                      </div>
                      <Button variant="apollo" size="sm" className="flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity h-8 text-xs gap-1">
                        <Check className="w-3 h-3" /> Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="apollo-outline" size="sm" className="w-full gap-2" onClick={() => openSwap(swapMeal)} disabled={swapLoading}>
                <RefreshCw className="w-3.5 h-3.5" /> Generate More Options
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Log Meal Dialog */}
      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader><DialogTitle className="font-heading text-xl">Log a Meal</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button variant={!isAiMode ? "apollo" : "apollo-outline"} size="sm" onClick={() => setIsAiMode(false)} className="flex-1">Manual</Button>
            {isElite && (
              <Button variant={isAiMode ? "apollo" : "apollo-outline"} size="sm" onClick={() => setIsAiMode(true)} className="flex-1">
                <Sparkles className="w-4 h-4 mr-1" /> AI Photo
              </Button>
            )}
          </div>
          {isAiMode && isElite ? (
            <div className="space-y-4">
              {previewUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <img src={previewUrl} alt="Food" className="w-full h-full object-cover" />
                  <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/50 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-muted-foreground text-sm">Upload food photo</span>
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                </label>
              )}
              <Button variant="apollo" className="w-full" disabled={!selectedFile || isAnalyzing} onClick={handleAiAnalyze}>
                {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div><Label>Meal Name</Label><Input placeholder="e.g., Chicken Salad" value={manualEntry.meal_name} onChange={(e) => setManualEntry(p => ({ ...p, meal_name: e.target.value }))} className="bg-muted border-border" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Calories</Label><Input type="number" placeholder="0" value={manualEntry.calories} onChange={(e) => setManualEntry(p => ({ ...p, calories: e.target.value }))} className="bg-muted border-border" /></div>
                <div><Label>Protein (g)</Label><Input type="number" placeholder="0" value={manualEntry.protein} onChange={(e) => setManualEntry(p => ({ ...p, protein: e.target.value }))} className="bg-muted border-border" /></div>
                <div><Label>Carbs (g)</Label><Input type="number" placeholder="0" value={manualEntry.carbs} onChange={(e) => setManualEntry(p => ({ ...p, carbs: e.target.value }))} className="bg-muted border-border" /></div>
                <div><Label>Fat (g)</Label><Input type="number" placeholder="0" value={manualEntry.fat} onChange={(e) => setManualEntry(p => ({ ...p, fat: e.target.value }))} className="bg-muted border-border" /></div>
              </div>
              <Button variant="apollo" className="w-full" onClick={handleManualSubmit}>Add Meal</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="font-heading text-2xl md:text-3xl tracking-wide mb-1">Fuel</h1>
            <p className="text-sm text-muted-foreground">Your Apollo nutrition system — macro tracking & meal planning</p>
          </div>

          {/* ── Nutrition Summary Card ── */}
          <div className="bg-white rounded-2xl p-5 border border-border shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg tracking-wide text-black">Today's Nutrition</h2>
              <button onClick={() => setIsLogDialogOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-black text-white text-sm font-bold hover:bg-black/80 transition-colors">
                <Plus className="w-3.5 h-3.5 text-white" /> Log Meal
              </button>
            </div>

            {/* Calorie hero + macro rings */}
            <div className="flex items-center gap-6">
              {/* Big calorie ring - GREEN */}
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray={`${dailyPercent}, 100`} strokeLinecap="round" className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-heading text-black">{remaining.calories}</span>
                  <span className="text-[9px] text-black/60">cal left</span>
                </div>
              </div>

              {/* Macro rings */}
              <div className="flex flex-1 justify-around">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="relative w-14 h-14">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(217, 91%, 67%)" strokeWidth="3.5" strokeDasharray={`${Math.min(Math.round((loggedTotals.protein / targets.protein) * 100), 100)}, 100`} strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-semibold text-black">{loggedTotals.protein}g</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-black/70 font-medium">Protein</span>
                  <span className="text-[9px] text-black/50">{remaining.protein > 0 ? `${remaining.protein}g left` : "Done"}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="relative w-14 h-14">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(40, 95%, 64%)" strokeWidth="3.5" strokeDasharray={`${Math.min(Math.round((loggedTotals.carbs / targets.carbs) * 100), 100)}, 100`} strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-semibold text-black">{loggedTotals.carbs}g</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-black/70 font-medium">Carbs</span>
                  <span className="text-[9px] text-black/50">{remaining.carbs > 0 ? `${remaining.carbs}g left` : "Done"}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="relative w-14 h-14">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(350, 80%, 65%)" strokeWidth="3.5" strokeDasharray={`${Math.min(Math.round((loggedTotals.fat / targets.fat) * 100), 100)}, 100`} strokeLinecap="round" className="transition-all duration-700" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-semibold text-black">{loggedTotals.fat}g</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-black/70 font-medium">Fat</span>
                  <span className="text-[9px] text-black/50">{remaining.fat > 0 ? `${remaining.fat}g left` : "Done"}</span>
                </div>
              </div>
            </div>

            {/* Logged meals today */}
            {macroEntries.length > 0 && (
              <div className="mt-5 pt-5 border-t border-black/10 space-y-2">
                <p className="text-[10px] text-black/50 uppercase tracking-wider font-semibold mb-2">Logged Today</p>
                {macroEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-black/5 border border-black/10">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-black truncate">{entry.meal_name}</p>
                      <p className="text-[10px] text-black/60">
                        {entry.calories} cal · P:{entry.protein_grams}g · C:{entry.carbs_grams}g · F:{entry.fat_grams}g
                      </p>
                    </div>
                    <button onClick={() => removeEntry(entry.id)} className="p-1.5 text-black/40 hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {macroEntries.length > 5 && <p className="text-[10px] text-black/50 text-center">+{macroEntries.length - 5} more</p>}
              </div>
            )}
          </div>

          {/* ── Recipe Strip ── */}
          {recipes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg tracking-wide">Recipes</h2>
                <Link to="/dashboard/recipes" className="text-xs text-white hover:text-white/80 transition-colors font-bold">
                  View All →
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {recipes.map((recipe) => (
                  <Link
                    key={recipe.id}
                    to="/dashboard/recipes"
                    className="flex-shrink-0 w-40 rounded-2xl border border-black/10 bg-white overflow-hidden hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all"
                  >
                    {recipe.thumbnail_url ? (
                      <div className="aspect-square overflow-hidden">
                        <img src={recipe.thumbnail_url} alt={recipe.title} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <Utensils className="w-6 h-6 text-black/20" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs font-semibold text-black line-clamp-2 leading-tight">{recipe.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-black/60">
                        {recipe.calories_per_serving && <span>{recipe.calories_per_serving} cal</span>}
                        {recipe.prep_time_minutes && (
                          <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{recipe.prep_time_minutes}m</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Meal Plan Section ── */}
          {!activePlan ? (
            <div className="card-apollo py-12 text-center">
              {!hasQuestionnaire ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="font-heading text-lg text-foreground mb-2">Complete Your Profile First</h3>
                  <p className="text-muted-foreground text-sm mb-1">Complete your questionnaire to receive a personalized meal plan.</p>
                  <p className="text-[10px] text-muted-foreground mb-6">Your meals will automatically refresh every week once set up.</p>
                  <Link to="/questionnaire"><Button variant="apollo" className="gap-2 rounded-full"><ClipboardList className="w-4 h-4" /> Complete Questionnaire</Button></Link>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                    <Utensils className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="font-heading text-lg text-foreground mb-2">Plan Being Prepared</h3>
                  <p className="text-muted-foreground text-sm mb-1">Your nutrition plan is being set up. Check back soon!</p>
                  <p className="text-[10px] text-muted-foreground">Once ready, meals refresh automatically every Monday.</p>
                </>
              )}
            </div>
          ) : (
            <>
              {plans && plans.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {plans.map((p) => (
                    <Button key={p.id} variant={activePlan.id === p.id ? "apollo" : "apollo-outline"} size="sm" onClick={() => { setSelectedPlanId(p.id); setCurrentWeek(1); }}>
                      {p.title}
                    </Button>
                  ))}
                </div>
              )}

              {/* Weekly refresh banner - blue accent */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-xs text-white flex-1">Meals refresh every Monday. Want something different? Hit regenerate.</p>
              </div>

              <Tabs defaultValue="meals" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 bg-white border border-black/10">
                  <TabsTrigger value="meals" className="gap-2 text-xs text-black data-[state=active]:bg-black data-[state=active]:text-white"><Utensils className="w-3.5 h-3.5" /> Meal Plan</TabsTrigger>
                  <TabsTrigger value="grocery" className="gap-2 text-xs text-black data-[state=active]:bg-black data-[state=active]:text-white"><ShoppingCart className="w-3.5 h-3.5" /> Grocery List</TabsTrigger>
                </TabsList>

                <TabsContent value="meals">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" disabled={currentWeek <= 1} onClick={() => setCurrentWeek(w => w - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                      <span className="font-heading text-base text-white">Week {currentWeek}</span>
                      <Button variant="ghost" size="sm" disabled={currentWeek >= (activePlan.duration_weeks || 4)} onClick={() => setCurrentWeek(w => w + 1)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                    <Button variant="apollo-outline" size="sm" onClick={regenerateWeek} disabled={regenerating} className="gap-1.5 text-xs">
                      {regenerating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Regenerating</> : <><RefreshCw className="w-3.5 h-3.5" /> New Meals</>}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {weekDays.map((dayNum) => {
                      const dayMeals = getMealsForDay(dayNum);
                      const totals = getDayTotals(dayNum);
                      return (
                        <div key={dayNum} className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
                            <div className="flex items-center gap-2">
                              <span className="font-heading text-sm text-black">{dayLabel(dayNum)}</span>
                              <span className="text-[10px] text-black/50">Day {dayNum}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-black/60">
                              <Badge variant="outline" className="font-normal text-[10px] py-0 border-black/20 text-black">{totals.calories} cal</Badge>
                              <span>P{totals.protein}g</span>
                              <span>C{totals.carbs}g</span>
                              <span>F{totals.fat}g</span>
                            </div>
                          </div>

                          <div className="divide-y divide-black/5">
                            {dayMeals.length > 0 ? dayMeals.map((meal) => {
                              const isEaten = macroEntries.some(e => e.notes === `meal:${meal.id}`);
                              return (
                              <div key={meal.id} className={`px-4 py-3 ${isEaten ? "bg-green-50" : ""}`}>
                                {editingMealId === meal.id ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-medium text-black/50">{MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}</span>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" onClick={saveMealEdit} className="h-7 w-7 p-0 text-black"><Save className="w-3.5 h-3.5" /></Button>
                                        <Button variant="ghost" size="sm" onClick={() => setEditingMealId(null)} className="h-7 w-7 p-0 text-black"><X className="w-3.5 h-3.5" /></Button>
                                      </div>
                                    </div>
                                    <Input value={editForm.meal_name} onChange={(e) => setEditForm({ ...editForm, meal_name: e.target.value })} placeholder="Meal name" className="h-8 text-sm" />
                                    <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" rows={2} className="text-sm" />
                                    <Textarea value={editForm.ingredients} onChange={(e) => setEditForm({ ...editForm, ingredients: e.target.value })} placeholder="Ingredients (one per line)" rows={3} className="text-sm" />
                                    <div className="grid grid-cols-4 gap-2">
                                      <Input type="number" value={editForm.calories} onChange={(e) => setEditForm({ ...editForm, calories: e.target.value })} placeholder="Cal" className="h-8 text-xs" />
                                      <Input type="number" value={editForm.protein_grams} onChange={(e) => setEditForm({ ...editForm, protein_grams: e.target.value })} placeholder="P" className="h-8 text-xs" />
                                      <Input type="number" value={editForm.carbs_grams} onChange={(e) => setEditForm({ ...editForm, carbs_grams: e.target.value })} placeholder="C" className="h-8 text-xs" />
                                      <Input type="number" value={editForm.fat_grams} onChange={(e) => setEditForm({ ...editForm, fat_grams: e.target.value })} placeholder="F" className="h-8 text-xs" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-3">
                                    {/* Mark as Eaten Checkbox - green when checked */}
                                    <div className="flex-shrink-0 pt-1">
                                      <Checkbox
                                        checked={isEaten}
                                        onCheckedChange={async (checked) => {
                                          if (checked) {
                                            await saveEntry({
                                              meal_name: meal.meal_name,
                                              calories: meal.calories || 0,
                                              protein_grams: Number(meal.protein_grams) || 0,
                                              carbs_grams: Number(meal.carbs_grams) || 0,
                                              fat_grams: Number(meal.fat_grams) || 0,
                                              ai_estimated: false,
                                            });
                                            const { data: latest } = await supabase
                                              .from("macro_logs")
                                              .select("id")
                                              .eq("user_id", user!.id)
                                              .eq("log_date", selectedDate)
                                              .eq("meal_name", meal.meal_name)
                                              .order("created_at", { ascending: false })
                                              .limit(1);
                                            if (latest?.[0]) {
                                              await supabase.from("macro_logs").update({ notes: `meal:${meal.id}` }).eq("id", latest[0].id);
                                              queryClient.invalidateQueries({ queryKey: ["macro-logs"] });
                                            }
                                          } else {
                                            const entry = macroEntries.find(e => e.notes === `meal:${meal.id}`);
                                            if (entry) {
                                              await removeEntry(entry.id);
                                            }
                                          }
                                        }}
                                        className={`${isEaten ? "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" : "border-black/30"}`}
                                      />
                                    </div>
                                    {/* Food Photo */}
                                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                      <img
                                        src={getMealImage(meal.meal_name, meal.meal_type)}
                                        alt={meal.meal_name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] text-black/50 uppercase tracking-wider mb-0.5">{MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}</p>
                                      <p className={`font-medium text-sm text-black ${isEaten ? "line-through text-green-600" : ""}`}>{meal.meal_name}</p>
                                      {meal.description && <p className="text-xs text-black/60 mt-0.5 line-clamp-2">{meal.description}</p>}
                                      {Array.isArray(meal.ingredients) && meal.ingredients.length > 0 && (
                                        <ul className="mt-1.5 text-[10px] text-black/50 list-disc list-inside space-y-0">
                                          {(meal.ingredients as string[]).slice(0, 4).map((ing, i) => <li key={i}>{ing}</li>)}
                                          {(meal.ingredients as string[]).length > 4 && <li>+{(meal.ingredients as string[]).length - 4} more</li>}
                                        </ul>
                                      )}
                                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-black/60">
                                        <span>{meal.calories} cal</span>
                                        <span>P: {meal.protein_grams}g</span>
                                        <span>C: {meal.carbs_grams}g</span>
                                        <span>F: {meal.fat_grams}g</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button variant="ghost" size="sm" onClick={() => openSwap(meal)} className="text-[10px] h-7 px-2 gap-1 text-black/50 hover:text-black">
                                        <RefreshCw className="w-3 h-3" /> Change
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => startEditMeal(meal)} className="text-[10px] h-7 px-2 gap-1 text-black/50 hover:text-black">
                                        <Edit2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );}) : (
                              <p className="px-4 py-6 text-center text-sm text-black/40">No meals for this day.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="grocery">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white border border-black/10">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" disabled={groceryWeek <= 1} onClick={() => setGroceryWeek(w => w - 1)} className="text-black"><ChevronLeft className="w-4 h-4" /></Button>
                        <span className="font-heading text-sm text-black">Week {groceryWeek}</span>
                        <Button variant="ghost" size="sm" disabled={groceryWeek >= (activePlan.duration_weeks || 4)} onClick={() => setGroceryWeek(w => w + 1)} className="text-black"><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                      <Button variant="apollo" size="sm" onClick={() => groceryMutation.mutate({ planId: activePlan.id, week: groceryWeek })} disabled={groceryMutation.isPending} className="text-xs gap-1.5">
                        {groceryMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating</> : <><ShoppingCart className="w-3.5 h-3.5" /> Generate</>}
                      </Button>
                    </div>

                    {groceryList && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white border border-black/10 rounded-lg p-3 flex items-center gap-2">
                            <Store className="w-4 h-4 text-black/50 flex-shrink-0" />
                            <div><p className="text-[10px] text-black/50">Store</p><p className="text-sm font-medium text-black truncate">{groceryList.store}</p></div>
                          </div>
                          <div className={`rounded-lg border p-3 flex items-center gap-2 ${groceryList.budget_status === "over_budget" ? "bg-red-50 border-red-200" : "bg-white border-black/10"}`}>
                            <DollarSign className="w-4 h-4 text-black/50 flex-shrink-0" />
                            <div><p className="text-[10px] text-black/50">Est. Total</p><p className="text-sm font-medium text-black">${groceryList.estimated_total.toFixed(2)}<span className="text-[10px] text-black/50 ml-1">/ {groceryList.budget}</span></p></div>
                          </div>
                        </div>

                        {groceryList.categories.map((cat) => (
                          <div key={cat.name} className="rounded-xl border border-black/10 bg-white overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-black/10"><h4 className="font-heading text-sm text-black">{cat.name}</h4></div>
                            <div className="divide-y divide-black/5">
                              {cat.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-black truncate">{item.name}</p>
                                    <p className="text-[10px] text-black/50">{item.quantity}{item.note ? ` · ${item.note}` : ""}</p>
                                  </div>
                                  <span className="text-sm text-black/60 ml-2">${item.estimated_price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {groceryList.savings_tips?.length > 0 && (
                          <div className="rounded-lg bg-accent/10 border border-accent/20 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb className="w-4 h-4 text-foreground" />
                              <p className="font-heading text-sm">Money-Saving Tips</p>
                            </div>
                            <ul className="space-y-1">
                              {groceryList.savings_tips.map((tip, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="text-foreground mt-0.5">•</span>{tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}

                    {!groceryList && !groceryMutation.isPending && (
                      <div className="card-apollo py-12 text-center">
                        <ShoppingCart className="w-8 h-8 text-accent/30 mx-auto mb-3" />
                        <h3 className="font-heading text-base text-foreground mb-1">Generate Your Grocery List</h3>
                        <p className="text-muted-foreground text-xs max-w-xs mx-auto">Select a week and generate a shopping list based on your meals, budget, and store.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* ── Fuel Calendar — Tracking & Streaks ── */}
          <FuelCalendar />
        </div>
      </DashboardLayout>
    </>
  );
};

export default DashboardNutrition;
