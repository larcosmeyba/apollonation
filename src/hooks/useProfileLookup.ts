import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";

export const useProfileLookup = (userIds: string[]) => {
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  return useQuery({
    queryKey: ["profile-lookup", userIds, isAdmin],
    retry: false,
    queryFn: async () => {
      if (userIds.length === 0) return {};

      const map: Record<string, { display_name: string | null; avatar_url: string | null; is_subscribed: boolean }> = {};

      try {
        if (isAdmin) {
          const { data } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, is_subscribed")
            .in("user_id", userIds);

          data?.forEach((p) => {
            map[p.user_id] = {
              display_name: p.display_name,
              avatar_url: p.avatar_url,
              is_subscribed: !!p.is_subscribed,
            };
          });
        } else {
          const { data } = await supabase.rpc("get_message_partner_profiles", {
            partner_ids: userIds,
          });

          (data as { user_id: string; display_name: string | null }[] | null)?.forEach((p) => {
            map[p.user_id] = {
              display_name: p.display_name,
              avatar_url: null,
              is_subscribed: false,
            };
          });
        }
      } catch (e) {
        console.error("[useProfileLookup] failed, returning empty map", e);
      }

      return map;
    },
    enabled: userIds.length > 0 && !adminLoading,
  });
};
