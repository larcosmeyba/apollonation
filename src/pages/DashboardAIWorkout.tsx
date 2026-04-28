import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAccessControl } from "@/hooks/useAccessControl";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import RestTimer from "@/components/dashboard/RestTimer";
import { Loader2, Sparkles, Lock, Play } from "lucide-react";
import { toast } from "sonner";

type BlockItem = {
  exercise_id: string;
  title?: string;
  duration_sec?: number;
  sets?: number;
  reps?: number;
  rest_sec?: number;
  notes?: string;
  modifications?: string;
};

type Workout = {
  warmup: BlockItem[];
  main: BlockItem[];
  cooldown: BlockItem[];
  estimated_minutes: number;
};

const TIME_OPTIONS = [15, 20, 30, 45];
const GOAL_OPTIONS = ["Strength", "Cardio", "Mobility", "Full Body", "Upper Body", "Lower Body"];
const ENERGY_OPTIONS = ["Low", "Medium", "High"];
const EQUIPMENT_OPTIONS = ["Bodyweight", "Dumbbells", "Bands", "Full Gym"];

const DashboardAIWorkout = () => {
  const navigate = useNavigate();
  const { canAccessAIGenerator, loading: accessLoading } = useAccessControl();

  const [time, setTime] = useState<number>(30);
  const [goal, setGoal] = useState<string>("Full Body");
  const [energy, setEnergy] = useState<string>("Medium");
  const [equipment, setEquipment] = useState<string[]>(["Bodyweight"]);
  const [avoid, setAvoid] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [started, setStarted] = useState(false);

  if (accessLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center pt-20">
          <Loader2 className="w-6 h-6 animate-spin text-foreground/60" />
        </div>
      </DashboardLayout>
    );
  }

  if (!canAccessAIGenerator) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto space-y-6 pt-2">
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Build Today's Workout
          </h1>
          <Card className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-5 h-5 text-foreground/70" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Your workout, built for today.</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Unlock AI training with Apollo Reborn™.
              </p>
            </div>
            <Button variant="apollo" onClick={() => navigate("/subscribe?reason=ai")}>
              See Apollo Reborn™ membership
            </Button>
          </Card>
          <Disclaimer />
        </div>
      </DashboardLayout>
    );
  }

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const handleGenerate = async () => {
    if (equipment.length === 0) {
      toast.error("Pick at least one equipment option");
      return;
    }
    setGenerating(true);
    setWorkout(null);
    setStarted(false);
    try {
      const { data, error } = await supabase.functions.invoke("generate-daily-workout", {
        body: { time, goal, energy, equipment, avoid: avoid.slice(0, 500) },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setWorkout((data as any).workout as Workout);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? "Failed to generate workout";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6 pt-2">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Build Today's Workout
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-built, structured for what you've got today.
          </p>
        </div>

        {!workout && (
          <Card className="p-5 space-y-6">
            {/* Time */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">Time available</Label>
              <RadioGroup
                value={String(time)}
                onValueChange={(v) => setTime(Number(v))}
                className="grid grid-cols-4 gap-2"
              >
                {TIME_OPTIONS.map((t) => (
                  <label
                    key={t}
                    className={`flex items-center justify-center rounded-lg border px-3 py-2 cursor-pointer text-sm font-semibold ${
                      time === t
                        ? "bg-foreground text-background border-foreground"
                        : "bg-muted border-border"
                    }`}
                  >
                    <RadioGroupItem value={String(t)} className="sr-only" />
                    {t}m
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Energy */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">Energy level</Label>
              <RadioGroup
                value={energy}
                onValueChange={setEnergy}
                className="grid grid-cols-3 gap-2"
              >
                {ENERGY_OPTIONS.map((e) => (
                  <label
                    key={e}
                    className={`flex items-center justify-center rounded-lg border px-3 py-2 cursor-pointer text-sm font-semibold ${
                      energy === e
                        ? "bg-foreground text-background border-foreground"
                        : "bg-muted border-border"
                    }`}
                  >
                    <RadioGroupItem value={e} className="sr-only" />
                    {e}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Equipment */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">Equipment</Label>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const checked = equipment.includes(eq);
                  return (
                    <label
                      key={eq}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm ${
                        checked ? "bg-muted border-foreground" : "bg-muted/50 border-border"
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleEquipment(eq)}
                      />
                      <span className="font-medium">{eq}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Avoid */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">Avoid (optional)</Label>
              <Textarea
                value={avoid}
                onChange={(e) => setAvoid(e.target.value.slice(0, 500))}
                maxLength={500}
                placeholder="sore areas / exercises to avoid"
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">{avoid.length}/500</p>
            </div>

            <Button
              variant="apollo"
              className="w-full"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Workout
                </>
              )}
            </Button>
          </Card>
        )}

        {workout && (
          <WorkoutDisplay
            workout={workout}
            started={started}
            onStart={() => setStarted(true)}
            onReset={() => {
              setWorkout(null);
              setStarted(false);
            }}
          />
        )}

        <Disclaimer />
      </div>
    </DashboardLayout>
  );
};

const Disclaimer = () => (
  <p className="text-xs text-muted-foreground leading-relaxed pt-2">
    Apollo's AI workouts are for general fitness guidance only and are not medical advice. Stop if
    you feel pain and consult a professional if needed.
  </p>
);

const Block = ({
  title,
  items,
  type,
  showTimers,
}: {
  title: string;
  items: BlockItem[];
  type: "duration" | "sets";
  showTimers: boolean;
}) => {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3
        className="text-sm font-bold uppercase tracking-wide text-foreground"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={`${it.exercise_id}-${i}`} className="rounded-xl bg-muted p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-bold">{it.title || "Exercise"}</p>
                {type === "sets" ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {it.sets ?? 3} sets × {it.reps ?? 10} reps · rest {it.rest_sec ?? 60}s
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {it.duration_sec ?? 60}s
                  </p>
                )}
                {it.modifications && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    Modification: {it.modifications}
                  </p>
                )}
                {it.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{it.notes}</p>
                )}
              </div>
            </div>
            {showTimers && type === "sets" && (it.rest_sec ?? 0) > 0 && (
              <div className="mt-2">
                <RestTimer seconds={it.rest_sec ?? 60} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const WorkoutDisplay = ({
  workout,
  started,
  onStart,
  onReset,
}: {
  workout: Workout;
  started: boolean;
  onStart: () => void;
  onReset: () => void;
}) => {
  return (
    <div className="space-y-5">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Estimated time</p>
          <p className="text-lg font-bold">{workout.estimated_minutes} min</p>
        </div>
        {!started ? (
          <Button variant="apollo" onClick={onStart}>
            <Play className="w-4 h-4 mr-2" />
            Start Workout
          </Button>
        ) : (
          <Button variant="outline" onClick={onReset}>
            New Workout
          </Button>
        )}
      </Card>

      <Block title="Warmup" items={workout.warmup} type="duration" showTimers={started} />
      <Block title="Main Block" items={workout.main} type="sets" showTimers={started} />
      <Block title="Cooldown" items={workout.cooldown} type="duration" showTimers={started} />
    </div>
  );
};

export default DashboardAIWorkout;
