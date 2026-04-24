import { useState } from "react";
import { Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const DashboardNutritionCard = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const selectedDate = format(new Date(), "yyyy-MM-dd");
  const isElite = profile?.is_subscribed === true;

  const [manualEntry, setManualEntry] = useState({
    meal_name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  // Fetch today's macro logs
  const { data: entries = [] } = useQuery({
    queryKey: ["macro-logs", user?.id, selectedDate],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("macro_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", selectedDate)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch nutrition plan for daily targets
  const { data: nutritionPlan } = useQuery({
    queryKey: ["nutrition-plan-targets", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("nutrition_plans")
        .select("daily_calories, protein_grams, carbs_grams, fat_grams")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const targets = {
    calories: nutritionPlan?.daily_calories || 2500,
    protein: nutritionPlan?.protein_grams || 180,
    carbs: nutritionPlan?.carbs_grams || 300,
    fat: nutritionPlan?.fat_grams || 70,
  };

  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + (entry.calories || 0),
      protein: acc.protein + (entry.protein_grams || 0),
      carbs: acc.carbs + (entry.carbs_grams || 0),
      fat: acc.fat + (entry.fat_grams || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const remaining = {
    calories: Math.max(0, targets.calories - totals.calories),
    protein: Math.max(0, targets.protein - totals.protein),
    carbs: Math.max(0, targets.carbs - totals.carbs),
    fat: Math.max(0, targets.fat - totals.fat),
  };

  const dailyPercent = Math.min(
    Math.round((totals.calories / targets.calories) * 100),
    100
  );

  const saveEntry = async (entry: {
    meal_name: string;
    calories: number;
    protein_grams: number;
    carbs_grams: number;
    fat_grams: number;
    ai_estimated: boolean;
  }) => {
    if (!user) return;
    const { error } = await supabase.from("macro_logs").insert({
      user_id: user.id,
      log_date: selectedDate,
      ...entry,
    });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["macro-logs"] });
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const handleAiAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const imageBase64 = await fileToBase64(selectedFile);
      const { data, error } = await supabase.functions.invoke("analyze-food", { body: { imageBase64 } });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      const n = data.data;
      await saveEntry({
        meal_name: n.meal_name || "Analyzed Meal",
        calories: Math.round(n.calories) || 0,
        protein_grams: Math.round(n.protein_grams) || 0,
        carbs_grams: Math.round(n.carbs_grams) || 0,
        fat_grams: Math.round(n.fat_grams) || 0,
        ai_estimated: true,
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsDialogOpen(false);
      toast({ title: "Meal analyzed!", description: `AI identified: ${n.meal_name}` });
    } catch (err) {
      toast({ title: "Analysis failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
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
      setIsDialogOpen(false);
      toast({ title: "Meal logged!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const removeEntry = async (id: string) => {
    await supabase.from("macro_logs").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["macro-logs"] });
  };

  // Progress bar helper
  const MacroBar = ({ current, target, color }: { current: number; target: number; color: string }) => (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min((current / target) * 100, 100)}%` }}
      />
    </div>
  );

  return (
    <div className="card-apollo p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-heading text-sm">Fuel</h2>
      </div>

      <div className="flex items-center gap-3 mb-2">
        {/* Remaining calories */}
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Remaining</p>
          <p className="text-xl font-heading">
            {remaining.calories}
            <span className="text-xs text-muted-foreground font-normal ml-1">Cal left</span>
          </p>
          {/* Macro bars */}
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-blue-400 w-3">P</span>
              <MacroBar current={totals.protein} target={targets.protein} color="bg-blue-400" />
              <span className="text-[10px] text-muted-foreground w-14 text-right">{remaining.protein}g left</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-amber-400 w-3">C</span>
              <MacroBar current={totals.carbs} target={targets.carbs} color="bg-amber-400" />
              <span className="text-[10px] text-muted-foreground w-14 text-right">{remaining.carbs}g left</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-rose-400 w-3">F</span>
              <MacroBar current={totals.fat} target={targets.fat} color="bg-rose-400" />
              <span className="text-[10px] text-muted-foreground w-14 text-right">{remaining.fat}g left</span>
            </div>
          </div>
        </div>
        {/* Circular percentage */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeDasharray={`${dailyPercent}, 100`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-heading">{dailyPercent}%</span>
            <span className="text-[8px] text-muted-foreground">daily</span>
          </div>
        </div>
      </div>

      {/* Log Meal Button - available to all tiers */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="apollo-outline" className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Log meal
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Log a Meal</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button
              variant={!isAiMode ? "apollo" : "apollo-outline"}
              size="sm"
              onClick={() => setIsAiMode(false)}
              className="flex-1"
            >
              Manual
            </Button>
            {isElite && (
              <Button
                variant={isAiMode ? "apollo" : "apollo-outline"}
                size="sm"
                onClick={() => setIsAiMode(true)}
                className="flex-1"
              >
                <Sparkles className="w-4 h-4 mr-1" /> AI Photo
              </Button>
            )}
          </div>
          {isAiMode && isElite ? (
            <div className="space-y-4">
              {previewUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <img src={previewUrl} alt="Food" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/50 flex items-center justify-center"
                  >
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
              <div>
                <Label>Meal Name</Label>
                <Input placeholder="e.g., Chicken Salad" value={manualEntry.meal_name} onChange={(e) => setManualEntry((p) => ({ ...p, meal_name: e.target.value }))} className="bg-muted border-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Calories</Label><Input type="number" placeholder="0" value={manualEntry.calories} onChange={(e) => setManualEntry((p) => ({ ...p, calories: e.target.value }))} className="bg-muted border-border" /></div>
                <div><Label>Protein (g)</Label><Input type="number" placeholder="0" value={manualEntry.protein} onChange={(e) => setManualEntry((p) => ({ ...p, protein: e.target.value }))} className="bg-muted border-border" /></div>
                <div><Label>Carbs (g)</Label><Input type="number" placeholder="0" value={manualEntry.carbs} onChange={(e) => setManualEntry((p) => ({ ...p, carbs: e.target.value }))} className="bg-muted border-border" /></div>
                <div><Label>Fat (g)</Label><Input type="number" placeholder="0" value={manualEntry.fat} onChange={(e) => setManualEntry((p) => ({ ...p, fat: e.target.value }))} className="bg-muted border-border" /></div>
              </div>
              <Button variant="apollo" className="w-full" onClick={handleManualSubmit}>Add Meal</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Today's logged meals */}
      {entries.length > 0 && (
        <div className="mt-4 space-y-2">
          {entries.slice(0, 3).map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{entry.meal_name}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.calories} cal · P:{entry.protein_grams} C:{entry.carbs_grams} F:{entry.fat_grams}
                </p>
              </div>
              <button onClick={() => removeEntry(entry.id)} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {entries.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">+{entries.length - 3} more</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardNutritionCard;
