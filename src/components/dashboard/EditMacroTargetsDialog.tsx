import { useEffect, useMemo, useState } from "react";
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
import { Loader2, Flame } from "lucide-react";
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

// Macro → calorie conversion (single source of truth).
//   Protein 4 cal/g · Carbs 4 cal/g · Fat 9 cal/g
export const caloriesFromMacros = (
  protein: number,
  carbs: number,
  fat: number
) => Math.round((protein || 0) * 4 + (carbs || 0) * 4 + (fat || 0) * 9);

type MacroKey = "protein" | "carbs" | "fat";

const MACRO_FIELDS: { key: MacroKey; label: string; placeholder: string }[] = [
  { key: "protein", label: "Protein (g)", placeholder: "e.g. 180" },
  { key: "carbs", label: "Carbs (g)", placeholder: "e.g. 250" },
  { key: "fat", label: "Fat (g)", placeholder: "e.g. 70" },
];

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
  // Strings, so the user can clear a field without it snapping to 0.
  const [values, setValues] = useState<Record<MacroKey, string>>({
    protein: String(initial.protein ?? 0),
    carbs: String(initial.carbs ?? 0),
    fat: String(initial.fat ?? 0),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues({
        protein: String(initial.protein ?? 0),
        carbs: String(initial.carbs ?? 0),
        fat: String(initial.fat ?? 0),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial.protein, initial.carbs, initial.fat]);

  const numeric = useMemo(
    () => ({
      protein: Math.max(0, Math.round(Number(values.protein) || 0)),
      carbs: Math.max(0, Math.round(Number(values.carbs) || 0)),
      fat: Math.max(0, Math.round(Number(values.fat) || 0)),
    }),
    [values]
  );

  // Live derived calories — recomputed on every keystroke.
  const derivedCalories = caloriesFromMacros(
    numeric.protein,
    numeric.carbs,
    numeric.fat
  );

  const handleChange = (k: MacroKey, raw: string) => {
    // Allow empty while typing, strip non-digits, prevent negatives.
    const cleaned = raw.replace(/[^\d]/g, "");
    setValues((cur) => ({ ...cur, [k]: cleaned }));
  };

  const hasEmpty =
    values.protein.trim() === "" ||
    values.carbs.trim() === "" ||
    values.fat.trim() === "";

  const handleSave = async () => {
    if (!user) return;

    // Validation: non-empty, non-negative (already enforced by handleChange).
    if (hasEmpty) {
      toast({
        title: "Fill in all macros",
        description: "Protein, carbs, and fat are all required.",
        variant: "destructive",
      });
      return;
    }

    if (derivedCalories < 800 || derivedCalories > 6000) {
      toast({
        title: "Calories out of range",
        description: `Derived calorie target (${derivedCalories}) must be between 800 and 6000. Adjust your macros.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("user_macro_targets")
        .upsert(
          {
            user_id: user.id,
            calorie_target: derivedCalories, // always derived, never user-entered
            protein_grams: numeric.protein,
            carb_grams: numeric.carbs,
            fat_grams: numeric.fat,
            source: "manual",
          },
          { onConflict: "user_id" }
        );
      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-macro-targets", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["macro-logs"] }),
      ]);

      toast({
        title: "Targets updated",
        description: `${derivedCalories} cal · ${numeric.protein}P / ${numeric.carbs}C / ${numeric.fat}F`,
      });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Couldn't save",
        description: e?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit your macros</DialogTitle>
          <DialogDescription>
            Calories are calculated automatically from protein, carbs, and fat
            (4 / 4 / 9 cal per gram).
          </DialogDescription>
        </DialogHeader>

        {/* Live calorie readout */}
        <div className="my-2 rounded-2xl border border-border/60 bg-foreground/[0.03] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-foreground/60 font-semibold">
              Daily calories
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-heading font-bold tabular-nums text-foreground">
              {derivedCalories}
            </span>
            <span className="text-xs text-foreground/50">cal</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 py-1">
          {MACRO_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label
                htmlFor={`mt-${f.key}`}
                className="text-xs uppercase tracking-wider text-foreground/60"
              >
                {f.label}
              </Label>
              <Input
                id={`mt-${f.key}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={values[f.key]}
                placeholder={f.placeholder}
                autoFocus={focusField === f.key}
                onChange={(e) => handleChange(f.key, e.target.value)}
                className="h-11 text-base font-semibold tabular-nums"
              />
            </div>
          ))}
        </div>

        <p className="text-[11px] text-foreground/50 leading-relaxed">
          {numeric.protein} × 4 + {numeric.carbs} × 4 + {numeric.fat} × 9 ={" "}
          <span className="text-foreground/80 font-semibold tabular-nums">
            {derivedCalories} cal
          </span>
        </p>

        <div className="flex justify-end gap-2 pt-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="apollo"
            onClick={handleSave}
            disabled={saving || hasEmpty}
            className="gap-2 min-w-28"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditMacroTargetsDialog;
