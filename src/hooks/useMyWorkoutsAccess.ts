// Trial + paywall gating for the My Workouts module (web-only).
// Subscribers always pass. Non-subscribers get a 7-day trial starting on first open.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessControl } from "./useAccessControl";

export interface MyWorkoutsAccess {
  loading: boolean;
  hasPremium: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  trialActive: boolean;
  trialExpired: boolean;
  daysRemaining: number;
  dayNumber: number; // 1..7 during trial
  ensureTrialStarted: () => Promise<void>;
}

export function useMyWorkoutsAccess(): MyWorkoutsAccess {
  const { user } = useAuth();
  const { hasPremiumAccess } = useAccessControl();
  const qc = useQueryClient();
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["mw_trial_status", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mw_trial_status")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("[useMyWorkoutsAccess]", error.message);
        return null;
      }
      return data;
    },
  });

  const trialStartedAt = data?.trial_started_at ? new Date(data.trial_started_at) : null;
  const trialEndsAt = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;
  const now = Date.now();
  const trialActive = !!trialEndsAt && trialEndsAt.getTime() > now;
  const trialExpired = !!trialEndsAt && trialEndsAt.getTime() <= now;
  const msRemaining = trialEndsAt ? Math.max(0, trialEndsAt.getTime() - now) : 0;
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  const dayNumber = trialStartedAt
    ? Math.min(7, Math.max(1, Math.ceil((now - trialStartedAt.getTime()) / (1000 * 60 * 60 * 24)) || 1))
    : 1;

  const ensureTrialStarted = async () => {
    if (!userId || hasPremiumAccess || data) return;
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { error } = await (supabase as any).from("mw_trial_status").insert({
      user_id: userId,
      trial_started_at: startedAt.toISOString(),
      trial_ends_at: endsAt.toISOString(),
    });
    if (error && !error.message.includes("duplicate")) {
      console.error("[useMyWorkoutsAccess] start trial", error.message);
    }
    qc.invalidateQueries({ queryKey: ["mw_trial_status", userId] });
  };

  return {
    loading: !!userId && isLoading,
    hasPremium: hasPremiumAccess,
    trialStartedAt,
    trialEndsAt,
    trialActive: hasPremiumAccess || trialActive,
    trialExpired: !hasPremiumAccess && trialExpired,
    daysRemaining,
    dayNumber,
    ensureTrialStarted,
  };
}
