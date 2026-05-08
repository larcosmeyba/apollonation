import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, differenceInDays } from "date-fns";
import { z } from "zod";
import { cn } from "@/lib/utils";

export interface QuestionnairePayload {
  goals: string[];
  weight_value: number | null;
  weight_unit: "lb" | "kg";
  body_fat_percent: number | null;
  target_date: string | null;
  experience_level: number;
  training_location: "home" | "gym" | "both";
  equipment: string[];
  training_days: string[]; // ["mon", "tue", ...]
  coach_intensity: "more" | "fewer" | "silent";
  workout_duration_minutes: number; // 30–75
}

const GOALS = [
  "Lose weight",
  "Lose body fat %",
  "Gain muscle",
  "Maintain weight",
  "More glute definition",
  "Grow arms",
  "Improve cardio",
  "Wedding / event prep",
];

const EQUIPMENT = ["Dumbbells", "Barbells", "Bands", "Full gym", "Bodyweight only"];

const DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

const EXPERIENCE_LABELS = [
  "New to lifting",
  "Some experience",
  "Consistent 6+ months",
  "Advanced — train hard",
  "Competitor / years",
];

const QUICK_PICKS = [
  { label: "4 weeks", days: 28 },
  { label: "8 weeks", days: 56 },
  { label: "12 weeks", days: 84 },
  { label: "6 months", days: 182 },
  { label: "1 year", days: 365 },
];

const payloadSchema = z.object({
  goals: z.array(z.string()).min(1, "Pick at least one goal"),
  weight_value: z.number().positive().max(1000).nullable(),
  weight_unit: z.enum(["lb", "kg"]),
  body_fat_percent: z.number().min(2).max(70).nullable(),
  target_date: z.string().nullable(),
  experience_level: z.number().min(1).max(5),
  training_location: z.enum(["home", "gym", "both"]),
  equipment: z.array(z.string()),
  training_days: z.array(z.string()).min(1, "Pick at least one training day"),
  coach_intensity: z.enum(["more", "fewer", "silent"]),
  workout_duration_minutes: z.number().min(30).max(75),
});

interface Props {
  onComplete: (payload: QuestionnairePayload) => Promise<void> | void;
  submitting?: boolean;
}

