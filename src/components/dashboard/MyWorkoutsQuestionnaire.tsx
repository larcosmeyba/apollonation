import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
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
  training_days: string[];
  coach_intensity: "more" | "fewer" | "silent";
  workout_duration_minutes: number;
  main_goal: string | null;
  focus_areas: string[];
  improve_areas: string[];
  avoid_areas: string[];
  workout_environment: string | null;
  gym_confidence: string | null;
  workout_time: string | null;
  workout_styles: string[];
  cardio_preference: string | null;
  favorite_exercises: string | null;
  disliked_exercises: string | null;
  current_routine: string | null;
  injuries: string | null;
  pain_areas: string | null;
  mobility_limitations: string | null;
  recovery_level: string | null;
  stress_level: string | null;
  sleep_quality: string | null;
}

const MAIN_GOALS = [
  "Build muscle",
  "Lose fat",
  "Lean bulk",
  "Recomp",
  "Improve strength",
  "Improve endurance",
  "Athletic performance",
  "General fitness",
  "Improve mobility",
  "Tone body",
];

const BODY_AREAS = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Core",
  "Glutes",
  "Quads",
  "Hamstrings",
  "Calves",
  "Full body",
];

const ENVIRONMENTS = [
  { id: "full_gym", label: "Full gym access" },
  { id: "apartment_gym", label: "Apartment gym" },
  { id: "home", label: "At-home workouts" },
  { id: "dumbbells_only", label: "Dumbbells only" },
  { id: "bands_only", label: "Resistance bands only" },
  { id: "bodyweight", label: "Bodyweight only" },
  { id: "mixed", label: "Mixed equipment" },
];

const EQUIPMENT = [
  "Dumbbells",
  "Barbell",
  "Bench",
  "Squat rack",
  "Cables",
  "Machines",
  "Kettlebells",
  "Bands",
  "Pull-up bar",
  "Bodyweight only",
];

const CONFIDENCE = [
  { id: "low", label: "New to the gym" },
  { id: "moderate", label: "Comfortable" },
  { id: "high", label: "Very confident" },
];

const DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

const DURATIONS = [
  { id: 15, label: "15 min" },
  { id: 20, label: "20 min" },
  { id: 30, label: "30 min" },
  { id: 45, label: "45 min" },
  { id: 60, label: "60+ min" },
];

const TIMES = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
];

const EXPERIENCE = [
  { id: 1, label: "Beginner", desc: "Just starting out" },
  { id: 3, label: "Intermediate", desc: "6+ months consistent" },
  { id: 5, label: "Advanced", desc: "Years of training" },
];

const STYLES = [
  "Strength training",
  "HIIT",
  "Functional fitness",
  "Bodybuilding",
  "Athletic performance",
  "Pilates",
  "Mobility",
  "Cardio conditioning",
  "Hybrid training",
];

const CARDIO_PREF = [
  { id: "love", label: "Love it" },
  { id: "ok", label: "It's fine" },
  { id: "minimal", label: "Keep it minimal" },
  { id: "none", label: "Skip cardio" },
];

const RECOVERY = [
  { id: "low", label: "Drained" },
  { id: "moderate", label: "Average" },
  { id: "high", label: "Recovering well" },
];

const STRESS = [
  { id: "low", label: "Low" },
  { id: "moderate", label: "Moderate" },
  { id: "high", label: "High" },
];

const SLEEP = [
  { id: "poor", label: "Poor (<6h)" },
  { id: "ok", label: "OK (6–7h)" },
  { id: "good", label: "Great (7–9h)" },
];

const payloadSchema = z.object({
  main_goal: z.string().min(1),
  goals: z.array(z.string()),
  experience_level: z.number().min(1).max(5),
  workout_environment: z.string().min(1),
  training_days: z.array(z.string()).min(1),
  workout_duration_minutes: z.number().min(15).max(120),
});

interface Props {
  onComplete: (payload: QuestionnairePayload) => Promise<void> | void;
  submitting?: boolean;
  initial?: Partial<QuestionnairePayload>;
}

