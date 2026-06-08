import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { MacroField } from "@/components/dashboard/CalorieHero";

interface Targets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Targets;
  focusField?: MacroField;
  onSaved?: () => void;
}

const FIELD_LABEL: Record<MacroField, string> = {
  calories: "Calories",
  protein: "Protein (g)",
  carbs: "Carbs (g)",
  fat: "Fat (g)",
};

export const EditMacroTargetsDialog = ({
  open,
  onOpenChange,
  initial,
  focusField,
  onSaved,
}: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Targets>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValues(initial);
  }, [open, initial.calories, initial.protein, initial.carbs, initial.fat]);

  const handleChange = (k: keyof Targets, v: string) => {
    const n = Math.max(0, Math.round(Number(v) || 0));
    setValues((cur) => ({ ...cur, [k]: n }));
  };

  const handleSave = async () => {
    if (!user) return;
    if (values.calories < 800 || values.calories > 6000) {
      toast({ title: "Calories out of range", description: "Pick a value between 800 and 6000.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("user_macro_targets")
        .upsert(
          {
            user_id: user.id,
            calorie_target: values.calories,
            protein_grams: values.protein,
            carb_grams: values.carbs,
            fat_grams: values.fat,
            source: "manual",
          },
          { onConflict: "user_id" }
        );
      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-macro-targets", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["macro-logs"] }),
      ]);

      toast({ title: "Targets updated", description: "Your macro goals have been saved." });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const fields: MacroField[] = ["calories", "protein", "carbs", "fat"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit your targets</DialogTitle>
          <DialogDescription>
            Tap a value, type a new one, and save. These become your new daily macro goals.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          {fields.map((f) => {
            const key = (f === "calories" ? "calories" : f) as keyof Targets;
            return (
              <div key={f} className="space-y-1.5">
                <Label htmlFor={`mt-${f}`} className="text-xs uppercase tracking-wider text-foreground/60">
                  {FIELD_LABEL[f]}
                </Label>
                <Input
                  id={`mt-${f}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={values[key]}
                  autoFocus={focusField === f}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="h-11 text-base font-semibold tabular-nums"
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="apollo" onClick={handleSave} disabled={saving} className="gap-2 min-w-28">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditMacroTargetsDialog;
