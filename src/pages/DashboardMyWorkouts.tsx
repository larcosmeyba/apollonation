import { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Lock, Sparkles, ChevronRight, Check, Dumbbell } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMyWorkoutsAccess } from "@/hooks/useMyWorkoutsAccess";
import { useNavigate } from "react-router-dom";

const DashboardMyWorkouts = () => {
  // Route is gated in App.tsx for native — no in-component guard (would violate Rules of Hooks).
  const { user } = useAuth();
  const navigate = useNavigate();
  const access = useMyWorkoutsAccess();

  // Start the trial the moment a non-subscriber lands here.
  useEffect(() => {
    if (!access.loading && !access.hasPremium && !access.trialStartedAt) {
      access.ensureTrialStarted();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.loading, access.hasPremium, access.trialStartedAt]);

  const { data: existing, isLoading: qLoading } = useQuery({
    queryKey: ["mw_questionnaire_responses", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mw_questionnaire_responses")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) {
        console.error("[my-workouts] load questionnaire", error.message);
        return null;
      }
      return data;
    },
  });


  // ---- Render gates ----
  if (access.loading || qLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Trial expired and not premium → paywall
  if (access.trialExpired) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto py-12 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-heading font-bold">Your 7-day trial is up</h1>
          <p className="text-foreground/60 max-w-md mx-auto">
            You've seen what My Workouts can do. Subscribe to keep generating plans, logging
            sessions, and training with your coach in your pocket.
          </p>
          <Button size="lg" onClick={() => navigate("/subscribe")} className="min-w-48">
            See plans
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Trial banner */}
        {!access.hasPremium && access.trialActive && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between gap-3 px-4 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-sm"
          >
            <div className="flex items-center gap-2 text-foreground/80">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>
                Day {access.dayNumber} of 7 free —{" "}
                {access.daysRemaining <= 1 ? "less than a day left" : `${access.daysRemaining} days left`}
              </span>
            </div>
            <button
              onClick={() => navigate("/subscribe")}
              className="text-primary text-xs font-semibold uppercase tracking-wider"
            >
              Upgrade
            </button>
          </motion.div>
        )}

        {existing ? (
          <PlanPlaceholder onRestart={() => navigate("/dashboard/personalize")} />
        ) : (
          <PlanIntroCard onStart={() => navigate("/dashboard/personalize")} />
        )}
      </div>
    </DashboardLayout>
  );
};

const PlanIntroCard = ({ onStart }: { onStart: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
  >
    <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
    <div className="relative space-y-6">
      <div className="flex items-center gap-2">
        <Dumbbell className="w-4 h-4 text-primary" />
        <span className="text-[11px] uppercase tracking-[0.25em] text-primary">Personalized Training</span>
      </div>
      <h1 className="font-heading text-3xl md:text-4xl tracking-tight leading-tight">
        Build Your <span className="text-primary">Personalized Plan</span>
      </h1>
      <p className="text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">
        Answer a few questions so Apollo Reborn can create your personalized training experience.
      </p>
      <Button onClick={onStart} variant="apollo" className="rounded-full gap-2 px-6">
        Start Questionnaire <ChevronRight className="w-4 h-4" />
      </Button>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-border/30">
        {[
          "Training split",
          "On-demand workouts",
          "Recovery content",
          "Equipment match",
        ].map((t) => (
          <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>{t}</span>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

// Temporary placeholder — Step 3 will replace this with the real plan dashboard.
const PlanPlaceholder = ({ onRestart }: { onRestart: () => void }) => (
  <div className="py-16 text-center space-y-6">
    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mx-auto">
      <Sparkles className="w-6 h-6" />
    </div>
    <h1 className="text-3xl font-heading font-bold">Your answers are saved</h1>
    <p className="text-foreground/60 max-w-md mx-auto">
      Plan generation is coming next. We'll turn your goals, equipment, and schedule into a real
      week-by-week program here.
    </p>
    <Button variant="outline" onClick={onRestart}>
      Retake questionnaire
    </Button>
  </div>
);

export default DashboardMyWorkouts;
