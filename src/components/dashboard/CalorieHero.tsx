import { Check, Flame, Drumstick, Wheat, Droplet, Pencil } from "lucide-react";

interface MacroData {
  consumed: number;
  target: number;
}

export type MacroField = "calories" | "protein" | "carbs" | "fat";

interface CalorieHeroProps {
  calories: MacroData;
  protein: MacroData;
  carbs: MacroData;
  fat: MacroData;
  onEdit?: (field: MacroField) => void;
}

const COLORS = {
  calories: "hsl(var(--primary))",
  protein: "hsl(210 100% 60%)",
  carbs: "hsl(var(--primary))",
  fat: "hsl(340 80% 62%)",
  done: "hsl(142 71% 45%)",
};

interface RingProps {
  consumed: number;
  target: number;
  size: number;
  stroke: number;
  color: string;
  children: React.ReactNode;
}

const Ring = ({ consumed, target, size, stroke, color, children }: RingProps) => {
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const safeTarget = Math.max(target, 1);
  const pct = Math.min(consumed / safeTarget, 1);
  const complete = target > 0 && consumed >= target;
  const ringColor = complete ? COLORS.done : color;
  const offset = c - pct * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          opacity={0.3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1), stroke 0.3s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};

interface MacroBarProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const MacroBar = ({ label, consumed, target, color, icon, onClick }: MacroBarProps) => {
  const remaining = Math.max(0, Math.round(target - consumed));
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const complete = target > 0 && consumed >= target;

  const inner = (
    <>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-foreground/60 font-semibold">
        <span style={{ color }} className="flex items-center">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        {complete ? (
          <Check className="w-5 h-5" style={{ color: COLORS.done }} strokeWidth={3} />
        ) : (
          <span className="text-2xl font-heading font-bold text-foreground tabular-nums leading-none">
            {remaining}g
          </span>
        )}
        {!complete && <span className="text-[10px] text-foreground/50">left</span>}
      </div>
      <div className="mt-2.5 h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: complete ? COLORS.done : color,
          }}
        />
      </div>
      <div className="mt-1.5 text-[10px] text-foreground/50 tabular-nums">
        {Math.round(consumed)} / {Math.round(target)}g
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Edit ${label} target`}
        className="flex flex-col items-start text-left rounded-xl p-1 -m-1 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        {inner}
      </button>
    );
  }
  return <div className="flex flex-col items-start">{inner}</div>;
};

export const CalorieHero = ({ calories, protein, carbs, fat, onEdit }: CalorieHeroProps) => {
  const remaining = Math.max(0, Math.round(calories.target - calories.consumed));
  const complete = calories.target > 0 && calories.consumed >= calories.target;

  const bigRing = (
    <Ring
      consumed={calories.consumed}
      target={calories.target}
      size={220}
      stroke={14}
      color={COLORS.calories}
    >
      {complete ? (
        <div className="flex flex-col items-center">
          <Check className="w-14 h-14" style={{ color: COLORS.done }} strokeWidth={3} />
          <span className="text-[10px] text-foreground/60 uppercase tracking-wider mt-1">
            Goal hit
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center leading-none">
          <span className="text-[10px] text-foreground/55 uppercase tracking-[0.22em] mb-2 font-semibold">
            Calories left
          </span>
          <span className="text-6xl font-heading font-bold text-foreground tabular-nums">
            {remaining}
          </span>
          <div className="flex items-center gap-1 mt-3 text-[11px] text-foreground/55">
            <Flame className="w-3 h-3" style={{ color: COLORS.calories }} />
            <span className="tabular-nums">of {Math.round(calories.target)} cal</span>
          </div>
        </div>
      )}
    </Ring>
  );

  return (
    <div className="flex flex-col items-center gap-6 py-2">
      {onEdit ? (
        <button
          type="button"
          onClick={() => onEdit("calories")}
          aria-label="Edit calorie target"
          className="relative rounded-full transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {bigRing}
          <span className="absolute top-1 right-1 flex items-center gap-1 text-[9px] uppercase tracking-widest text-foreground/40">
            <Pencil className="w-2.5 h-2.5" /> Edit
          </span>
        </button>
      ) : (
        bigRing
      )}

      <div className="grid grid-cols-3 gap-4 w-full">
        <MacroBar
          label="Protein"
          consumed={protein.consumed}
          target={protein.target}
          color={COLORS.protein}
          icon={<Drumstick className="w-3 h-3" />}
          onClick={onEdit ? () => onEdit("protein") : undefined}
        />
        <MacroBar
          label="Carbs"
          consumed={carbs.consumed}
          target={carbs.target}
          color={COLORS.carbs}
          icon={<Wheat className="w-3 h-3" />}
          onClick={onEdit ? () => onEdit("carbs") : undefined}
        />
        <MacroBar
          label="Fat"
          consumed={fat.consumed}
          target={fat.target}
          color={COLORS.fat}
          icon={<Droplet className="w-3 h-3" />}
          onClick={onEdit ? () => onEdit("fat") : undefined}
        />
      </div>
    </div>
  );
};

export default CalorieHero;
