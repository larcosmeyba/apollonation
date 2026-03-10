import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Program {
  id: string;
  name: string;
  category: string;
  emoji: string;
  description: string;
  durations: number[];
}

const PROGRAMS: Program[] = [
  { id: "5k-runner", name: "5K Runner Prep", category: "Running", emoji: "🏃", description: "Build endurance to complete your first 5K", durations: [4, 8] },
  { id: "10k-runner", name: "10K Runner Prep", category: "Running", emoji: "🏃‍♂️", description: "Train for a 10K race with structured running", durations: [6, 8, 12] },
  { id: "marathon-prep", name: "Marathon Prep", category: "Running", emoji: "🏅", description: "Full marathon training with progressive mileage", durations: [12] },
  { id: "beginner-strength", name: "Beginner Strength", category: "Strength", emoji: "💪", description: "Learn the fundamentals of strength training", durations: [4, 8] },
  { id: "advanced-strength", name: "Advanced Strength", category: "Strength", emoji: "🏋️", description: "Push your limits with advanced lifting", durations: [6, 8, 12] },
  { id: "arms-focus", name: "Arms Focus", category: "Strength", emoji: "💪", description: "Build bigger, stronger arms", durations: [4, 6] },
  { id: "core-strength", name: "Core Strength", category: "Core", emoji: "🎯", description: "Build a rock-solid core foundation", durations: [4, 6] },
  { id: "cardio-conditioning", name: "Cardio Conditioning", category: "Cardio", emoji: "❤️", description: "Improve cardiovascular fitness and endurance", durations: [4, 6, 8] },
  { id: "fat-loss", name: "Fat Loss Training", category: "Fat Loss", emoji: "🔥", description: "High-intensity program designed for fat loss", durations: [4, 6, 8] },
  { id: "muscle-building", name: "Muscle Building", category: "Hypertrophy", emoji: "🏗️", description: "Progressive overload for maximum muscle growth", durations: [8, 12] },
  { id: "hiit-program", name: "HIIT Program", category: "HIIT", emoji: "⚡", description: "High-intensity interval training for results", durations: [4, 6] },
  { id: "home-workout", name: "Home Workout Plan", category: "Home", emoji: "🏠", description: "Full program with minimal equipment", durations: [4, 6, 8] },
  { id: "mobility-flexibility", name: "Mobility & Flexibility", category: "Recovery", emoji: "🧘", description: "Improve range of motion and flexibility", durations: [4, 6] },
  { id: "lower-body", name: "Lower Body Strength", category: "Strength", emoji: "🦵", description: "Focus on legs, glutes, and lower body power", durations: [4, 6, 8] },
  { id: "upper-body", name: "Upper Body Strength", category: "Strength", emoji: "💪", description: "Build upper body strength and definition", durations: [4, 6, 8] },
  { id: "full-body", name: "Full Body Conditioning", category: "Conditioning", emoji: "🔄", description: "Total body workouts for overall fitness", durations: [4, 6, 8] },
  { id: "athletic-performance", name: "Athletic Performance", category: "Performance", emoji: "🏆", description: "Train like an athlete for peak performance", durations: [6, 8, 12] },
  { id: "endurance-builder", name: "Endurance Builder", category: "Endurance", emoji: "⏱️", description: "Build stamina and endurance for any activity", durations: [6, 8] },
  { id: "speed-agility", name: "Speed & Agility", category: "Performance", emoji: "⚡", description: "Improve speed, agility, and reaction time", durations: [4, 6] },
  { id: "posture-core", name: "Posture & Core", category: "Wellness", emoji: "🧍", description: "Fix posture issues and strengthen your core", durations: [4, 6] },
  { id: "beginner-running", name: "Beginner Running", category: "Running", emoji: "👟", description: "Couch to runner in a structured plan", durations: [4, 8] },
  { id: "interval-cardio", name: "Interval Cardio", category: "Cardio", emoji: "💓", description: "Varied interval training for heart health", durations: [4, 6] },
  { id: "functional-fitness", name: "Functional Fitness", category: "Functional", emoji: "🔧", description: "Train movements, not muscles", durations: [4, 6, 8] },
  { id: "strength-cardio-hybrid", name: "Strength & Cardio Hybrid", category: "Hybrid", emoji: "🔀", description: "Best of both worlds — strength meets cardio", durations: [6, 8] },
  { id: "recovery-mobility", name: "Recovery & Mobility", category: "Recovery", emoji: "🌿", description: "Active recovery and mobility focused program", durations: [2, 4] },
];

const TrainingProgramCards = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Program | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const { data: questionnaire } = useQuery({
    queryKey: ["program-questionnaire", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("client_questionnaires")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const handleEnroll = async () => {
    if (!selected || !selectedDuration || !user || !questionnaire) return;
    setEnrolling(true);
    try {
      // Deactivate existing training plans
      await (supabase as any)
        .from("client_training_plans")
        .update({ status: "archived" })
        .eq("user_id", user.id)
        .eq("status", "active");

      // Update questionnaire goal to match program
      await (supabase as any)
        .from("client_questionnaires")
        .update({ goal_next_4_weeks: selected.name })
        .eq("id", questionnaire.id);

      // Generate new plan via edge function
      const { error } = await supabase.functions.invoke("enroll-program", {
        body: {
          questionnaireId: questionnaire.id,
          programName: selected.name,
          programGoal: selected.description,
          durationWeeks: selectedDuration,
        },
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["my-training-plan-full"] });
      toast({
        title: `Enrolled in ${selected.name}! 🎉`,
        description: `Your ${selectedDuration}-week program is being generated. This may take a minute.`,
      });
      setSelected(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to enroll", variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="font-heading text-lg tracking-wide">Browse Programs</h2>
      <p className="text-xs text-muted-foreground -mt-1">Join a pre-designed program tailored to your goals</p>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {PROGRAMS.map((program) => (
          <button
            key={program.id}
            onClick={() => {
              setSelected(program);
              setSelectedDuration(program.durations[0]);
            }}
            className="flex-shrink-0 w-40 rounded-xl border border-border bg-card p-4 text-left hover:border-foreground/20 transition-all"
          >
            <span className="text-2xl">{program.emoji}</span>
            <p className="font-heading text-sm mt-2 leading-tight">{program.name}</p>
            <Badge variant="outline" className="mt-2 text-[9px] py-0 border-border text-muted-foreground">
              {program.category}
            </Badge>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {program.durations.join("/")} wk
            </div>
          </button>
        ))}
      </div>

      {/* Enrollment Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-sm">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-lg flex items-center gap-2">
                  <span className="text-2xl">{selected.emoji}</span> {selected.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 pt-2">
                <p className="text-sm text-muted-foreground">{selected.description}</p>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Program Length
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selected.durations.map((d) => (
                      <button
                        key={d}
                        onClick={() => setSelectedDuration(d)}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          selectedDuration === d
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-foreground/20"
                        }`}
                      >
                        {d} Weeks
                      </button>
                    ))}
                  </div>
                </div>

                {!questionnaire && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-destructive">
                      Complete your questionnaire first to enroll in a program.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    Personalized to your fitness level
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    Auto-populates your training calendar
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    Replaces current program
                  </div>
                </div>

                <Button
                  variant="apollo"
                  className="w-full"
                  onClick={handleEnroll}
                  disabled={enrolling || !questionnaire || !selectedDuration}
                >
                  {enrolling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Program...
                    </>
                  ) : (
                    `Start ${selectedDuration}-Week Program`
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainingProgramCards;
