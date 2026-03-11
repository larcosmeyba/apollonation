import { Dumbbell, Flame, Heart } from "lucide-react";
import type { ClassType } from "./types";

const classTypes: { type: ClassType; label: string; description: string; icon: typeof Dumbbell }[] = [
  { type: "sculpt", label: "SCULPT", description: "Toning & definition focused", icon: Flame },
  { type: "strength", label: "STRENGTH", description: "Heavy lifting & power", icon: Dumbbell },
  { type: "stretch", label: "STRETCH", description: "Flexibility & recovery", icon: Heart },
];

interface ClassTypeSelectorProps {
  onSelect: (type: ClassType) => void;
}

const ClassTypeSelector = ({ onSelect }: ClassTypeSelectorProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-10">
      <div className="text-center space-y-2">
        <h2 className="font-heading text-2xl tracking-[0.2em] text-foreground">SELECT CLASS TYPE</h2>
        <p className="text-sm text-muted-foreground">Choose the type of class you're leading today</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl px-4">
        {classTypes.map(({ type, label, description, icon: Icon }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-8 text-center transition-all duration-300 hover:border-foreground/30 hover:bg-muted"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center group-hover:bg-foreground/10 transition-colors">
                <Icon className="w-7 h-7 text-foreground" />
              </div>
              <div>
                <p className="font-heading text-lg tracking-[0.15em] text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ClassTypeSelector;
