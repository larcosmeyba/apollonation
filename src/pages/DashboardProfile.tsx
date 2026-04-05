import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Save, LogOut, ChevronRight, Settings, HelpCircle, FileText, Shield, Instagram, Music2, Star, Dumbbell, Heart, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import ProfileAvatarUpload from "@/components/dashboard/ProfileAvatarUpload";

const DashboardProfile = () => {
  const { profile, refreshProfile, user, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");

  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    fitness_goals: profile?.fitness_goals || "",
  });

  // Weekly activity data
  const { data: weeklyActivity } = useQuery({
    queryKey: ["profile-weekly", user?.id],
    queryFn: async () => {
      if (!user) return { activeDays: 0, totalWorkouts: 0 };
      const today = new Date();
      const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), "yyyy-MM-dd"));
      const { data: sessions } = await supabase
        .from("workout_session_logs")
        .select("log_date")
        .eq("user_id", user.id)
        .gte("log_date", last7[0]);
      const dates = new Set((sessions || []).map((s: any) => s.log_date));
      return { activeDays: dates.size, totalWorkouts: sessions?.length || 0 };
    },
    enabled: !!user,
  });

  // Total completed workouts
  const { data: totalStats } = useQuery({
    queryKey: ["profile-total-stats", user?.id],
    queryFn: async () => {
      if (!user) return { workouts: 0, favorites: 0 };
      const [workouts, favorites] = await Promise.all([
        supabase.from("workout_session_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      return { workouts: workouts.count || 0, favorites: favorites.count || 0 };
    },
    enabled: !!user,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    setIsLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: formData.display_name, bio: formData.bio, fitness_goals: formData.fitness_goals })
      .eq("id", profile.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profile updated" });
    }
    setIsLoading(false);
  };

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    return { label: format(d, "EEE").charAt(0), date: format(d, "d"), full: format(d, "yyyy-MM-dd"), isToday: i === 6 };
  });

  const tabs = [
    { id: "activity", label: "Activity" },
    { id: "completed", label: "Completed" },
    { id: "favorites", label: "Favorites" },
    { id: "settings", label: "Settings" },
  ];

  const achievements = [
    { icon: Star, label: "1st Workout", unlocked: (totalStats?.workouts || 0) >= 1 },
    { icon: Dumbbell, label: "10 Workouts", unlocked: (totalStats?.workouts || 0) >= 10 },
    { icon: Trophy, label: "50 Workouts", unlocked: (totalStats?.workouts || 0) >= 50 },
    { icon: Heart, label: "100 Workouts", unlocked: (totalStats?.workouts || 0) >= 100 },
  ];

  const MenuLink = ({ icon: Icon, label, to }: { icon: any; label: string; to: string }) => (
    <Link to={to} className="flex items-center justify-between py-3.5 border-b border-border/40 group">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-foreground group-hover:text-accent transition-colors">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
    </Link>
  );

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-0">

        {/* Profile Header - dark hero banner */}
        <div className="rounded-2xl overflow-hidden border border-border bg-gradient-to-b from-card to-background p-6 pb-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <ProfileAvatarUpload />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
            </div>
            <div>
              <h1 className="font-heading text-2xl text-foreground">{profile?.display_name || "Member"}</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-green-400">Online</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-5">
            <div>
              <p className="text-xs text-muted-foreground">Total Points</p>
              <p className="text-2xl font-heading text-foreground">{(totalStats?.workouts || 0) * 10}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Workouts</p>
              <p className="text-2xl font-heading text-foreground">{totalStats?.workouts || 0}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-border mt-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-foreground border-accent"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="py-5 space-y-5">
          {activeTab === "activity" && (
            <>
              {/* Weekly Activity */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-heading text-sm text-foreground mb-3">Weekly Activity</h3>
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Active Days</p>
                      <p className="text-3xl font-heading text-foreground">{weeklyActivity?.activeDays || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {weekDays.map((d) => (
                      <div key={d.full} className="flex flex-col items-center gap-1.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium ${
                          d.isToday
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {d.date}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading text-sm text-foreground">Achievements</h3>
                  <span className="text-xs text-muted-foreground">View All</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                  {achievements.map((a) => (
                    <div key={a.label} className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
                        a.unlocked
                          ? "bg-accent/10 border-accent/30"
                          : "bg-muted border-border"
                      }`}>
                        <a.icon className={`w-7 h-7 ${a.unlocked ? "text-accent" : "text-muted-foreground/40"}`} />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center w-16 truncate">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "completed" && (
            <div className="text-center py-8">
              <Dumbbell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {totalStats?.workouts || 0} workouts completed
              </p>
            </div>
          )}

          {activeTab === "favorites" && (
            <div className="text-center py-8">
              <Heart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {totalStats?.favorites || 0} favorites saved
              </p>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4">
              {/* Edit Profile */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Personal Information</p>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Display Name</Label>
                    <Input value={formData.display_name} onChange={(e) => setFormData(p => ({ ...p, display_name: e.target.value }))} className="bg-muted border-border" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bio</Label>
                    <Textarea value={formData.bio} onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))} rows={2} className="bg-muted border-border resize-none" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fitness Goals</Label>
                    <Textarea value={formData.fitness_goals} onChange={(e) => setFormData(p => ({ ...p, fitness_goals: e.target.value }))} rows={2} className="bg-muted border-border resize-none" />
                  </div>
                  <Button type="submit" variant="apollo" disabled={isLoading} className="w-full text-xs">
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </div>

              {/* Menu Links */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Company</p>
                <MenuLink icon={FileText} label="About" to="#" />
                <MenuLink icon={HelpCircle} label="FAQ" to="#" />
                <MenuLink icon={Settings} label="Settings" to="#" />

                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-4 mb-2">Follow Us</p>
                <MenuLink icon={Instagram} label="Instagram" to="#" />
                <MenuLink icon={Music2} label="TikTok" to="#" />
              </div>

              {/* Legal */}
              <div className="rounded-xl border border-border bg-card p-4">
                <MenuLink icon={FileText} label="Terms of Service" to="/terms" />
                <MenuLink icon={Shield} label="Privacy Policy" to="/privacy" />
              </div>

              <Button variant="ghost" className="w-full text-muted-foreground text-sm hover:text-foreground" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default DashboardProfile;
