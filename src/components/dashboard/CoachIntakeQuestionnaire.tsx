import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface CoachIntakePayload {
  biggest_goal: string;
  why_coaching: string;
  past_blockers: string;
  accountability_style: string;
  current_struggles: string[];
  commitment_level: number;
  success_vision: string;
  additional_notes: string;
}

const STRUGGLES = [
  "Motivation",
  "Consistency",
  "Nutrition",
  "Workout structure",
  "Confidence in the gym",
  "Weight loss",
  "Muscle gain",
  "Time management",
  "Meal planning",
  "Staying disciplined",
];

const ACCOUNTABILITY = [
  { id: "checkins", label: "Regular check-ins" },
  { id: "data", label: "Data & tracking" },
  { id: "tough_love", label: "Tough love" },
  { id: "encouragement", label: "Positive encouragement" },
  { id: "structure", label: "Structured plans" },
];

const STEPS = [
  "Goal",
  "Why",
  "Blockers",
  "Style",
  "Struggles",
  "Commitment",
  "Vision",
  "Notes",
];

interface Props {
  onComplete: (payload: CoachIntakePayload) => Promise<void> | void;
  submitting?: boolean;
}

const CoachIntakeQuestionnaire = ({ onComplete, submitting }: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<CoachIntakePayload>({
    biggest_goal: "",
    why_coaching: "",
    past_blockers: "",
    accountability_style: "",
    current_struggles: [],
    commitment_level: 7,
    success_vision: "",
    additional_notes: "",
  });

  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const set = <K extends keyof CoachIntakePayload>(k: K, v: CoachIntakePayload[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const toggleStruggle = (s: string) =>
    setData((d) => ({
      ...d,
      current_struggles: d.current_struggles.includes(s)
        ? d.current_struggles.filter((x) => x !== s)
        : [...d.current_struggles, s],
    }));

  const canAdvance = (() => {
    switch (step) {
      case 0:
        return data.biggest_goal.trim().length > 0;
      case 3:
        return !!data.accountability_style;
      default:
        return true;
    }
  })();

  const submit = async () => {
    if (!data.biggest_goal.trim()) {
      toast({ title: "Tell us your goal", description: "It only takes a moment.", variant: "destructive" });
      return;
    }
    await onComplete(data);
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col px-4 max-w-2xl mx-auto w-full">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/85 backdrop-blur-md border-b border-border/40 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/40">
            {STEPS[step]} · {step + 1}/{totalSteps}
          </span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" /> Coach intake
          </span>
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
              <Q
                eyebrow="Your goal"
                title="What is your biggest fitness goal right now?"
                placeholder="e.g. lose 15 lbs and feel strong"
                value={data.biggest_goal}
                onChange={(v) => set("biggest_goal", v)}
              />
            )}
            {step === 1 && (
              <Q
                eyebrow="Why now"
                title="Why do you feel you need coaching support?"
                placeholder="What's pulling you to ask for help?"
                value={data.why_coaching}
                onChange={(v) => set("why_coaching", v)}
              />
            )}
            {step === 2 && (
              <Q
                eyebrow="Past blockers"
                title="What's stopped you from reaching your goals before?"
                placeholder="No judgment — be honest."
                value={data.past_blockers}
                onChange={(v) => set("past_blockers", v)}
              />
            )}
            {step === 3 && (
              <div className="space-y-6">
                <Header eyebrow="Accountability" title="What kind of accountability helps you most?" />
                <div className="grid grid-cols-1 gap-2">
                  {ACCOUNTABILITY.map((a) => {
                    const on = data.accountability_style === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => set("accountability_style", a.id)}
                        className={cn(
                          "text-left rounded-2xl px-5 py-4 border transition-all",
                          on
                            ? "bg-primary/10 border-primary/60"
                            : "bg-card border-border/60 hover:border-primary/30"
                        )}
                      >
                        <span className="text-sm font-medium">{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-6">
                <Header eyebrow="Struggles" title="What are you struggling with most right now?" />
                <p className="text-xs text-muted-foreground">Pick all that apply.</p>
                <div className="flex flex-wrap gap-2">
                  {STRUGGLES.map((s) => {
                    const on = data.current_struggles.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleStruggle(s)}
                        className={cn(
                          "rounded-full px-4 py-2.5 text-sm font-medium border transition-all",
                          on
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border/60 text-foreground/80 hover:border-primary/40"
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {step === 5 && (
              <div className="space-y-6">
                <Header eyebrow="Commitment" title="How committed are you right now?" />
                <div className="rounded-3xl border border-border/60 bg-card/60 p-8 text-center space-y-6">
                  <div className="text-6xl font-heading font-bold text-primary">{data.commitment_level}</div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={data.commitment_level}
                    onChange={(e) => set("commitment_level", Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Just exploring</span>
                    <span>All in</span>
                  </div>
                </div>
              </div>
            )}
            {step === 6 && (
              <Q
                eyebrow="Vision"
                title="What does success look like in 3–6 months?"
                placeholder="Paint the picture."
                value={data.success_vision}
                onChange={(v) => set("success_vision", v)}
              />
            )}
            {step === 7 && (
              <Q
                eyebrow="Anything else"
                title="What else should your coach know?"
                placeholder="Optional — share whatever helps."
                value={data.additional_notes}
                onChange={(v) => set("additional_notes", v)}
                optional
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 -mx-4 px-4 py-4 bg-background/90 backdrop-blur-md border-t border-border/40 mt-8 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        {step < totalSteps - 1 ? (
          <Button
            onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
            disabled={!canAdvance}
            variant="apollo"
            className="gap-2 min-w-32"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitting} variant="apollo" className="gap-2 min-w-32">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Send to coach
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

const Q = ({
  eyebrow,
  title,
  placeholder,
  value,
  onChange,
  optional,
}: {
  eyebrow: string;
  title: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) => (
  <div className="space-y-6">
    <Header eyebrow={eyebrow} title={title} />
    <Textarea
      rows={5}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-base"
    />
    {optional && <p className="text-xs text-muted-foreground">Optional — feel free to skip.</p>}
  </div>
);

export default CoachIntakeQuestionnaire;
