import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Save, LogOut, ChevronRight, Settings, Star, Dumbbell, Heart, Trophy, Moon, Sun, Shield, Zap, Target, Award, Camera } from "lucide-react";
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
  const [settingsView, setSettingsView] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    fitness_goals: profile?.fitness_goals || "",
  });

  const { data: weeklyActivity } = useQuery({
    queryKey: ["profile-weekly", user?.id],
    queryFn: async () => {
      if (!user) return { activeDays: 0, totalWorkouts: 0, activeDates: new Set<string>() };
      const today = new Date();
      const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), "yyyy-MM-dd"));
      const { data: sessions } = await supabase
        .from("workout_session_logs")
        .select("log_date")
        .eq("user_id", user.id)
        .gte("log_date", last7[0]);
      const dates = new Set((sessions || []).map((s: any) => s.log_date));
      return { activeDays: dates.size, totalWorkouts: sessions?.length || 0, activeDates: dates };
    },
    enabled: !!user,
  });

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
    return { label: format(d, "EEEEE"), date: format(d, "d"), full: format(d, "yyyy-MM-dd"), isToday: i === 6 };
  });

  const tabs = [
    { id: "activity", label: "Activity" },
    { id: "completed", label: "Completed" },
    { id: "favorites", label: "Favorites" },
    { id: "playlists", label: "Playlists" },
    { id: "settings", label: "Settings" },
  ];

  const totalPoints = (totalStats?.workouts || 0) * 10;

  const milestones = [
    { icon: Star, label: "1st Workout", tag: "1ST WORKOUT", unlocked: (totalStats?.workouts || 0) >= 1 },
    { icon: Sun, label: "Early Riser", tag: "EARLY RISER", unlocked: (totalStats?.workouts || 0) >= 3 },
    { icon: Moon, label: "Night Owl", tag: "NIGHT OWL", unlocked: (totalStats?.workouts || 0) >= 5 },
    { icon: Shield, label: "Weekend Warrior", tag: "WARRIOR", unlocked: (totalStats?.workouts || 0) >= 7 },
  ];

  const streaks = [
    { label: "Socialite", tag: "SOCIALITE", icon: Heart, unlocked: false },
    { label: "50th Workout", tag: "50 WORKOUTS", icon: Award, unlocked: (totalStats?.workouts || 0) >= 50, display: "50" },
    { label: "100th Workout", tag: "100 WORKOUTS", icon: Trophy, unlocked: (totalStats?.workouts || 0) >= 100, display: "100" },
    { label: "3X Days", tag: "3X DAYS", icon: Zap, unlocked: false, display: "3X" },
    { label: "7X Days", tag: "7X DAYS", icon: Target, unlocked: false, display: "7X" },
  ];

  // Settings sub-views
  if (settingsView === "profile-edit") {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto">
          <button onClick={() => setSettingsView(null)} className="text-foreground mb-4 text-sm font-bold">← Back</button>
          <h1 className="text-3xl font-bold text-foreground mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>Profile</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground mb-3">Private</h2>
              <div className="space-y-0">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-foreground/60">Display Name</span>
                  <Input
                    value={formData.display_name}
                    onChange={(e) => setFormData(p => ({ ...p, display_name: e.target.value }))}
                    className="bg-transparent border-0 text-right text-sm font-medium text-foreground w-40 p-0 h-auto focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-base font-bold text-foreground mb-1">Details</h2>
              <p className="text-xs text-foreground/40 mb-3">These details yield more accurate performance metrics.</p>
              <div className="space-y-0">
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-foreground/60">Bio</span>
                  <span className="text-sm text-foreground/40">{formData.bio || "Add bio"}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <span className="text-sm text-foreground/60">Fitness Goals</span>
                  <span className="text-sm text-foreground/40">{formData.fitness_goals || "Set goals"}</span>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-foreground text-background hover:bg-foreground/90 font-bold text-sm rounded-xl h-11">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </div>
      </DashboardLayout>
    );
  }

  if (settingsView === "account") {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto">
          <button onClick={() => setSettingsView(null)} className="text-foreground mb-4 text-sm font-bold">← Back</button>
          <h1 className="text-3xl font-bold text-foreground mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>Account Settings</h1>

          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Membership</h2>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-foreground/60">Email</span>
              <span className="text-sm font-medium text-foreground">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-foreground/60">Plan</span>
              <span className="text-sm font-medium text-foreground capitalize">{profile?.subscription_tier || "Basic"}</span>
            </div>
          </div>

          <div className="mt-8">
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive/80 text-sm font-bold" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (settingsView === "preferences") {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto">
          <button onClick={() => setSettingsView(null)} className="text-foreground mb-4 text-sm font-bold">← Back</button>
          <h1 className="text-3xl font-bold text-foreground mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>Preferences</h1>

          <div>
            <h2 className="text-base font-bold text-foreground mb-3">Workout</h2>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-foreground/60">Weekly Workout Goal</span>
              <span className="text-sm text-foreground/40">Set Goal</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-foreground/60">Favorite Types</span>
              <span className="text-sm text-foreground/40">Select Types</span>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-base font-bold text-foreground mb-3">Display</h2>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-foreground/60">Units of Measure</span>
              <span className="text-sm font-medium text-foreground">Imperial</span>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-0">

        {/* Profile Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-foreground/20 to-card p-6 pb-5">
          {/* Settings gear */}
          <button
            onClick={() => setActiveTab("settings")}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full hover:bg-foreground/10 transition-colors"
          >
            <Settings className="w-5 h-5 text-foreground/70" />
          </button>

          <div className="flex items-center gap-4 mt-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 rounded-full bg-foreground flex items-center justify-center border-4 border-foreground/20">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-background">
                    {(profile?.display_name || "M").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <button className="absolute top-0 right-0 w-7 h-7 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center border border-foreground/10">
                <Camera className="w-3.5 h-3.5 text-foreground" />
              </button>
              <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-card" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {profile?.display_name || "Member"}
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
                <span className="text-xs font-semibold" style={{ color: 'hsl(142, 71%, 55%)' }}>Online</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 mt-5">
            <div>
              <p className="text-xs font-semibold text-foreground/60">Total Points</p>
              <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>{totalPoints}</p>
            </div>
            <div className="text-foreground/20 text-2xl font-thin">/</div>
            <div>
              <p className="text-xs font-semibold text-foreground/60">Friends</p>
              <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>0</p>
            </div>
          </div>
        </div>

        {/* Tabs — horizontally scrollable */}
        <div className="flex items-center border-b border-border mt-1 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-foreground border-accent"
                  : "text-foreground/40 border-transparent hover:text-foreground/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="py-5 space-y-6">

          {/* ACTIVITY TAB */}
          {activeTab === "activity" && (
            <>
              {/* Weekly Activity */}
              <div>
                <h2 className="text-lg font-bold text-foreground mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>Weekly Activity</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {/* Active Days card */}
                  <div className="flex-shrink-0 w-72 rounded-2xl border border-border bg-card p-5">
                    <p className="text-sm font-bold text-foreground">Active Days</p>
                    <p className="text-4xl font-bold text-foreground mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{weeklyActivity?.activeDays || 0}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-semibold" style={{ color: 'hsl(142, 71%, 55%)' }}>▲ {weeklyActivity?.activeDays || 0} Day</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-4">
                      {weekDays.map((d) => (
                        <div key={d.full} className="flex flex-col items-center gap-1.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            d.isToday
                              ? "bg-foreground text-background"
                              : (weeklyActivity?.activeDates as Set<string>)?.has(d.full)
                                ? "bg-accent/20 text-accent"
                                : "bg-foreground/5 text-foreground/40"
                          }`}>
                            {d.date}
                          </div>
                          <span className="text-[9px] font-semibold text-foreground/40">{d.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Points card */}
                  <div className="flex-shrink-0 w-48 rounded-2xl border border-border bg-card p-5">
                    <p className="text-sm font-bold text-foreground">Points</p>
                    <p className="text-4xl font-bold text-foreground mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{totalPoints}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-semibold" style={{ color: 'hsl(142, 71%, 55%)' }}>▲ {totalPoints} pts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>Achievements</h2>
                  <span className="text-sm font-semibold text-foreground/60">View All</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {milestones.map((m) => (
                    <div key={m.label} className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className={`w-20 h-20 flex items-center justify-center relative ${
                        m.unlocked ? "" : "opacity-40"
                      }`}>
                        {/* Hexagon shape via clip-path */}
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                            background: m.unlocked
                              ? "linear-gradient(135deg, hsl(220, 10%, 25%), hsl(220, 10%, 15%))"
                              : "linear-gradient(135deg, hsl(220, 5%, 35%), hsl(220, 5%, 25%))",
                          }}
                        >
                          <m.icon className="w-7 h-7 text-foreground/80" />
                        </div>
                        {/* Outer hex border */}
                        <div
                          className="absolute inset-[-3px]"
                          style={{
                            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                            background: m.unlocked
                              ? "linear-gradient(135deg, hsl(220, 5%, 50%), hsl(220, 5%, 35%))"
                              : "linear-gradient(135deg, hsl(220, 5%, 40%), hsl(220, 5%, 30%))",
                            zIndex: -1,
                          }}
                        />
                        <span className="absolute bottom-1 text-[6px] font-bold text-foreground/50 tracking-wider uppercase">
                          {m.tag}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-foreground/70 text-center w-20 truncate">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* COMPLETED TAB */}
          {activeTab === "completed" && (
            <div className="text-center py-20">
              <p className="text-lg font-bold text-foreground/50">No Content</p>
              <p className="text-sm text-foreground/30 mt-1">Check back soon.</p>
            </div>
          )}

          {/* FAVORITES TAB */}
          {activeTab === "favorites" && (
            <div className="text-center py-20">
              <p className="text-lg font-bold text-foreground/50">No Favorites</p>
              <p className="text-sm text-foreground/30 mt-1">Find classes and tap the "+" icon to add to your favorites.</p>
            </div>
          )}

          {/* PLAYLISTS TAB */}
          {activeTab === "playlists" && (
            <div className="text-center py-20">
              <p className="text-lg font-bold text-foreground/50">No Playlists</p>
              <p className="text-sm text-foreground/30 mt-1">Create playlists to organize your workouts.</p>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="space-y-0">
              <h2 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>Settings</h2>

              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">Account</h3>
                <button onClick={() => setSettingsView("profile-edit")} className="flex items-center justify-between w-full py-3.5 border-b border-border">
                  <span className="text-sm text-foreground/70">Profile</span>
                  <ChevronRight className="w-4 h-4 text-foreground/30" />
                </button>
                <button onClick={() => setSettingsView("account")} className="flex items-center justify-between w-full py-3.5 border-b border-border">
                  <span className="text-sm text-foreground/70">Account Settings</span>
                  <ChevronRight className="w-4 h-4 text-foreground/30" />
                </button>
                <button onClick={() => setSettingsView("preferences")} className="flex items-center justify-between w-full py-3.5 border-b border-border">
                  <span className="text-sm text-foreground/70">Preferences</span>
                  <ChevronRight className="w-4 h-4 text-foreground/30" />
                </button>
              </div>

              <div className="mt-6">
                <button
                  onClick={signOut}
                  className="flex items-center justify-between w-full py-3.5 border-b border-border"
                >
                  <span className="text-sm text-foreground/70">Logout</span>
                  <LogOut className="w-4 h-4 text-foreground/30" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardProfile;
