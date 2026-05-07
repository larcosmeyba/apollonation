import { useEffect, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import MyWorkoutsQuestionnaire, {
  QuestionnairePayload,
} from "@/components/dashboard/MyWorkoutsQuestionnaire";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isWeb } from "@/lib/platform";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMyWorkoutsAccess } from "@/hooks/useMyWorkoutsAccess";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const DashboardMyWorkouts = () => {
  // Route is gated in App.tsx for native — no in-component guard (would violate Rules of Hooks).
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const access = useMyWorkoutsAccess();
  const [submitting, setSubmitting] = useState(false);

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

  const handleComplete = async (payload: QuestionnairePayload) => {
    if (!user?.id) return;
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from("mw_questionnaire_responses")
      .upsert(
        {
          user_id: user.id,
          ...payload,
        },
        { onConflict: "user_id" }
      );
    setSubmitting(false);
    if (error) {
      toast({
        title: "Could not save",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    qc.invalidateQueries({ queryKey: ["mw_questionnaire_responses", user.id] });
    toast({ title: "Saved", description: "Building your plan next." });
  };

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
          <PlanPlaceholder onRestart={() => qc.removeQueries({ queryKey: ["mw_questionnaire_responses", user?.id] })} />
        ) : (
          <MyWorkoutsQuestionnaire onComplete={handleComplete} submitting={submitting} />
        )}
      </div>
    </DashboardLayout>
  );
};

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
