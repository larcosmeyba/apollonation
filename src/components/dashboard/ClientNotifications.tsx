import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from "@/hooks/useMessages";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MessageSquare, ClipboardList, Camera, Dumbbell, X } from "lucide-react";
import { useState } from "react";

const ClientNotifications = () => {
  const { user, profile } = useAuth();
  const { unreadCount } = useMessages();
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Check if questionnaire exists
  const { data: hasQuestionnaire } = useQuery({
    queryKey: ["client-has-questionnaire", user?.id],
    queryFn: async () => {
      if (!user) return true;
      const { data } = await (supabase as any)
        .from("client_questionnaires")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // Check if training plan exists
  const { data: hasTrainingPlan } = useQuery({
    queryKey: ["client-has-training-plan", user?.id],
    queryFn: async () => {
      if (!user) return true;
      const { data } = await (supabase as any)
        .from("client_training_plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const alerts: { id: string; icon: typeof MessageSquare; message: string; link: string; action: string }[] = [];

  if (unreadCount > 0) {
    alerts.push({
      id: "unread-messages",
      icon: MessageSquare,
      message: `You have ${unreadCount} unread message${unreadCount > 1 ? "s" : ""} from your coach`,
      link: "/dashboard/messages",
      action: "View Messages",
    });
  }

  if (hasQuestionnaire === false) {
    alerts.push({
      id: "no-questionnaire",
      icon: ClipboardList,
      message: "Complete your questionnaire to get your personalized plan",
      link: "/questionnaire",
      action: "Start Now",
    });
  }

  if (!profile?.avatar_url) {
    alerts.push({
      id: "no-photo",
      icon: Camera,
      message: "Upload a profile photo to complete your profile",
      link: "/dashboard/profile",
      action: "Upload",
    });
  }

  if (hasTrainingPlan === false && hasQuestionnaire !== false) {
    alerts.push({
      id: "no-plan",
      icon: Dumbbell,
      message: "You don't have a training plan yet — one is being prepared",
      link: "/dashboard/training",
      action: "View Training",
    });
  }

  const visibleAlerts = alerts.filter((a) => !dismissed.includes(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className="relative card-glass px-4 py-3"
          style={{ borderColor: 'rgba(106,163,255,0.2)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <alert.icon className="w-4 h-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{alert.message}</p>
            </div>
            <Link to={alert.link}>
              <button className="text-xs font-semibold text-destructive hover:text-destructive/80 transition-colors whitespace-nowrap uppercase tracking-wider">
                {alert.action}
              </button>
            </Link>
            <button
              onClick={() => setDismissed((p) => [...p, alert.id])}
              className="p-1 rounded-md hover:bg-destructive/10 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ClientNotifications;
