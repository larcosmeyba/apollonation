import { useEffect, useState, useMemo } from "react";
import { Check, Flame, Pencil, Clock, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export type MacroField = "calories" | "protein" | "carbs" | "fat";

interface MacroData {
  consumed: number;
  target: number;
}

export interface FuelHeroProps {
  calories: MacroData;
  protein: MacroData;
  carbs: MacroData;
  fat: MacroData;
  mealsLoggedToday: number;
  lastMeal?: { name: string; loggedAt: string | Date } | null;
  nextPlannedMeal?: { name: string; inMinutes?: number } | null;
  entries: Array<{
    id: string;
    meal_name: string;
    calories: number;
    protein_grams: number;
    carbs_grams: number;
    fat_grams: number;
  }>;
  onEditTarget?: (field: MacroField) => void;
  onLogMeal: () => void;
}

const GOLD = "#C9A961";
const GOLD_DEEP = "#A8893F";

const MACRO_COLORS: Record<Exclude<MacroField, "calories">, string> = {
  protein: "#E76F51",
  carbs: "#E9C46A",
  fat: "#7FB069",
};

const RING_SIZE = 240;
const RING_STROKE = 8;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function timeAgo(date: Date) {
  const diff = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface MacroTileProps {
  field: Exclude<MacroField, "calories">;
  label: string;
  consumed: number;
  target: number;
  color: string;
  entries: FuelHeroProps["entries"];
  onEditTarget?: () => void;
}

const MacroTile = ({
  field,
  label,
  consumed,
  target,
  color,
  entries,
  onEditTarget,
}: MacroTileProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const remaining = Math.max(0, Math.round(target - consumed));
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const filledDots = Math.round(pct * 5);
  const complete = target > 0 && consumed >= target;

  const macroKey =
    field === "protein"
      ? "protein_grams"
      : field === "carbs"
        ? "carbs_grams"
        : "fat_grams";

  const contributing = entries.filter((e) => (e as any)[macroKey] > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="group relative flex flex-col items-start text-left rounded-2xl px-3 py-3.5 overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(0,0,0,0.4) 100%)`,
          border: `1px solid ${color}4D`, // 30% opacity
        }}
        aria-label={`View ${label} details`}
      >
        {onEditTarget && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onEditTarget();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onEditTarget();
              }
            }}
            className="absolute top-2 right-2 p-1 rounded-md text-foreground/30 hover:text-foreground/70 hover:bg-foreground/5 transition-colors"
            aria-label={`Edit ${label} target`}
          >
            <Pencil className="w-3 h-3" />
          </span>
        )}

        <div
          className="text-[10px] uppercase tracking-[0.22em] font-bold"
          style={{ color }}
        >
          {label}
        </div>

        <div className="mt-2 flex items-baseline gap-1 leading-none">
          {complete ? (
            <span className="flex items-center gap-1 text-2xl font-heading font-bold text-foreground tabular-nums">
              <Check className="w-5 h-5" style={{ color }} strokeWidth={3} />
              Hit
            </span>
          ) : (
            <>
              <span className="text-3xl font-heading font-bold text-foreground tabular-nums">
                {remaining}
              </span>
              <span className="text-sm font-normal text-foreground/55">g</span>
              <span className="ml-1 text-[10px] uppercase tracking-wider text-foreground/45">
                left
              </span>
            </>
          )}
        </div>

        {/* Dot progress */}
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                backgroundColor: i < filledDots ? color : `${color}26`,
                boxShadow:
                  i < filledDots ? `0 0 6px ${color}80` : "none",
              }}
            />
          ))}
        </div>

        <div className="mt-2 text-[10px] text-foreground/45 tabular-nums">
          {Math.round(consumed)} / {Math.round(target)}g
        </div>
      </button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="bg-background border-t border-border/40">
          <SheetHeader>
            <SheetTitle className="font-heading text-2xl flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label} today
            </SheetTitle>
            <SheetDescription className="text-foreground/60">
              {Math.round(consumed)}g of {Math.round(target)}g
              {complete ? " · goal reached" : ` · ${remaining}g remaining`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-2 max-h-[50vh] overflow-y-auto">
            {contributing.length === 0 ? (
              <div className="py-10 text-center text-sm text-foreground/50">
                No meals contributing to {label.toLowerCase()} yet today.
              </div>
            ) : (
              contributing.map((entry) => {
                const value = (entry as any)[macroKey] as number;
                const share = target > 0 ? Math.round((value / target) * 100) : 0;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-foreground/[0.04] border border-border/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {entry.meal_name}
                      </p>
                      <p className="text-[11px] text-foreground/50 mt-0.5">
                        {entry.calories} cal · P:{entry.protein_grams}g · C:
                        {entry.carbs_grams}g · F:{entry.fat_grams}g
                      </p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p
                        className="text-base font-heading font-bold tabular-nums"
                        style={{ color }}
                      >
                        {Math.round(value)}g
                      </p>
                      <p className="text-[10px] text-foreground/45">{share}% of goal</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export const FuelHero = ({
  calories,
  protein,
  carbs,
  fat,
  mealsLoggedToday,
  lastMeal,
  nextPlannedMeal,
  entries,
  onEditTarget,
  onLogMeal,
}: FuelHeroProps) => {
  const safeTarget = Math.max(calories.target, 1);
  const pct = Math.min(calories.consumed / safeTarget, 1);
  const complete = calories.target > 0 && calories.consumed >= calories.target;
  const remaining = Math.max(0, Math.round(calories.target - calories.consumed));
  const percentage = Math.round(pct * 100);

  // Animate stroke from empty → pct on mount.
  const [animatedPct, setAnimatedPct] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimatedPct(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  const offset = CIRC - animatedPct * CIRC;

  const lastMealLine = useMemo(() => {
    if (nextPlannedMeal) {
      const when =
        nextPlannedMeal.inMinutes != null
          ? nextPlannedMeal.inMinutes < 60
            ? `in ${Math.max(1, Math.round(nextPlannedMeal.inMinutes))}m`
            : `in ${Math.round(nextPlannedMeal.inMinutes / 60)}h`
          : "soon";
      return `Next: ${nextPlannedMeal.name} · ${when}`;
    }
    if (lastMeal) {
      const date =
        typeof lastMeal.loggedAt === "string"
          ? new Date(lastMeal.loggedAt)
          : lastMeal.loggedAt;
      return `Last meal: ${timeAgo(date)} — ${lastMeal.name}`;
    }
    return "Plan ahead — log breakfast";
  }, [lastMeal, nextPlannedMeal]);

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-5 md:p-7"
      style={{
        background:
          "linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)",
        border: `1px solid ${GOLD}33`, // ~20% opacity
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* Radial gold glow behind ring */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${GOLD}14 0%, transparent 70%)`,
          filter: "blur(20px)",
        }}
      />

      <div className="relative flex items-center justify-between mb-6">
        <h2 className="font-heading text-lg md:text-xl tracking-wide text-foreground">
          Today's Nutrition
        </h2>
        <button
          onClick={onLogMeal}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-transform hover:scale-[1.03] active:scale-[0.97]"
          style={{
            backgroundColor: GOLD,
            color: "#000",
            boxShadow: `0 8px 24px ${GOLD}40`,
          }}
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> Log Meal
        </button>
      </div>

      {/* Animated calorie ring */}
      <div className="relative flex flex-col items-center">
        <div
          className="relative"
          style={{ width: RING_SIZE, height: RING_SIZE }}
        >
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            className="-rotate-90"
            style={{
              filter: complete
                ? `drop-shadow(0 0 12px ${GOLD}99)`
                : undefined,
            }}
          >
            <defs>
              <linearGradient id="fuel-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={GOLD_DEEP} />
                <stop offset="100%" stopColor={GOLD} />
              </linearGradient>
            </defs>
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={RING_STROKE}
              opacity={0.25}
            />
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="url(#fuel-gold)"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              style={{
                transition:
                  "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="text-[10px] text-foreground/55 uppercase tracking-[0.28em] mb-3 font-semibold">
              Calories left
            </span>
            {complete ? (
              <span className="text-7xl font-heading font-bold tracking-tighter tabular-nums" style={{ color: GOLD }}>
                0
              </span>
            ) : (
              <span className="text-7xl font-heading font-bold tracking-tighter text-foreground tabular-nums">
                {remaining}
              </span>
            )}
            <div className="flex items-center gap-1 mt-3 text-[11px] text-foreground/55">
              <Flame className="w-3 h-3" style={{ color: GOLD }} />
              <span className="tabular-nums">
                of {Math.round(calories.target)} cal
              </span>
            </div>
          </div>

          {onEditTarget && (
            <button
              type="button"
              onClick={() => onEditTarget("calories")}
              aria-label="Edit calorie target"
              className="absolute top-2 right-2 flex items-center gap-1 text-[9px] uppercase tracking-widest text-foreground/40 hover:text-foreground/70 transition-colors"
            >
              <Pencil className="w-2.5 h-2.5" /> Edit
            </button>
          )}
        </div>

        <p className="mt-3 text-[11px] text-foreground/55">
          <span className="tabular-nums">{mealsLoggedToday}</span>{" "}
          {mealsLoggedToday === 1 ? "meal" : "meals"} logged today ·{" "}
          <span className="tabular-nums">{percentage}%</span> of goal
        </p>
      </div>

      {/* Macro tiles */}
      <div className="relative mt-6 grid grid-cols-3 gap-2.5">
        <MacroTile
          field="protein"
          label="Protein"
          consumed={protein.consumed}
          target={protein.target}
          color={MACRO_COLORS.protein}
          entries={entries}
          onEditTarget={onEditTarget ? () => onEditTarget("protein") : undefined}
        />
        <MacroTile
          field="carbs"
          label="Carbs"
          consumed={carbs.consumed}
          target={carbs.target}
          color={MACRO_COLORS.carbs}
          entries={entries}
          onEditTarget={onEditTarget ? () => onEditTarget("carbs") : undefined}
        />
        <MacroTile
          field="fat"
          label="Fat"
          consumed={fat.consumed}
          target={fat.target}
          color={MACRO_COLORS.fat}
          entries={entries}
          onEditTarget={onEditTarget ? () => onEditTarget("fat") : undefined}
        />
      </div>

      {/* Last meal / next meal widget */}
      <div
        className="relative mt-5 flex items-center gap-2.5 px-4 py-3 rounded-xl"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: `1px solid ${GOLD}1F`,
        }}
      >
        <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GOLD }} />
        <p className="text-xs text-foreground/75 truncate">{lastMealLine}</p>
      </div>
    </div>
  );
};

export default FuelHero;
