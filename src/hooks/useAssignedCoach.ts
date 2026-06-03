import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";

export interface AssignedCoach {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface AssignedClient {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Returns the current user's assigned coach (for clients)
 * or all assigned clients (for admins/coaches).
 */
export const useAssignedCoach = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  const coachQuery = useQuery({
    queryKey: ["assigned-coach", user?.id],
    enabled: !!user && !adminLoading && !isAdmin,
    queryFn: async (): Promise<AssignedCoach | null> => {
      if (!user) return null;
      // Safe RPC returns only display_name/avatar_url/bio for the assigned
      // coach — no subscription/billing columns are exposed cross-user.
      const { data, error } = await (supabase.rpc as any)("get_assigned_coach_profile");
      if (error) {
        console.error("useAssignedCoach: rpc failed", error);
        return null;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.user_id) return null;
      return {
        user_id: row.user_id,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
      };
    },
  });

  const clientsQuery = useQuery({
    queryKey: ["assigned-clients", user?.id],
    enabled: !!user && !adminLoading && isAdmin,
    queryFn: async (): Promise<AssignedClient[]> => {
      if (!user) return [];
      const { data: assignments, error } = await supabase
        .from("coach_client_assignments")
        .select("client_user_id")
        .eq("coach_user_id", user.id);
      if (error || !assignments?.length) return [];

      const ids = assignments.map((a) => a.client_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);

      return (profiles || []).map((p) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      }));
    },
  });

  return {
    isAdmin,
    coach: coachQuery.data ?? null,
    clients: clientsQuery.data ?? [],
    loading: adminLoading || coachQuery.isLoading || clientsQuery.isLoading,
  };
};
