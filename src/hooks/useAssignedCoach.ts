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
      const { data: assignment, error } = await supabase
        .from("coach_client_assignments")
        .select("coach_user_id")
        .eq("client_user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("useAssignedCoach: assignment lookup failed", error);
        return null;
      }
      if (!assignment?.coach_user_id) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .eq("user_id", assignment.coach_user_id)
        .maybeSingle();

      return profile
        ? {
            user_id: profile.user_id,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          }
        : { user_id: assignment.coach_user_id, display_name: null, avatar_url: null };
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
