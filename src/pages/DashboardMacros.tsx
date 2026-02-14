import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, Plus, Trash2, Upload, Sparkles } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const DashboardMacros = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAiMode, setIsAiMode] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [manualEntry, setManualEntry] = useState({
    meal_name: "", calories: "", protein: "", carbs: "", fat: "",
  });

  const isElite = profile?.subscription_tier === "elite";

  // Fetch macro logs from DB - persisted!
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

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Please select an image under 5MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please select an image file", variant: "destructive" });
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

  const saveEntry = async (entry: {
    meal_name: string; calories: number; protein_grams: number;
    carbs_grams: number; fat_grams: number; ai_estimated: boolean; photo_url?: string;
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
      toast({ title: "Meal analyzed!", description: `AI identified: ${n.meal_name} (${n.confidence} confidence)` });
    } catch (error) {
      toast({ title: "Analysis failed", description: error instanceof Error ? error.message : "Could not analyze the image.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualEntry.meal_name || !manualEntry.calories) {
      toast({ title: "Missing information", description: "Please enter at least meal name and calories.", variant: "destructive" });
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

  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + (entry.calories || 0),
      protein: acc.protein + (entry.protein_grams || 0),
      carbs: acc.carbs + (entry.carbs_grams || 0),
      fat: acc.fat + (entry.fat_grams || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  if (!isElite) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-20 h-20 rounded-full bg-apollo-gold/10 flex items-center justify-center mx-auto mb-6">
            <Camera className="w-10 h-10 text-apollo-gold" />
          </div>
          <h1 className="font-heading text-3xl mb-4">
            AI Macro <span className="text-apollo-gold">Tracker</span>
          </h1>
          <p className="text-muted-foreground mb-8">
            Snap a photo of your meal and let AI estimate your macros instantly. This feature is exclusive to Elite members.
          </p>
          <Button variant="apollo" size="lg">Upgrade to Elite</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl mb-2">
              Macro <span className="text-apollo-gold">Tracker</span>
            </h1>
            <p className="text-muted-foreground">Track your daily nutrition — data is saved automatically</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="apollo" size="lg">
                <Plus className="w-4 h-4 mr-2" /> Log Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-background border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">Log a Meal</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mb-6">
                <Button variant={isAiMode ? "apollo" : "apollo-outline"} size="sm" onClick={() => setIsAiMode(true)} className="flex-1">
                  <Sparkles className="w-4 h-4 mr-2" /> AI Photo
                </Button>
                <Button variant={!isAiMode ? "apollo" : "apollo-outline"} size="sm" onClick={() => setIsAiMode(false)} className="flex-1">
                  Manual Entry
                </Button>
              </div>
              {isAiMode ? (
                <div className="space-y-4">
                  {previewUrl ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden">
                      <img src={previewUrl} alt="Food preview" className="w-full h-full object-cover" />
                      <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-apollo-gold/50 transition-colors">
                      <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                      <span className="text-muted-foreground text-sm">Click to upload or drag a photo</span>
                      <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    </label>
                  )}
                  <Button variant="apollo" className="w-full" disabled={!selectedFile || isAnalyzing} onClick={handleAiAnalyze}>
                    {isAnalyzing ? (<><Sparkles className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>) : (<><Sparkles className="w-4 h-4 mr-2" />Analyze with AI</>)}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div><Label>Meal Name</Label><Input placeholder="e.g., Chicken Salad" value={manualEntry.meal_name} onChange={(e) => setManualEntry(p => ({ ...p, meal_name: e.target.value }))} className="bg-muted border-border" /></div>
                  <div className="grid grid-cols-2 gap-4">
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
        </div>

        {/* Daily totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-apollo p-4 text-center">
            <p className="text-3xl font-heading text-apollo-gold">{totals.calories}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Calories</p>
          </div>
          <div className="card-apollo p-4 text-center">
            <p className="text-3xl font-heading">{totals.protein}g</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Protein</p>
          </div>
          <div className="card-apollo p-4 text-center">
            <p className="text-3xl font-heading">{totals.carbs}g</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Carbs</p>
          </div>
          <div className="card-apollo p-4 text-center">
            <p className="text-3xl font-heading">{totals.fat}g</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Fat</p>
          </div>
        </div>

        <h2 className="font-heading text-xl mb-4">Today's Meals</h2>
        {entries.length === 0 ? (
          <div className="card-apollo p-8 text-center">
            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No meals logged today. Click "Log Meal" to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="card-apollo p-4 flex items-center gap-4">
                {entry.photo_url && (
                  <img src={entry.photo_url} alt={entry.meal_name || ""} className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{entry.meal_name}</h3>
                    {entry.ai_estimated && (
                      <span className="flex items-center gap-1 text-xs text-apollo-gold">
                        <Sparkles className="w-3 h-3" /> AI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{entry.calories} cal</span>
                    <span>P: {entry.protein_grams}g</span>
                    <span>C: {entry.carbs_grams}g</span>
                    <span>F: {entry.fat_grams}g</span>
                  </div>
                </div>
                <button onClick={() => removeEntry(entry.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardMacros;
