import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";

export const useProfileLookup = (userIds: string[]) => {
  const { isAdmin } = useAdminStatus();

  return useQuery({
    queryKey: ["profile-lookup", userIds, isAdmin],
    queryFn: async () => {
      if (userIds.length === 0) return {};

      const map: Record<string, { display_name: string | null; avatar_url: string | null; subscription_tier: string }> = {};

      if (isAdmin) {
        // Admins can query profiles directly via RLS
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, subscription_tier")
          .in("user_id", userIds);

        if (error) throw error;
        data?.forEach((p) => {
          map[p.user_id] = {
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            subscription_tier: p.subscription_tier,
          };
        });
      } else {
        // Regular users use the secure RPC that only returns display_name for message partners
        const { data, error } = await supabase.rpc("get_message_partner_profiles", {
          partner_ids: userIds,
        });

        if (error) throw error;
        (data as { user_id: string; display_name: string | null }[] | null)?.forEach((p) => {
          map[p.user_id] = {
            display_name: p.display_name,
            avatar_url: null,
            subscription_tier: "basic",
          };
        });
      }

      return map;
    },
    enabled: userIds.length > 0,
  });
};
