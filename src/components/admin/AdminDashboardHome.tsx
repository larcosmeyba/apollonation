import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle, Inbox, Users, Dumbbell, Utensils, MessageSquare,
  UserPlus, ChevronRight, Bug, LifeBuoy, Cake, Award, DollarSign,
  TrendingUp, PlayCircle, Trophy, Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, subDays, startOfDay, addDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

interface Props { onNavigate: (tab: string) => void; }

const AdminDashboardHome = ({ onNavigate }: Props) => {
  const { user } = useAuth();

  // ── Inbox counts ────────────────────────────────────────────────
  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ["admin-unread-messages", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase.from("messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", user!.id).eq("is_read", false);
      return count || 0;
    },
    refetchInterval: 30000,
  });
  const { data: unreadContacts = 0 } = useQuery({
    queryKey: ["admin-unread-contacts"],
    queryFn: async () => {
      const { count } = await supabase.from("contact_requests")
        .select("*", { count: "exact", head: true }).eq("is_read", false);
      return count || 0;
    },
    refetchInterval: 60000,
  });
  const { data: openTickets = { bugs: 0, support: 0 } } = useQuery({
    queryKey: ["admin-open-tickets"],
    queryFn: async () => {
      const { data } = await supabase.from("support_tickets")
        .select("type, status").neq("status", "closed");
      const rows = data || [];
      return {
        bugs: rows.filter((r: any) => r.type === "bug").length,
        support: rows.filter((r: any) => r.type !== "bug").length,
      };
    },
    refetchInterval: 60000,
  });
  const { data: clientsWithoutPlans = 0 } = useQuery({
    queryKey: ["admin-clients-no-plans"],
    queryFn: async () => {
      const { data: subs } = await supabase.from("profiles")
        .select("user_id, is_test_account").eq("is_subscribed", true).eq("account_status", "active");
      const real = (subs || []).filter((c: any) => !c.is_test_account);
      if (!real.length) return 0;
      const { data: plans } = await supabase.from("client_training_plans")
        .select("user_id").in("user_id", real.map(c => c.user_id)).eq("status", "active");
      const have = new Set(plans?.map(p => p.user_id));
      return real.filter(c => !have.has(c.user_id)).length;
    },
    refetchInterval: 300000,
  });

  // ── Signup graph: last 14 days ──────────────────────────────────
  const { data: signupSeries = [] } = useQuery({
    queryKey: ["admin-signup-series"],
    queryFn: async () => {
      const start = startOfDay(subDays(new Date(), 13)).toISOString();
      const { data } = await supabase.from("profiles")
        .select("created_at, is_test_account").gte("created_at", start);
      const buckets: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        buckets[d] = 0;
      }
      (data || []).filter((p: any) => !p.is_test_account).forEach((p: any) => {
        const d = format(new Date(p.created_at), "yyyy-MM-dd");
        if (d in buckets) buckets[d] += 1;
      });
      return Object.entries(buckets).map(([date, count]) => ({
        date: format(new Date(date), "MMM d"),
        count,
      }));
    },
    refetchInterval: 300000,
  });
  const signupsToday = signupSeries.length ? signupSeries[signupSeries.length - 1].count : 0;

  // ── New sign-ups list (last 7d) ─────────────────────────────────
  const { data: newSignups = [] } = useQuery({
    queryKey: ["admin-new-signups-list"],
    queryFn: async () => {
      const start = subDays(new Date(), 7).toISOString();
      const { data } = await supabase.from("profiles")
        .select("user_id, display_name, created_at, entitlement, subscription_plan, is_test_account, birthday")
        .gte("created_at", start).order("created_at", { ascending: false });
      return (data || []).filter((p: any) => !p.is_test_account);
    },
    refetchInterval: 300000,
  });

  // ── Upcoming milestones (next 30 days) ──────────────────────────
  const { data: milestones = [] } = useQuery({
    queryKey: ["admin-milestones"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("user_id, display_name, birthday, created_at, is_test_account, subscription_expires_at")
        .eq("account_status", "active");
      const today = new Date();
      const horizon = addDays(today, 30);
      const items: Array<{ type: string; label: string; date: Date; user_id: string; name: string }> = [];
      (data || []).filter((p: any) => !p.is_test_account).forEach((p: any) => {
        // birthday
        if (p.birthday) {
          const bd = new Date(p.birthday);
          const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
          if (next < startOfDay(today)) next.setFullYear(today.getFullYear() + 1);
          if (next <= horizon) items.push({
            type: "birthday", label: "Birthday",
            date: next, user_id: p.user_id, name: p.display_name || "Client",
          });
        }
        // membership anniversary (yearly)
        if (p.created_at) {
          const j = new Date(p.created_at);
          const next = new Date(today.getFullYear(), j.getMonth(), j.getDate());
          if (next < startOfDay(today)) next.setFullYear(today.getFullYear() + 1);
          const years = next.getFullYear() - j.getFullYear();
          if (years >= 1 && next <= horizon) items.push({
            type: "anniversary", label: `${years}yr Member`,
            date: next, user_id: p.user_id, name: p.display_name || "Client",
          });
        }
      });
      items.sort((a, b) => a.date.getTime() - b.date.getTime());
      return items.slice(0, 8);
    },
    refetchInterval: 600000,
  });

  // ── RevenueCat / subscription stats ─────────────────────────────
  const { data: rcStats } = useQuery({
    queryKey: ["admin-rc-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("revenuecat-stats");
      if (error) throw error;
      return data as { active_members: number; trial_users: number; cancellations: number; mrr: number };
    },
    refetchInterval: 600000,
  });

  // ── New members this week ───────────────────────────────────────
  const newThisWeek = signupSeries.slice(-7).reduce((s, d) => s + d.count, 0);

  // ── Most viewed on-demand classes (top 5, last 30d) ─────────────
  const { data: topClasses = [] } = useQuery({
    queryKey: ["admin-top-classes"],
    queryFn: async () => {
      const start = subDays(new Date(), 30).toISOString();
      const { data } = await supabase.from("user_workout_completions")
        .select("workout_id, completed_at").gte("completed_at", start).not("workout_id", "is", null);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { counts[r.workout_id] = (counts[r.workout_id] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!top.length) return [];
      const { data: workouts } = await supabase.from("workouts").select("id, title").in("id", top.map(t => t[0]));
      const titleMap = new Map((workouts || []).map((w: any) => [w.id, w.title]));
      return top.map(([id, count]) => ({ id, title: titleMap.get(id) || "Untitled", count }));
    },
    refetchInterval: 600000,
  });

  // ── Most completed programs ─────────────────────────────────────
  const { data: topPrograms = [] } = useQuery({
    queryKey: ["admin-top-programs"],
    queryFn: async () => {
      const { data } = await supabase.from("user_programs").select("program_id").eq("status", "completed");
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { counts[r.program_id] = (counts[r.program_id] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!top.length) return [];
      const { data: programs } = await supabase.from("program_blueprints").select("id, name").in("id", top.map(t => t[0]));
      const map = new Map((programs || []).map((p: any) => [p.id, p.name]));
      return top.map(([id, count]) => ({ id, name: map.get(id) || "Program", count }));
    },
    refetchInterval: 600000,
  });

  // ── Recent clients ──────────────────────────────────────────────
  const { data: recentClients = [] } = useQuery({
    queryKey: ["admin-recent-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles")
        .select("user_id, display_name, avatar_url, is_test_account")
        .eq("account_status", "active").order("updated_at", { ascending: false }).limit(20);
      return (data || []).filter((c: any) => !c.is_test_account).slice(0, 8);
    },
  });

  // ── Alerts (legacy "no plan" warning) ───────────────────────────
  const alerts = clientsWithoutPlans > 0 ? [{
    label: "Clients without plans", count: clientsWithoutPlans, tab: "clients",
  }] : [];

  // ── Unified Inbox tiles ─────────────────────────────────────────
  const inbox = [
    { icon: MessageSquare, label: "Messages", count: unreadMessages, tab: "messages", color: "text-primary" },
    { icon: Inbox, label: "Contact Requests", count: unreadContacts, tab: "contacts", color: "text-cyan-400" },
    { icon: Bug, label: "Bug Reports", count: openTickets.bugs, tab: "bugs", color: "text-red-400" },
    { icon: LifeBuoy, label: "Support Requests", count: openTickets.support, tab: "bugs", color: "text-amber-400" },
  ];

  const quickAccess = [
    { id: "workouts", icon: Dumbbell, title: "On-Demand Classes", desc: "Manage video workouts", color: "text-green-400" },
    { id: "recipes", icon: Utensils, title: "Recipes", desc: "Manage meal recipes", color: "text-yellow-400" },
    { id: "messages", icon: MessageSquare, title: "Messages", desc: "Reply to clients", color: "text-primary" },
    { id: "clients", icon: Users, title: "Clients", desc: "Roster + profiles", color: "text-blue-400" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-2xl tracking-wider">DASHBOARD</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back</p>
      </div>

      {/* ── Signup graph + today's count ── */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="font-heading text-xs uppercase tracking-widest text-primary">Sign-Ups · Last 14 Days</h2>
          <div className="text-right">
            <p className="text-3xl font-heading leading-none">{signupsToday}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Today</p>
          </div>
        </div>
        <Card className="bg-card border-border rounded-xl">
          <CardContent className="p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signupSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* ── Inbox ── */}
      <section>
        <h2 className="font-heading text-xs uppercase tracking-widest text-primary mb-3">Inbox</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {inbox.map(i => (
            <button key={i.label} onClick={() => onNavigate(i.tab)}
              className="bg-card border border-border rounded-xl p-4 text-left hover:ring-1 hover:ring-primary/30 transition-all">
              <div className="flex items-center gap-3">
                <i.icon className={`w-5 h-5 ${i.color}`} />
                <div>
                  <p className="text-2xl font-heading">{i.count}</p>
                  <p className="text-xs text-muted-foreground">{i.label}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {alerts.length > 0 && (
        <section>
          <h2 className="font-heading text-xs uppercase tracking-widest text-orange-400 mb-3">Alerts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map(a => (
              <button key={a.tab} onClick={() => onNavigate(a.tab)}
                className="bg-orange-500/10 rounded-xl p-4 text-left hover:ring-1 hover:ring-border transition-all">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-400" />
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

      {/* ── Business Metrics ── */}
      <section>
        <h2 className="font-heading text-xs uppercase tracking-widest text-primary mb-3">Business Metrics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Active Members", value: rcStats?.active_members ?? "—", icon: Users, color: "text-blue-400" },
            { label: "New This Week", value: newThisWeek, icon: UserPlus, color: "text-green-400" },
            { label: "MRR (est)", value: rcStats ? `$${rcStats.mrr.toLocaleString()}` : "—", icon: DollarSign, color: "text-emerald-400" },
            { label: "Trial Users", value: rcStats?.trial_users ?? "—", icon: TrendingUp, color: "text-yellow-400" },
            { label: "Cancellations", value: rcStats?.cancellations ?? "—", icon: AlertCircle, color: "text-red-400" },
          ].map(s => (
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
        <p className="text-[10px] text-muted-foreground mt-2">
          MRR is estimated from active subscriptions ($29.99/mo, $249.99/yr). Subscription billing is managed via Apple/Google IAP.
        </p>
      </section>

      {/* ── Milestones ── */}
      {milestones.length > 0 && (
        <section>
          <h2 className="font-heading text-xs uppercase tracking-widest text-primary mb-3">Upcoming Milestones (30 days)</h2>
          <Card className="bg-card border-border rounded-xl">
            <CardContent className="p-0 divide-y divide-border">
              {milestones.map((m, i) => (
                <button key={i} onClick={() => onNavigate("clients")}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 text-left transition-colors">
                  {m.type === "birthday"
                    ? <Cake className="w-4 h-4 text-pink-400 flex-shrink-0" />
                    : <Award className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.label} · {format(m.date, "MMM d")}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── New Sign-Ups (7d) ── */}
      {newSignups.length > 0 && (
        <section>
          <h2 className="font-heading text-xs uppercase tracking-widest text-primary mb-3">New Sign-Ups (7 days)</h2>
          <Card className="bg-card border-border rounded-xl">
            <CardContent className="p-0 divide-y divide-border">
              {newSignups.slice(0, 10).map((s: any) => (
                <button key={s.user_id} onClick={() => onNavigate("clients")}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 text-left transition-colors">
                  <Avatar className="w-8 h-8"><AvatarFallback className="bg-primary/20 text-primary text-xs">{(s.display_name || "?").charAt(0)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{s.display_name || "Client"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(s.created_at), "MMM d")} · {s.entitlement || s.subscription_plan || "free"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Top Classes & Programs ── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="bg-card border-border rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <PlayCircle className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs uppercase tracking-widest text-primary font-heading">Most Viewed Classes (30d)</h3>
            </div>
            {topClasses.length === 0
              ? <p className="text-xs text-muted-foreground">No completions yet.</p>
              : <ul className="space-y-2">
                  {topClasses.map((c: any, i: number) => (
                    <li key={c.id} className="flex items-center justify-between text-sm">
                      <span className="truncate"><span className="text-muted-foreground mr-2">{i + 1}.</span>{c.title}</span>
                      <span className="text-xs text-muted-foreground">{c.count}</span>
                    </li>
                  ))}
                </ul>}
          </CardContent>
        </Card>
        <Card className="bg-card border-border rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <h3 className="text-xs uppercase tracking-widest text-primary font-heading">Most Completed Programs</h3>
            </div>
            {topPrograms.length === 0
              ? <p className="text-xs text-muted-foreground">No program completions yet.</p>
              : <ul className="space-y-2">
                  {topPrograms.map((p: any, i: number) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="truncate"><span className="text-muted-foreground mr-2">{i + 1}.</span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.count}</span>
                    </li>
                  ))}
                </ul>}
          </CardContent>
        </Card>
      </section>

      {/* ── Recent Clients ── */}
      {recentClients.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-xs uppercase tracking-widest text-primary">Recent Clients</h2>
            <button onClick={() => onNavigate("clients")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {recentClients.map((c: any) => (
              <Card key={c.user_id} onClick={() => onNavigate("clients")}
                className="bg-card border-border rounded-xl cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {c.display_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium truncate max-w-full">{c.display_name || "Client"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick Access ── */}
      <section>
        <h2 className="font-heading text-xs uppercase tracking-widest text-primary mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickAccess.map(q => (
            <Card key={q.id} onClick={() => onNavigate(q.id)}
              className="bg-card border-border rounded-xl cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all group">
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
