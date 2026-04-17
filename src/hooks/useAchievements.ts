import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UnlockedAchievement {
  achievement_id: string;
  achievement_title: string;
  unlocked_at: string;
  is_seen: boolean;
}

export const useAchievementsUnlocked = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-achievements", user?.id],
    queryFn: async (): Promise<UnlockedAchievement[]> => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("user_achievements")
        .select("achievement_id, achievement_title, unlocked_at, is_seen")
        .eq("user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });
};

/**
 * Diff a list of currently-earned achievement ids vs persisted ones.
 * Inserts any new unlocks and returns the freshly-unlocked items so the UI can celebrate.
 */
export const usePersistAchievements = (
  earned: { id: string; title: string }[]
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: unlocked = [] } = useAchievementsUnlocked();
  const [justUnlocked, setJustUnlocked] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!user || earned.length === 0) return;
    const known = new Set(unlocked.map((u) => u.achievement_id));
    const fresh = earned.filter((e) => !known.has(e.id));
    if (fresh.length === 0) return;

    (supabase as any)
      .from("user_achievements")
      .insert(
        fresh.map((f) => ({
          user_id: user.id,
          achievement_id: f.id,
          achievement_title: f.title,
        }))
      )
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["user-achievements", user.id] });
        setJustUnlocked(fresh);
      });
  }, [user, earned, unlocked, queryClient]);

  const dismiss = () => setJustUnlocked([]);
  return { justUnlocked, dismiss };
};
