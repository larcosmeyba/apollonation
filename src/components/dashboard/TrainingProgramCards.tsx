import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessControl } from "@/hooks/useAccessControl";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Clock, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Fallback images for categories
import imgStrength from "@/assets/program-strength.jpg";
import imgRunning from "@/assets/program-running.jpg";
import imgHiit from "@/assets/program-hiit.jpg";
import imgRecovery from "@/assets/program-recovery.jpg";
import imgCardio from "@/assets/program-cardio.jpg";
import imgHome from "@/assets/program-home.jpg";

const FALLBACK_IMAGES: Record<string, string> = {
  strength: imgStrength,
  running: imgRunning,
  hiit: imgHiit,
  recovery: imgRecovery,
  cardio: imgCardio,
  home: imgHome,
  default: imgStrength,
};

const getFallbackImage = (category: string) => {
  const key = category.toLowerCase();
  for (const [k, v] of Object.entries(FALLBACK_IMAGES)) {
    if (key.includes(k)) return v;
  }
  return FALLBACK_IMAGES.default;
};

interface Program {
  id: string;
  name: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  durations: number[];
}

const TrainingProgramCards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canAccessPrograms } = useAccessControl();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Program | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["programs-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("programs")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as Program[];
    },
  });

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
      await (supabase as any)
        .from("client_training_plans")
        .update({ status: "archived" })
        .eq("user_id", user.id)
        .eq("status", "active");

      await (supabase as any)
        .from("client_questionnaires")
        .update({ goal_next_4_weeks: selected.name })
        .eq("id", questionnaire.id);

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
        title: `Enrolled in ${selected.name}!`,
        description: `Your ${selectedDuration}-week program is being generated.`,
      });
      setSelected(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to enroll", variant: "destructive" });
    } finally {
      setEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="font-heading text-lg tracking-wide">Browse Programs</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-52 h-72 rounded-2xl bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (programs.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-heading text-lg tracking-wide">Programs</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Expert-designed training programs</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {programs.map((program) => {
          const coverImg = program.cover_image_url || getFallbackImage(program.category);

          return (
            <button
              key={program.id}
              onClick={() => {
                if (!canAccessPrograms) {
                  navigate("/subscribe?reason=programs");
                  return;
                }
                setSelected(program);
                setSelectedDuration(program.durations[0]);
              }}
              className="flex-shrink-0 w-52 rounded-2xl overflow-hidden relative group text-left border border-border hover:border-foreground/20 transition-all"
            >
              {/* Cover Image */}
              <div className="relative h-72">
                <img
                  src={coverImg}
                  alt={program.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* Category badge */}
                <div className="absolute top-3 left-3">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-white/70 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    {program.category}
                  </span>
                </div>

                {/* Duration */}
                <div className="absolute top-3 right-3 flex items-center gap-1 text-white/60">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-medium">
                    {program.durations.join("/")} wk
                  </span>
                </div>

                {/* Text content at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-heading text-base text-white leading-tight mb-1">
                    {program.name}
                  </h3>
                  {program.description && (
                    <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                      {program.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-3 text-[10px] text-white/50 font-medium uppercase tracking-wider group-hover:text-white/80 transition-colors">
                    Start Program <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Enrollment Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-sm">
          {selected && (
            <>
              {/* Program cover in dialog */}
              <div className="relative -mx-6 -mt-6 h-44 overflow-hidden rounded-t-lg">
                <img
                  src={selected.cover_image_url || getFallbackImage(selected.category)}
                  alt={selected.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
                <div className="absolute bottom-4 left-6">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-foreground/60">{selected.category}</span>
                  <h3 className="font-heading text-xl text-foreground">{selected.name}</h3>
                </div>
              </div>

              <div className="space-y-5 pt-4">
                {selected.description && (
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                )}

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
