import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useProfileLookup = (userIds: string[]) => {
  return useQuery({
    queryKey: ["profile-lookup", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return {};

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, subscription_tier")
        .in("user_id", userIds);

      if (error) throw error;

      const map: Record<string, { display_name: string | null; avatar_url: string | null; subscription_tier: string }> = {};
      data?.forEach((p) => {
        map[p.user_id] = {
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          subscription_tier: p.subscription_tier,
        };
      });
      return map;
    },
    enabled: userIds.length > 0,
  });
};
