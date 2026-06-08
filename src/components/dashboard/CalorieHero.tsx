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
  calories: "hsl(0 0% 100%)",
  protein: "hsl(210 100% 60%)",
  carbs: "hsl(35 95% 55%)",
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
          opacity={0.25}
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

interface MiniRingProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const MiniRing = ({ label, consumed, target, color, icon, onClick }: MiniRingProps) => {
  const remaining = Math.max(0, Math.round(target - consumed));
  const complete = target > 0 && consumed >= target;
  const content = (
    <>
      <div className="text-[10px] text-foreground/60 uppercase tracking-wider font-semibold">
        {label}
      </div>
      <Ring consumed={consumed} target={target} size={70} stroke={6} color={color}>
        {complete ? (
          <Check className="w-5 h-5" style={{ color: COLORS.done }} strokeWidth={3} />
        ) : (
          <div className="flex flex-col items-center leading-none">
            <span className="text-sm font-bold text-foreground">{remaining}g</span>
            <span className="text-[8px] text-foreground/50 mt-0.5">left</span>
          </div>
        )}
      </Ring>
      <div className="flex items-center gap-1 text-[9px] text-foreground/50">
        <span style={{ color }}>{icon}</span>
        <span>{Math.round(consumed)}/{Math.round(target)}</span>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Edit ${label} target`}
        className="flex flex-col items-center gap-1.5 rounded-2xl p-2 -m-2 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        {content}
      </button>
    );
  }
  return <div className="flex flex-col items-center gap-1.5">{content}</div>;
};

export const CalorieHero = ({ calories, protein, carbs, fat, onEdit }: CalorieHeroProps) => {
  const remaining = Math.max(0, Math.round(calories.target - calories.consumed));
  const complete =
    calories.target > 0 && calories.consumed >= calories.target;

  const bigRing = (
    <Ring
      consumed={calories.consumed}
      target={calories.target}
      size={180}
      stroke={12}
      color={COLORS.calories}
    >
      {complete ? (
        <div className="flex flex-col items-center">
          <Check className="w-12 h-12" style={{ color: COLORS.done }} strokeWidth={3} />
          <span className="text-[10px] text-foreground/60 uppercase tracking-wider mt-1">
            Goal hit
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center leading-none">
          <span className="text-[10px] text-foreground/50 uppercase tracking-wider mb-1">
            Calories left
          </span>
          <span className="text-5xl font-heading font-bold text-foreground tabular-nums">
            {remaining}
          </span>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-foreground/50">
            <Flame className="w-3 h-3" />
            <span>{Math.round(calories.consumed)} of {Math.round(calories.target)} cal</span>
          </div>
        </div>
      )}
    </Ring>
  );

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {onEdit ? (
        <button
          type="button"
          onClick={() => onEdit("calories")}
          aria-label="Edit calorie target"
          className="relative rounded-full transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {bigRing}
          <span className="absolute -top-1 right-2 flex items-center gap-1 text-[9px] uppercase tracking-widest text-foreground/50">
            <Pencil className="w-2.5 h-2.5" /> Edit
          </span>
        </button>
      ) : (
        bigRing
      )}

      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        <MiniRing
          label="Protein"
          consumed={protein.consumed}
          target={protein.target}
          color={COLORS.protein}
          icon={<Drumstick className="w-2.5 h-2.5" />}
          onClick={onEdit ? () => onEdit("protein") : undefined}
        />
        <MiniRing
          label="Carbs"
          consumed={carbs.consumed}
          target={carbs.target}
          color={COLORS.carbs}
          icon={<Wheat className="w-2.5 h-2.5" />}
          onClick={onEdit ? () => onEdit("carbs") : undefined}
        />
        <MiniRing
          label="Fat"
          consumed={fat.consumed}
          target={fat.target}
          color={COLORS.fat}
          icon={<Droplet className="w-2.5 h-2.5" />}
          onClick={onEdit ? () => onEdit("fat") : undefined}
        />
      </div>
      {onEdit && (
        <p className="text-[10px] text-foreground/40 uppercase tracking-[0.25em]">
          Tap any ring to edit target
        </p>
      )}
    </div>
  );
};

export default CalorieHero;
