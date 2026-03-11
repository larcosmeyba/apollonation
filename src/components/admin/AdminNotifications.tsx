import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from "@/hooks/useMessages";
import { MessageSquare, AlertCircle, Inbox, Bell } from "lucide-react";

interface Props {
  onNavigate: (tab: string) => void;
}

const AdminNotifications = ({ onNavigate }: Props) => {
  const { unreadCount } = useMessages();

  // Unread contact requests
  const { data: unreadContacts } = useQuery({
    queryKey: ["admin-unread-contacts"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contact_requests")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Clients without training plans (pro/elite)
  const { data: clientsWithoutPlans } = useQuery({
    queryKey: ["admin-clients-no-plans"],
    queryFn: async () => {
      const { data: proEliteClients, error: clientsError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("subscription_tier", ["pro", "elite"])
        .eq("account_status", "active");
      if (clientsError) throw clientsError;
      if (!proEliteClients?.length) return 0;

      const { data: plans, error: plansError } = await supabase
        .from("client_training_plans")
        .select("user_id")
        .in("user_id", proEliteClients.map(c => c.user_id))
        .eq("status", "active");
      if (plansError) throw plansError;

      const usersWithPlans = new Set(plans?.map(p => p.user_id));
      return proEliteClients.filter(c => !usersWithPlans.has(c.user_id)).length;
    },
    refetchInterval: 300000,
  });

  const notifications = [
    {
      id: "messages",
      icon: MessageSquare,
      label: "Unread messages",
      count: unreadCount,
      tab: "messages",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      id: "contacts",
      icon: Inbox,
      label: "New contact requests",
      count: unreadContacts || 0,
      tab: "contacts",
      color: "text-apollo-gold",
      bg: "bg-apollo-gold/10",
    },
    {
      id: "plans",
      icon: AlertCircle,
      label: "Clients without active plans",
      count: clientsWithoutPlans || 0,
      tab: "clients",
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
  ].filter(n => n.count > 0);

  if (notifications.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-apollo-gold" />
        <h3 className="font-heading text-sm uppercase tracking-wider text-apollo-gold">Notifications</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => onNavigate(n.tab)}
            className={`${n.bg} rounded-lg p-4 text-left hover:opacity-80 transition-all border border-transparent hover:border-border`}
          >
            <div className="flex items-center gap-3">
              <n.icon className={`w-5 h-5 ${n.color}`} />
              <div>
                <p className="text-2xl font-heading">{n.count}</p>
                <p className="text-xs text-muted-foreground">{n.label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminNotifications;
