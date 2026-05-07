interface MacroRingProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  color: string; // e.g. "hsl(var(--apollo-gold))"
  size?: number;
}

export const MacroRing = ({
  value,
  max,
  label,
  unit = "g",
  color,
  size = 80,
}: MacroRingProps) => {
  const stroke = size >= 96 ? 6 : 5;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / Math.max(max, 1), 1);
  const offset = circumference - pct * circumference;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
            opacity={0.3}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-semibold text-foreground leading-none">
            {Math.round(value)}
            {unit === "g" && <span className="text-[9px] text-foreground/60">g</span>}
            {unit !== "g" && unit}
          </span>
        </div>
      </div>
      <span className="text-[10px] text-foreground/70 font-medium uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
};

export default MacroRing;
