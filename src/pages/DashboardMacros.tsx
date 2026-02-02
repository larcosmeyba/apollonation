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

interface MacroEntry {
  id: string;
  meal_name: string;
  photo_url?: string;
  calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  ai_estimated: boolean;
}

const DashboardMacros = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<MacroEntry[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAiMode, setIsAiMode] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Manual entry form state
  const [manualEntry, setManualEntry] = useState({
    meal_name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const isElite = profile?.subscription_tier === "elite";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleAiAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);

    // Simulate AI analysis (in production, this would call an edge function)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const newEntry: MacroEntry = {
      id: Date.now().toString(),
      meal_name: "AI Analyzed Meal",
      photo_url: previewUrl || undefined,
      calories: Math.floor(Math.random() * 400) + 200,
      protein_grams: Math.floor(Math.random() * 30) + 15,
      carbs_grams: Math.floor(Math.random() * 50) + 20,
      fat_grams: Math.floor(Math.random() * 20) + 5,
      ai_estimated: true,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setIsAnalyzing(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsDialogOpen(false);

    toast({
      title: "Meal analyzed!",
      description: "AI has estimated the macros for your meal.",
    });
  };

  const handleManualSubmit = () => {
    if (!manualEntry.meal_name || !manualEntry.calories) {
      toast({
        title: "Missing information",
        description: "Please enter at least meal name and calories.",
        variant: "destructive",
      });
      return;
    }

    const newEntry: MacroEntry = {
      id: Date.now().toString(),
      meal_name: manualEntry.meal_name,
      calories: parseInt(manualEntry.calories) || 0,
      protein_grams: parseInt(manualEntry.protein) || 0,
      carbs_grams: parseInt(manualEntry.carbs) || 0,
      fat_grams: parseInt(manualEntry.fat) || 0,
      ai_estimated: false,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setManualEntry({ meal_name: "", calories: "", protein: "", carbs: "", fat: "" });
    setIsDialogOpen(false);

    toast({
      title: "Meal logged!",
      description: "Your meal has been added to today's log.",
    });
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const totals = entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein: acc.protein + entry.protein_grams,
      carbs: acc.carbs + entry.carbs_grams,
      fat: acc.fat + entry.fat_grams,
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
          <Button variant="apollo" size="lg">
            Upgrade to Elite
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl mb-2">
              Macro <span className="text-apollo-gold">Tracker</span>
            </h1>
            <p className="text-muted-foreground">
              Track your daily nutrition with AI-powered photo analysis
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="apollo" size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Log Meal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-background border-border">
              <DialogHeader>
                <DialogTitle className="font-heading text-xl">
                  Log a Meal
                </DialogTitle>
              </DialogHeader>

              {/* Mode toggle */}
              <div className="flex gap-2 mb-6">
                <Button
                  variant={isAiMode ? "apollo" : "apollo-outline"}
                  size="sm"
                  onClick={() => setIsAiMode(true)}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Photo
                </Button>
                <Button
                  variant={!isAiMode ? "apollo" : "apollo-outline"}
                  size="sm"
                  onClick={() => setIsAiMode(false)}
                  className="flex-1"
                >
                  Manual Entry
                </Button>
              </div>

              {isAiMode ? (
                <div className="space-y-4">
                  {previewUrl ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden">
                      <img
                        src={previewUrl}
                        alt="Food preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-apollo-gold/50 transition-colors">
                      <Upload className="w-10 h-10 text-muted-foreground mb-3" />
                      <span className="text-muted-foreground text-sm">
                        Click to upload or drag a photo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}

                  <Button
                    variant="apollo"
                    className="w-full"
                    disabled={!selectedFile || isAnalyzing}
                    onClick={handleAiAnalyze}
                  >
                    {isAnalyzing ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze with AI
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Meal Name</Label>
                    <Input
                      placeholder="e.g., Chicken Salad"
                      value={manualEntry.meal_name}
                      onChange={(e) =>
                        setManualEntry((prev) => ({ ...prev, meal_name: e.target.value }))
                      }
                      className="bg-muted border-border"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Calories</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={manualEntry.calories}
                        onChange={(e) =>
                          setManualEntry((prev) => ({ ...prev, calories: e.target.value }))
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                    <div>
                      <Label>Protein (g)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={manualEntry.protein}
                        onChange={(e) =>
                          setManualEntry((prev) => ({ ...prev, protein: e.target.value }))
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                    <div>
                      <Label>Carbs (g)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={manualEntry.carbs}
                        onChange={(e) =>
                          setManualEntry((prev) => ({ ...prev, carbs: e.target.value }))
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                    <div>
                      <Label>Fat (g)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={manualEntry.fat}
                        onChange={(e) =>
                          setManualEntry((prev) => ({ ...prev, fat: e.target.value }))
                        }
                        className="bg-muted border-border"
                      />
                    </div>
                  </div>
                  <Button variant="apollo" className="w-full" onClick={handleManualSubmit}>
                    Add Meal
                  </Button>
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

        {/* Entries list */}
        <h2 className="font-heading text-xl mb-4">Today's Meals</h2>
        {entries.length === 0 ? (
          <div className="card-apollo p-8 text-center">
            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No meals logged today. Click "Log Meal" to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="card-apollo p-4 flex items-center gap-4"
              >
                {entry.photo_url && (
                  <img
                    src={entry.photo_url}
                    alt={entry.meal_name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{entry.meal_name}</h3>
                    {entry.ai_estimated && (
                      <span className="flex items-center gap-1 text-xs text-apollo-gold">
                        <Sparkles className="w-3 h-3" />
                        AI
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
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
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
