import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationPreferences {
  workout_reminders: boolean;
  meal_reminders: boolean;
  coach_messages: boolean;
  weekly_summary: boolean;
}

const DEFAULTS: NotificationPreferences = {
  workout_reminders: true,
  meal_reminders: true,
  coach_messages: true,
  weekly_summary: true,
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notification-preferences", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NotificationPreferences> => {
      if (!user) return DEFAULTS;
      const { data, error } = await supabase
        .from("user_notification_preferences")
        .select("workout_reminders, meal_reminders, coach_messages, weekly_summary")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("useNotificationPreferences:", error);
        return DEFAULTS;
      }
      return {
        workout_reminders: data?.workout_reminders ?? true,
        meal_reminders: data?.meal_reminders ?? true,
        coach_messages: data?.coach_messages ?? true,
        weekly_summary: data?.weekly_summary ?? true,
      };
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_notification_preferences")
        .upsert(
          { user_id: user.id, ...patch },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
  });

  return {
    preferences: query.data ?? DEFAULTS,
    loading: query.isLoading,
    update,
  };
};
