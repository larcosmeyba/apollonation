import { useAuth } from "@/contexts/AuthContext";
import { useFitnessProfile } from "@/hooks/useFitnessProfile";
import { Link } from "react-router-dom";
import { Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Single CTA shown on the dashboard until the user completes the unified
 * 20-question onboarding (training + nutrition + lifestyle in one go).
 * Auto-hides once `onboarding_completed` is true on user_fitness_profile,
 * or when the user dismisses it.
 */
const PersonalizationChecklist = () => {
  const { user } = useAuth();
  const { profile, loading } = useFitnessProfile();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDismissed(localStorage.getItem(`personalize_dismissed_${user.id}`) === "1");
  }, [user]);

  if (loading || !profile) return null;
  if (profile.onboarding_completed) return null;
  if (dismissed) return null;

  const handleDismiss = () => {
    if (user) localStorage.setItem(`personalize_dismissed_${user.id}`, "1");
    setDismissed(true);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl p-5 sm:p-6"
      style={{
        background:
          "linear-gradient(180deg, hsl(220 14% 11%) 0%, hsl(220 16% 7%) 100%)",
        border: "1px solid hsl(0 0% 100% / 0.08)",
        boxShadow: [
          "0 0 60px hsl(0 0% 100% / 0.06)",
          "0 20px 60px hsl(0 0% 0% / 0.6)",
          "inset 0 1px 0 hsl(0 0% 100% / 0.18)",
          "inset 0 0 40px hsl(0 0% 100% / 0.04)",
        ].join(", "),
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.55) 50%, transparent 100%)",
        }}
      />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">
                Personalize
              </span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl tracking-tight leading-tight mt-1.5">
              Unlock your full plan
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              20 quick questions and Apollo builds your workouts, meals, macros,
              and schedule in one shot.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors uppercase tracking-wider"
          >
            Later
          </button>
        </div>

        <Link
          to="/dashboard/personalize"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 hover:bg-primary/15 transition-all"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight">
              Build my plan
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Takes about 2 minutes · all questions up front
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
              2 min
            </span>
            <ChevronRight className="w-4 h-4 text-primary transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>
    </motion.section>
  );
};

export default PersonalizationChecklist;
