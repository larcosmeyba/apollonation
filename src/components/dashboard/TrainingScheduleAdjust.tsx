import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Settings2, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const TRAINING_METHODS = [
  { id: "dumbbells", label: "Dumbbells" },
  { id: "bodyweight", label: "Bodyweight" },
  { id: "mini_bands", label: "Mini Bands" },
  { id: "full_gym", label: "Full Gym Access" },
];

const TrainingScheduleAdjust = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const [methods, setMethods] = useState<string[]>([]);
  const [applyScope, setApplyScope] = useState<"today" | "program">("program");

  const { data: questionnaire } = useQuery({
    queryKey: ["adjust-questionnaire", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("client_questionnaires")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const openDialog = () => {
    if (questionnaire) {
      setDaysPerWeek(String(questionnaire.workout_days_per_week || 3));
      setMethods(questionnaire.training_methods || []);
    }
    setOpen(true);
  };

  const toggleMethod = (method: string) => {
    setMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  const handleApply = async () => {
    if (!user || !questionnaire) return;
    setRegenerating(true);
    try {
      // Update questionnaire
      await (supabase as any)
        .from("client_questionnaires")
        .update({
          workout_days_per_week: parseInt(daysPerWeek),
          training_methods: methods,
        })
        .eq("id", questionnaire.id);

      if (applyScope === "program") {
        // Deactivate old training plans
        await (supabase as any)
          .from("client_training_plans")
          .update({ status: "archived" })
          .eq("user_id", user.id)
          .eq("status", "active");

        // Fire-and-forget regeneration
        supabase.functions
          .invoke("auto-generate-programs", {
            body: { questionnaireId: questionnaire.id },
          })
          .then((res) => {
            if (res.error) console.error("Regenerate error:", res.error);
            else {
              queryClient.invalidateQueries({ queryKey: ["my-training-plan-full"] });
              queryClient.invalidateQueries({ queryKey: ["adjust-questionnaire"] });
            }
          });

        toast({
          title: "Regenerating your program! 🔄",
          description: "Your new training plan is being built. This may take a minute.",
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["adjust-questionnaire"] });
        toast({ title: "Settings saved for today ✓" });
      }
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  if (!questionnaire) return null;

  const methodLabels = (questionnaire.training_methods || [])
    .map((m: string) => TRAINING_METHODS.find((t) => t.id === m)?.label || m)
    .join(", ");

  return (
    <>
      <button
        onClick={openDialog}
        className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-foreground/20 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Settings2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-heading tracking-wide">Adjust Training Plan</p>
            <p className="text-xs text-muted-foreground">
              {questionnaire.workout_days_per_week} days/week · {methodLabels || "Not set"}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Update Training Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Workouts Per Week
              </Label>
              <Select value={daysPerWeek} onValueChange={setDaysPerWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Training Type
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {TRAINING_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-sm transition-colors ${
                      methods.includes(m.id)
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <Checkbox
                      checked={methods.includes(m.id)}
                      onCheckedChange={() => toggleMethod(m.id)}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Apply Changes
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setApplyScope("today")}
                  className={`p-3 rounded-lg border text-sm text-center transition-colors ${
                    applyScope === "today"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Today Only
                </button>
                <button
                  onClick={() => setApplyScope("program")}
                  className={`p-3 rounded-lg border text-sm text-center transition-colors ${
                    applyScope === "program"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  Entire Program
                </button>
              </div>
            </div>

            <Button
              variant="apollo"
              className="w-full"
              onClick={handleApply}
              disabled={regenerating || methods.length === 0}
            >
              {regenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...
                </>
              ) : (
                "Apply Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrainingScheduleAdjust;