const MyWorkoutsQuestionnaire = ({ onComplete, submitting }: Props) => {
  const { toast } = useToast();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<QuestionnairePayload>({
    goals: [],
    weight_value: null,
    weight_unit: "lb",
    body_fat_percent: null,
    target_date: null,
    experience_level: 2,
    training_location: "gym",
    equipment: [],
    training_days: [],
    coach_intensity: "more",
    workout_duration_minutes: 45,
  });

  const totalSteps = 8;
  const skipEquipment = data.training_location === "gym";

  const goNext = () => {
    if (step === 4 && skipEquipment) {
      setStep(6); // skip Q6 (equipment)
    } else {
      setStep((s) => Math.min(totalSteps - 1, s + 1));
    }
  };
  const goBack = () => {
    if (step === 6 && skipEquipment) {
      setStep(4);
    } else {
      setStep((s) => Math.max(0, s - 1));
    }
  };

  const toggle = (key: "goals" | "equipment" | "training_days", value: string) => {
    setData((d) => {
      const cur = d[key] as string[];
      return {
        ...d,
        [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
      };
    });
  };

  const canAdvance = (() => {
    switch (step) {
      case 0:
        return data.goals.length > 0;
      case 1:
        return true; // optional
      case 2:
        return true; // optional but recommended
      case 3:
        return true;
      case 4:
        return !!data.training_location;
      case 5:
        return skipEquipment || data.equipment.length > 0;
      case 6:
        return data.training_days.length > 0;
      case 7:
        return data.workout_duration_minutes >= 30 && data.workout_duration_minutes <= 75;
      default:
        return true;
    }
  })();

  const submit = async () => {
    const parsed = payloadSchema.safeParse(data);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast({ title: "Almost there", description: first.message, variant: "destructive" });
      return;
    }
    await onComplete(parsed.data as QuestionnairePayload);
  };

  // Coaching nudge for unrealistic timeframes when goal is weight loss
  const unrealisticNudge = (() => {
    if (!data.target_date) return null;
    const days = differenceInDays(new Date(data.target_date), new Date());
    const wantsLoss = data.goals.includes("Lose weight") || data.goals.includes("Lose body fat %");
    if (wantsLoss && days > 0 && days < 28) {
      return "I love the ambition. Real, lasting fat loss usually wants 8–12 weeks minimum. We can still start now — just expect to extend.";
    }
    return null;
  })();

  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/40">
            Step {step + 1} / {totalSteps}
          </span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/40">
            My Workouts
          </span>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {step === 0 && (
              <Section
                title="What is your goal?"
                subtitle="Pick everything that applies."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GOALS.map((g) => (
                    <CardChoice
                      key={g}
                      selected={data.goals.includes(g)}
                      onClick={() => toggle("goals", g)}
                      label={g}
                    />
                  ))}
                </div>
              </Section>
            )}

            {step === 1 && (
              <Section
                title="Where are you starting?"
                subtitle="Optional — helps us tune the plan. Skip if you'd rather not say."
              >
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="text-xs text-foreground/60 mb-1.5 block">Weight</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={data.weight_value ?? ""}
                        onChange={(e) =>
                          setData({
                            ...data,
                            weight_value: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="h-12 text-base"
                      />
                      <div className="flex rounded-md border border-border overflow-hidden">
                        {(["lb", "kg"] as const).map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setData({ ...data, weight_unit: u })}
                            className={cn(
                              "px-4 text-sm",
                              data.weight_unit === u
                                ? "bg-foreground text-background"
                                : "bg-transparent text-foreground/60"
                            )}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-foreground/60 mb-1.5 block">
                      Body fat % (optional)
                    </label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="Not sure? Leave blank."
                      value={data.body_fat_percent ?? ""}
                      onChange={(e) =>
                        setData({
                          ...data,
                          body_fat_percent: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="h-12 text-base"
                    />
                  </div>
                </div>
              </Section>
            )}

            {step === 2 && (
              <Section
                title="When do you want to reach your goal?"
                subtitle="Pick a date or a quick option."
              >
                <div className="space-y-4 max-w-md">
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PICKS.map((q) => {
                      const date = addDays(new Date(), q.days);
                      const iso = date.toISOString().slice(0, 10);
                      const active = data.target_date === iso;
                      return (
                        <button
                          key={q.label}
                          type="button"
                          onClick={() => setData({ ...data, target_date: iso })}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm border transition-all",
                            active
                              ? "bg-foreground text-background border-foreground"
                              : "border-border text-foreground/70 hover:text-foreground"
                          )}
                        >
                          {q.label}
                        </button>
                      );
                    })}
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-12 justify-start font-normal">
                        {data.target_date
                          ? format(new Date(data.target_date), "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={data.target_date ? new Date(data.target_date) : undefined}
                        onSelect={(d) =>
                          setData({
                            ...data,
                            target_date: d ? d.toISOString().slice(0, 10) : null,
                          })
                        }
                        disabled={(d) => d < today}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {unrealisticNudge && (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground/80">
                      <span className="font-medium text-primary">Coach: </span>
                      {unrealisticNudge}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {step === 3 && (
              <Section title="Experience level" subtitle="Be honest — we scale to you.">
                <div className="max-w-md space-y-6">
                  <div className="flex items-baseline gap-3">
                    <span className="text-6xl font-heading font-bold">{data.experience_level}</span>
                    <span className="text-foreground/60">/ 5</span>
                  </div>
                  <p className="text-foreground/70">{EXPERIENCE_LABELS[data.experience_level - 1]}</p>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[data.experience_level]}
                    onValueChange={(v) => setData({ ...data, experience_level: v[0] })}
                  />
                </div>
              </Section>
            )}

            {step === 4 && (
              <Section title="How do you want to train?" subtitle="You can change this later.">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
                  {(
                    [
                      { id: "home", label: "At home" },
                      { id: "gym", label: "In a gym" },
                      { id: "both", label: "Both" },
                    ] as const
                  ).map((opt) => (
                    <CardChoice
                      key={opt.id}
                      selected={data.training_location === opt.id}
                      onClick={() => setData({ ...data, training_location: opt.id })}
                      label={opt.label}
                    />
                  ))}
                </div>
              </Section>
            )}

            {step === 5 && !skipEquipment && (
              <Section
                title="What equipment do you have?"
                subtitle="Pick everything you can access."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EQUIPMENT.map((eq) => (
                    <CardChoice
                      key={eq}
                      selected={data.equipment.includes(eq)}
                      onClick={() => toggle("equipment", eq)}
                      label={eq}
                    />
                  ))}
                </div>
              </Section>
            )}

            {step === 6 && (
              <Section
                title="What days do you plan on training?"
                subtitle="3–5 days is the sweet spot for most people."
              >
                <div className="grid grid-cols-7 gap-2 max-w-xl">
                  {DAYS.map((d) => {
                    const active = data.training_days.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggle("training_days", d.id)}
                        className={cn(
                          "aspect-square rounded-xl border text-sm font-medium transition-all",
                          active
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-foreground/70 hover:text-foreground"
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-6 max-w-md">
                  <p className="text-xs text-foreground/60 mb-2 uppercase tracking-wider">
                    Coach intensity
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "more", label: "More prompts" },
                        { id: "fewer", label: "Fewer" },
                        { id: "silent", label: "Silent" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setData({ ...data, coach_intensity: opt.id })}
                        className={cn(
                          "px-3 py-2.5 rounded-lg text-sm border transition-all",
                          data.coach_intensity === opt.id
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-foreground/70 hover:text-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="mt-10 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={step === 0 || submitting}
          className="text-foreground/60"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {step < totalSteps - 1 ? (
          <Button
            onClick={goNext}
            disabled={!canAdvance || submitting}
            className="min-w-32"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={submit}
            disabled={!canAdvance || submitting}
            className="min-w-32"
          >
            {submitting ? "Building..." : "Build my plan"}
          </Button>
        )}
      </div>
    </div>
  );
};

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <h2 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="text-foreground/60">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const CardChoice = ({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "min-h-[60px] px-5 py-4 rounded-2xl border text-left text-base transition-all flex items-center justify-between gap-3",
      selected
        ? "bg-foreground text-background border-foreground"
        : "border-border text-foreground/80 hover:text-foreground hover:border-foreground/40"
    )}
  >
    <span className="font-medium">{label}</span>
    {selected && <Check className="w-4 h-4 flex-shrink-0" />}
  </button>
);

export default MyWorkoutsQuestionnaire;
