import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClassType } from "./types";
import apolloLogo from "@/assets/apollo-logo.png";

const COMMON_EQUIPMENT = ["Dumbbells", "Resistance Bands", "Yoga Mat", "Bench", "Kettlebell", "Barbell", "Foam Roller", "Jump Rope"];

interface WelcomeSlideProps {
  classType: ClassType;
  equipment: string[];
  onEquipmentChange: (equipment: string[]) => void;
  isEditing: boolean;
}

const classLabels: Record<ClassType, string> = {
  sculpt: "SCULPT",
  strength: "STRENGTH",
  stretch: "STRETCH",
};

const WelcomeSlide = ({ classType, equipment, onEquipmentChange, isEditing }: WelcomeSlideProps) => {
  const [customInput, setCustomInput] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const addEquipment = (item: string) => {
    const trimmed = item.trim();
    if (trimmed && !equipment.includes(trimmed)) {
      onEquipmentChange([...equipment, trimmed]);
    }
    setCustomInput("");
  };

  const removeEquipment = (item: string) => {
    onEquipmentChange(equipment.filter((e) => e !== item));
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(/images/marble-bg.jpeg)` }}
      />
      <div className="absolute inset-0 bg-background/70" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 text-center px-8 max-w-2xl">
        {/* Venue branding */}
        <p className="text-xs tracking-[0.35em] text-muted-foreground uppercase">Pedal Spin Studios</p>

        {/* Prominent Apollo Nation Logo */}
        <img src={apolloLogo} alt="Apollo Nation" className="w-24 h-24 md:w-32 md:h-32 object-contain invert" />

        <div className="space-y-3">
          <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">{classLabels[classType]} Class</p>
          <h1 className="font-heading text-4xl md:text-5xl tracking-[0.1em] text-foreground leading-tight">
            WELCOME TO<br />TODAY'S CLASS
          </h1>
          <div className="w-16 h-px bg-foreground/30 mx-auto mt-4" />
        </div>

        <div className="space-y-4 w-full">
          <p className="text-sm tracking-[0.2em] text-muted-foreground uppercase">Today You Will Need</p>

          {equipment.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-3">
              {equipment.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card/80 text-sm text-foreground"
                >
                  <span>{item}</span>
                  {isEditing && (
                    <button onClick={() => removeEquipment(item)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm italic">No equipment added yet</p>
          )}

          {isEditing && (
            <div className="space-y-3 mt-4">
              {!showAdd ? (
                <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Equipment
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap justify-center gap-2">
                    {COMMON_EQUIPMENT.filter((e) => !equipment.includes(e)).map((item) => (
                      <button
                        key={item}
                        onClick={() => addEquipment(item)}
                        className="px-3 py-1.5 text-xs rounded-md border border-border bg-muted text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                      >
                        + {item}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 max-w-xs mx-auto">
                    <Input
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder="Custom equipment..."
                      className="text-sm h-9"
                      onKeyDown={(e) => e.key === "Enter" && addEquipment(customInput)}
                    />
                    <Button size="sm" onClick={() => addEquipment(customInput)} disabled={!customInput.trim()}>
                      Add
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="text-xs">
                    Done
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeSlide;
