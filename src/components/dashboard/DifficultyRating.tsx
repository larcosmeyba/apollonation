import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  value: number | null;
  onChange: (v: number) => void;
  onSave: () => void;
  saving?: boolean;
}

const labelFor = (v: number) => {
  if (v <= 3) return { text: "Too easy — push harder next time", icon: TrendingUp, color: "text-green-500" };
  if (v <= 6) return { text: "Just right", icon: Minus, color: "text-primary" };
  if (v <= 8) return { text: "Challenging — solid effort", icon: Minus, color: "text-amber-400" };
  return { text: "Brutal — recover well", icon: TrendingDown, color: "text-destructive" };
};

const DifficultyRating = ({ value, onChange, onSave, saving }: Props) => {
  const v = value ?? 5;
  const { text, icon: Icon, color } = labelFor(v);

  return (
    <div className="mx-4 p-4 rounded-xl border border-border bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">How tough was that?</span>
        <span className="text-2xl font-heading text-primary">{v}/10</span>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[v]}
        onValueChange={(arr) => onChange(arr[0])}
      />
      <div className={`flex items-center gap-1.5 text-xs ${color}`}>
        <Icon className="w-3 h-3" />
        <span>{text}</span>
      </div>
      <Button variant="apollo" className="w-full" onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : "Save Rating"}
      </Button>
    </div>
  );
};

export default DifficultyRating;