const STEPS = [
  { id: "goals", label: "Goals" },
  { id: "focus", label: "Focus" },
  { id: "environment", label: "Where" },
  { id: "schedule", label: "Schedule" },
  { id: "style", label: "Style" },
  { id: "exercises", label: "Exercises" },
  { id: "recovery", label: "Recovery" },
  { id: "review", label: "Review" },
];

const MyWorkoutsQuestionnaire = ({ onComplete, submitting, initial }: Props) => {
  const { toast } = useToast();
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
    main_goal: null,
    focus_areas: [],
    improve_areas: [],
    avoid_areas: [],
    workout_environment: null,
    gym_confidence: null,
    workout_time: null,
    workout_styles: [],
    cardio_preference: null,
    favorite_exercises: null,
    disliked_exercises: null,
    current_routine: null,
    injuries: null,
    pain_areas: null,
    mobility_limitations: null,
    recovery_level: null,
    stress_level: null,
    sleep_quality: null,
    ...initial,
  });

  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const setField = <K extends keyof QuestionnairePayload>(k: K, v: QuestionnairePayload[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const toggleArr = (k: keyof QuestionnairePayload, v: string) => {
    setData((d) => {
      const cur = (d[k] as string[]) || [];
      return { ...d, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as QuestionnairePayload;
    });
  };

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return !!data.main_goal;
      case 2:
        return !!data.workout_environment;
      case 3:
        return data.training_days.length > 0 && data.workout_duration_minutes >= 15;
      case 4:
        return data.experience_level >= 1;
      default:
        return true;
    }
  }, [step, data]);

  const goNext = () => setStep((s) => Math.min(totalSteps - 1, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    // Sync legacy goals[] from main_goal so downstream readers still get a value.
    const merged: QuestionnairePayload = {
      ...data,
      goals: data.goals.length > 0 ? data.goals : data.main_goal ? [data.main_goal] : [],
    };
    const parsed = payloadSchema.safeParse(merged);
    if (!parsed.success) {
      toast({ title: "Almost there", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    await onComplete(merged);
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col">
      {/* Sticky progress */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/40 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/40">
            {STEPS[step].label} · {step + 1}/{totalSteps}
          </span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary">My Plan</span>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {step === 0 && (
              <div className="space-y-6">
                <Header eyebrow="Fitness Goals" title="What's your main goal right now?" />
                <ChipGrid
                  options={MAIN_GOALS.map((g) => ({ id: g, label: g }))}
                  value={data.main_goal ? [data.main_goal] : []}
                  onToggle={(id) => setField("main_goal", id)}
                  single
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-8">
                <Header eyebrow="Body Areas" title="What do you want to focus on?" />
                <Section label="Areas you want to focus on">
                  <ChipGrid
                    options={BODY_AREAS.map((g) => ({ id: g, label: g }))}
                    value={data.focus_areas}
                    onToggle={(id) => toggleArr("focus_areas", id)}
                  />
                </Section>
                <Section label="Areas you want to improve">
                  <ChipGrid
                    options={BODY_AREAS.map((g) => ({ id: g, label: g }))}
                    value={data.improve_areas}
                    onToggle={(id) => toggleArr("improve_areas", id)}
                  />
                </Section>
                <Section label="Areas to avoid (injuries, soreness, etc.)">
                  <ChipGrid
                    options={BODY_AREAS.map((g) => ({ id: g, label: g }))}
                    value={data.avoid_areas}
                    onToggle={(id) => toggleArr("avoid_areas", id)}
                  />
                </Section>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <Header eyebrow="Workout Environment" title="Where will you be training?" />
                <Section label="Preferred location">
                  <ChipGrid
                    options={ENVIRONMENTS}
                    value={data.workout_environment ? [data.workout_environment] : []}
                    onToggle={(id) => {
                      setField("workout_environment", id);
                      // Sync legacy training_location for downstream filters
                      const map: Record<string, "home" | "gym" | "both"> = {
                        full_gym: "gym",
                        apartment_gym: "gym",
                        home: "home",
                        dumbbells_only: "home",
                        bands_only: "home",
                        bodyweight: "home",
                        mixed: "both",
                      };
                      setField("training_location", map[id] || "both");
                    }}
                    single
                  />
                </Section>
                <Section label="Equipment available">
                  <ChipGrid
                    options={EQUIPMENT.map((e) => ({ id: e, label: e }))}
                    value={data.equipment}
                    onToggle={(id) => toggleArr("equipment", id)}
                  />
                </Section>
                <Section label="Gym confidence">
                  <ChipGrid
                    options={CONFIDENCE}
                    value={data.gym_confidence ? [data.gym_confidence] : []}
                    onToggle={(id) => setField("gym_confidence", id)}
                    single
                  />
                </Section>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <Header eyebrow="Training Schedule" title="When can you train?" />
                <Section label="Days per week available">
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS.map((d) => {
                      const on = data.training_days.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleArr("training_days", d.id)}
                          className={cn(
                            "rounded-xl py-3 text-xs font-semibold border transition-all",
                            on
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border/60 text-foreground/70 hover:border-primary/40"
                          )}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </Section>
                <Section label="Preferred workout duration">
                  <ChipGrid
                    options={DURATIONS.map((d) => ({ id: String(d.id), label: d.label }))}
                    value={[String(data.workout_duration_minutes)]}
                    onToggle={(id) => setField("workout_duration_minutes", Number(id))}
                    single
                  />
                </Section>
                <Section label="Preferred workout time">
                  <ChipGrid
                    options={TIMES}
                    value={data.workout_time ? [data.workout_time] : []}
                    onToggle={(id) => setField("workout_time", id)}
                    single
                  />
                </Section>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <Header eyebrow="Experience & Style" title="How do you like to train?" />
                <Section label="Experience level">
                  <div className="grid grid-cols-1 gap-2">
                    {EXPERIENCE.map((e) => {
                      const on = data.experience_level === e.id;
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setField("experience_level", e.id)}
                          className={cn(
                            "text-left rounded-2xl px-5 py-4 border transition-all",
                            on
                              ? "bg-primary/10 border-primary/60"
                              : "bg-card border-border/60 hover:border-primary/30"
                          )}
                        >
                          <div className="text-sm font-semibold">{e.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{e.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </Section>
                <Section label="Workout styles you enjoy">
                  <ChipGrid
                    options={STYLES.map((s) => ({ id: s, label: s }))}
                    value={data.workout_styles}
                    onToggle={(id) => toggleArr("workout_styles", id)}
                  />
                </Section>
                <Section label="Cardio preference">
                  <ChipGrid
                    options={CARDIO_PREF}
                    value={data.cardio_preference ? [data.cardio_preference] : []}
                    onToggle={(id) => setField("cardio_preference", id)}
                    single
                  />
                </Section>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-8">
                <Header eyebrow="Exercises" title="Tell us what you love & avoid" />
                <Section label="Favorite exercises (optional)">
                  <Textarea
                    rows={3}
                    placeholder="e.g. RDLs, hip thrusts, incline press"
                    value={data.favorite_exercises ?? ""}
                    onChange={(e) => setField("favorite_exercises", e.target.value || null)}
                  />
                </Section>
                <Section label="Exercises you dislike (optional)">
                  <Textarea
                    rows={3}
                    placeholder="e.g. burpees, box jumps"
                    value={data.disliked_exercises ?? ""}
                    onChange={(e) => setField("disliked_exercises", e.target.value || null)}
                  />
                </Section>
                <Section label="Current workout routine (optional)">
                  <Textarea
                    rows={3}
                    placeholder="What are you doing now, if anything?"
                    value={data.current_routine ?? ""}
                    onChange={(e) => setField("current_routine", e.target.value || null)}
                  />
                </Section>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-8">
                <Header eyebrow="Limitations & Recovery" title="How's your body feeling?" />
                <Section label="Current injuries or limitations (optional)">
                  <Textarea
                    rows={2}
                    placeholder="e.g. left shoulder impingement"
                    value={data.injuries ?? ""}
                    onChange={(e) => setField("injuries", e.target.value || null)}
                  />
                </Section>
                <Section label="Areas with pain or discomfort (optional)">
                  <Input
                    placeholder="e.g. lower back, knees"
                    value={data.pain_areas ?? ""}
                    onChange={(e) => setField("pain_areas", e.target.value || null)}
                  />
                </Section>
                <Section label="Mobility limitations (optional)">
                  <Input
                    placeholder="e.g. tight hips, limited overhead"
                    value={data.mobility_limitations ?? ""}
                    onChange={(e) => setField("mobility_limitations", e.target.value || null)}
                  />
                </Section>
                <Section label="Recovery level">
                  <ChipGrid
                    options={RECOVERY}
                    value={data.recovery_level ? [data.recovery_level] : []}
                    onToggle={(id) => setField("recovery_level", id)}
                    single
                  />
                </Section>
                <Section label="Stress level">
                  <ChipGrid
                    options={STRESS}
                    value={data.stress_level ? [data.stress_level] : []}
                    onToggle={(id) => setField("stress_level", id)}
                    single
                  />
                </Section>
                <Section label="Sleep quality">
                  <ChipGrid
                    options={SLEEP}
                    value={data.sleep_quality ? [data.sleep_quality] : []}
                    onToggle={(id) => setField("sleep_quality", id)}
                    single
                  />
                </Section>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-6">
                <Header eyebrow="Review" title="Looks good?" />
                <div className="rounded-3xl border border-border/60 bg-card/60 p-6 space-y-3 text-sm">
                  <Row k="Main goal" v={data.main_goal} />
                  <Row k="Environment" v={ENVIRONMENTS.find((e) => e.id === data.workout_environment)?.label} />
                  <Row k="Days / week" v={data.training_days.length} />
                  <Row k="Duration" v={`${data.workout_duration_minutes} min`} />
                  <Row k="Experience" v={EXPERIENCE.find((e) => e.id === data.experience_level)?.label} />
                  <Row k="Styles" v={data.workout_styles.join(", ") || "—"} />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  We'll use this to recommend your training split, on-demand workouts, and recovery content.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 -mx-4 px-4 py-4 bg-background/90 backdrop-blur-md border-t border-border/40 mt-8 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={step === 0 || submitting}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        {step < totalSteps - 1 ? (
          <Button onClick={goNext} disabled={!canAdvance} variant="apollo" className="gap-2 min-w-32">
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitting} variant="apollo" className="gap-2 min-w-32">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Build my plan
          </Button>
        )}
      </div>
    </div>
  );
};

const Header = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div className="space-y-2">
    <div className="text-[10px] tracking-[0.3em] uppercase text-primary">{eyebrow}</div>
    <h2 className="font-heading text-2xl md:text-3xl tracking-tight leading-tight">{title}</h2>
  </div>
);

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="text-xs uppercase tracking-[0.2em] text-foreground/50">{label}</div>
    {children}
  </div>
);

const ChipGrid = ({
  options,
  value,
  onToggle,
  single,
}: {
  options: { id: string; label: string }[];
  value: string[];
  onToggle: (id: string) => void;
  single?: boolean;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => {
      const on = value.includes(o.id);
      return (
        <button
          key={o.id}
          type="button"
          onClick={() => onToggle(o.id)}
          className={cn(
            "rounded-full px-4 py-2.5 text-sm font-medium border transition-all",
            on
              ? "bg-primary text-primary-foreground border-primary shadow-[0_4px_12px_hsl(var(--primary)/0.3)]"
              : "bg-card border-border/60 text-foreground/80 hover:border-primary/40"
          )}
        >
          {single && on && <Check className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />}
          {o.label}
        </button>
      );
    })}
  </div>
);

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-foreground/50 text-xs uppercase tracking-wider">{k}</span>
    <span className="font-medium text-right">{v ?? "—"}</span>
  </div>
);

export default MyWorkoutsQuestionnaire;
