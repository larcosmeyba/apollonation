import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Apple, Dumbbell, Sparkles, ChevronRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

/**
 * Hybrid onboarding nudge shown on the dashboard home AFTER the user
 * completes the General Questionnaire (which is gated by ProtectedRoute).
 *
 * Surfaces optional but encouraged setups for Fuel + My Plan so eager
 * users can fully personalize on Day 1. Per-tab gates remain as fallback.
 *
 * Auto-hides once both are complete or once the user dismisses it.
 */
const PersonalizationChecklist = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDismissed(localStorage.getItem(`personalize_dismissed_${user.id}`) === "1");
  }, [user]);

  const { data: status, isLoading } = useQuery({
    queryKey: ["personalization-status", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [fuel, plan] = await Promise.all([
        (supabase as any)
          .from("client_nutrition_questionnaires")
          .select("id")
          .eq("user_id", user!.id)
          .maybeSingle(),
        (supabase as any)
          .from("mw_questionnaire_responses")
          .select("id")
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);
      return {
        fuelDone: !!fuel.data,
        planDone: !!plan.data,
      };
    },
  });

  if (isLoading || !status || dismissed) return null;
  if (status.fuelDone && status.planDone) return null;

  const handleDismiss = () => {
    if (user) localStorage.setItem(`personalize_dismissed_${user.id}`, "1");
    setDismissed(true);
  };

  const items = [
    {
      key: "plan",
      done: status.planDone,
      icon: Dumbbell,
      title: "Build Your Training Plan",
      desc: "Tell us your goals, equipment, and schedule.",
      href: "/dashboard/training",
      eta: "2 min",
    },
    {
      key: "fuel",
      done: status.fuelDone,
      icon: Apple,
      title: "Set Up Your Fuel",
      desc: "Macros and meals tuned to your body.",
      href: "/dashboard/nutrition",
      eta: "3 min",
    },
  ];

  const completedCount = items.filter((i) => i.done).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/12 via-primary/4 to-transparent p-5 sm:p-6"
    >
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">
                Personalize • {completedCount}/{items.length}
              </span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl tracking-tight leading-tight mt-1.5">
              Unlock your full plan
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              A few quick questions so the AI builds your exact workouts and meals.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors uppercase tracking-wider"
          >
            Later
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const Wrapper: any = item.done ? "div" : Link;
            const wrapperProps = item.done ? {} : { to: item.href };
            return (
              <Wrapper
                key={item.key}
                {...wrapperProps}
                className={`group flex items-center gap-3 rounded-2xl border p-3.5 transition-all ${
                  item.done
                    ? "border-border/40 bg-card/40 opacity-60"
                    : "border-border/60 bg-card/80 hover:border-primary/40 hover:bg-card"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    item.done ? "bg-primary/15" : "bg-primary/10"
                  }`}
                >
                  {item.done ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Icon className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${item.done ? "line-through" : ""}`}>
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {item.done ? "Complete" : item.desc}
                  </p>
                </div>
                {!item.done && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {item.eta}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                )}
              </Wrapper>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};

export default PersonalizationChecklist;
