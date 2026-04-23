import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle,
  Inbox,
  Users,
  Dumbbell,
  Utensils,
  TrendingUp,
  UserPlus,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, subDays } from "date-fns";

interface Props {
  onNavigate: (tab: string) => void;
}

const AdminDashboardHome = ({ onNavigate }: Props) => {
  // Unread contact requests
  const { data: unreadContacts = 0 } = useQuery({
    queryKey: ["admin-unread-contacts"],
    queryFn: async () => {
      const { count } = await supabase
        .from("contact_requests")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Clients without plans (excluding test accounts)
  const { data: clientsWithoutPlans = 0 } = useQuery({
    queryKey: ["admin-clients-no-plans"],
    queryFn: async () => {
      const { data: proEliteClients } = await supabase
        .from("profiles")
        .select("user_id, is_test_account")
        .in("subscription_tier", ["pro", "elite"])
        .eq("account_status", "active");
      const real = (proEliteClients || []).filter((c: any) => !c.is_test_account);
      if (!real.length) return 0;
      const { data: plans } = await supabase
        .from("client_training_plans")
        .select("user_id")
        .in("user_id", real.map((c) => c.user_id))
        .eq("status", "active");
      const usersWithPlans = new Set(plans?.map((p) => p.user_id));
      return real.filter((c) => !usersWithPlans.has(c.user_id)).length;
    },
    refetchInterval: 300000,
  });

  // Real (non-test) client ids — basis for all client-related stats
  const { data: realClientIds = [] } = useQuery({
    queryKey: ["admin-real-client-ids"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, is_test_account, account_status")
        .eq("account_status", "active");
      return (data || []).filter((c: any) => !c.is_test_account).map((c: any) => c.user_id) as string[];
    },
  });

  const totalClients = realClientIds.length;

  const { data: activeToday = 0 } = useQuery({
    queryKey: ["admin-active-today", realClientIds.length],
    enabled: realClientIds.length > 0,
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { count } = await supabase
        .from("workout_session_logs")
        .select("user_id", { count: "exact", head: true })
        .eq("log_date", today)
        .in("user_id", realClientIds);
      return count || 0;
    },
  });

  const { data: newSignups = 0 } = useQuery({
    queryKey: ["admin-new-signups"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data } = await supabase
        .from("profiles")
        .select("user_id, is_test_account, created_at")
        .gte("created_at", sevenDaysAgo);
      return (data || []).filter((p: any) => !p.is_test_account).length;
    },
  });

  const { data: workoutsCompleted = 0 } = useQuery({
    queryKey: ["admin-workouts-completed-today", realClientIds.length],
    enabled: realClientIds.length > 0,
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { count } = await supabase
        .from("workout_session_logs")
        .select("*", { count: "exact", head: true })
        .eq("log_date", today)
        .not("completed_at", "is", null)
        .in("user_id", realClientIds);
      return count || 0;
    },
  });

  // Recent clients (excluding test accounts)
  const { data: recentClients = [] } = useQuery({
    queryKey: ["admin-recent-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, subscription_tier, avatar_url, is_test_account")
        .eq("account_status", "active")
        .order("updated_at", { ascending: false })
        .limit(20);
      return (data || []).filter((c: any) => !c.is_test_account).slice(0, 8);
    },
  });

  // Alerts
  const alerts = [
    { icon: Inbox, label: "New contact requests", count: unreadContacts, tab: "contacts", color: "text-primary", bg: "bg-primary/10" },
    { icon: AlertCircle, label: "Clients without plans", count: clientsWithoutPlans, tab: "clients", color: "text-orange-400", bg: "bg-orange-500/10" },
  ].filter((a) => a.count > 0);

  const quickAccess = [
    { id: "workouts", icon: Dumbbell, title: "On-Demand Classes", desc: "Manage video workouts", color: "text-green-400" },
    { id: "recipes", icon: Utensils, title: "Recipes", desc: "Manage meal recipes", color: "text-yellow-400" },
    { id: "contacts", icon: Inbox, title: "Contact Requests", desc: "View new requests", color: "text-cyan-400" },
    { id: "clients", icon: Users, title: "Clients", desc: "Jump to client list", color: "text-blue-400" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page title */}
      <div>
        <h1 className="font-heading text-2xl tracking-wider">DASHBOARD</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back</p>
      </div>

      {/* ─── SECTION 1: ALERTS ─── */}
      {alerts.length > 0 && (
        <section>
          <h2 className="font-heading text-xs uppercase tracking-widest text-primary mb-3">Alerts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map((a) => (
              <button
                key={a.tab}
                onClick={() => onNavigate(a.tab)}
                className={`${a.bg} rounded-xl p-4 text-left hover:ring-1 hover:ring-border transition-all`}
              >
                <div className="flex items-center gap-3">
                  <a.icon className={`w-5 h-5 ${a.color}`} />
                  <div>
                    <p className="text-2xl font-heading">{a.count}</p>
                    <p className="text-xs text-muted-foreground">{a.label}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── SECTION 2: CLIENT STATS ─── */}
      <section>
        <h2 className="font-heading text-xs uppercase tracking-widest text-primary mb-3">Client Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Clients", value: totalClients, icon: Users, color: "text-blue-400" },
            { label: "Active Today", value: activeToday, icon: TrendingUp, color: "text-green-400" },
            { label: "Workouts Done", value: workoutsCompleted, icon: Dumbbell, color: "text-purple-400" },
            { label: "New Signups (7d)", value: newSignups, icon: UserPlus, color: "text-primary" },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="text-2xl font-heading">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── SECTION 3: RECENT CLIENT ACTIVITY ─── */}
      {recentClients.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xs uppercase tracking-widest text-primary">Recent Clients</h2>
            <button
              onClick={() => onNavigate("clients")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {recentClients.map((c) => (
              <Card
                key={c.user_id}
                onClick={() => onNavigate("clients")}
                className="bg-card border-border rounded-xl cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all"
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {c.display_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium truncate max-w-full">{c.display_name || "Client"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ─── SECTION 4: QUICK ACCESS TOOLS ─── */}
      <section>
        <h2 className="font-heading text-xs uppercase tracking-widest text-primary mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {quickAccess.map((q) => (
            <Card
              key={q.id}
              onClick={() => onNavigate(q.id)}
              className="bg-card border-border rounded-xl cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all group"
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  <q.icon className={`w-5 h-5 ${q.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{q.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{q.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardHome;
