import { useState, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Save, LogOut, ChevronRight, Settings, Star, Dumbbell, Heart, Trophy, Moon, Sun, Shield, Zap, Target, Award, Camera, Bell, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Switch } from "@/components/ui/switch";
import PrivacyDataView from "@/components/dashboard/PrivacyDataView";
import ReportBugView from "@/components/dashboard/ReportBugView";

const WORKOUT_TYPES = ["Cardio", "Sculpt", "Strength", "HIIT", "Stretch", "Yoga", "Core", "Senior"];

const DashboardProfile = () => {
  const { profile, refreshProfile, user, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");
  const [settingsView, setSettingsView] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { signedUrl: avatarUrl } = useSignedUrl("avatars", profile?.avatar_url);

  // Preferences state
  const [weeklyGoalText, setWeeklyGoalText] = useState(profile?.fitness_goals || "");
  const [favoriteTypes, setFavoriteTypes] = useState<string[]>([]);
  const [additionalGoals, setAdditionalGoals] = useState("");
  const [goalFeedback, setGoalFeedback] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [formData, setFormData] = useState({
    display_name: profile?.display_name || "",
    bio: profile?.bio || "",
    fitness_goals: profile?.fitness_goals || "",
  });

  // Total classes completed (on-demand + session logs)
  const { data: totalClasses = 0 } = useQuery({
    queryKey: ["profile-total-classes", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const [sessions, onDemand] = await Promise.all([
        supabase.from("workout_session_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_workout_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      return (sessions.count || 0) + (onDemand.count || 0);
    },
    enabled: !!user,
  });

  const { data: weeklyActivity } = useQuery({
    queryKey: ["profile-weekly", user?.id],
    queryFn: async () => {
      if (!user) return { activeDays: 0, totalWorkouts: 0, activeDates: new Set<string>() };
      const today = new Date();
      const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), "yyyy-MM-dd"));
      const [sessions, onDemand] = await Promise.all([
        supabase.from("workout_session_logs").select("log_date").eq("user_id", user.id).gte("log_date", last7[0]),
        supabase.from("user_workout_progress").select("completed_at").eq("user_id", user.id).gte("completed_at", `${last7[0]}T00:00:00Z`),
      ]);
      const dates = new Set([
        ...(sessions.data || []).map((s: any) => s.log_date),
        ...(onDemand.data || []).map((s: any) => s.completed_at?.split("T")[0]),
      ]);
      return { activeDays: dates.size, totalWorkouts: (sessions.data?.length || 0) + (onDemand.data?.length || 0), activeDates: dates };
    },
    enabled: !!user,
  });

  const { data: totalStats } = useQuery({
    queryKey: ["profile-total-stats", user?.id],
    queryFn: async () => {
      if (!user) return { workouts: 0, favorites: 0 };
      const [workouts, onDemand, favorites] = await Promise.all([
        supabase.from("workout_session_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_workout_progress").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_favorites").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      return { workouts: (workouts.count || 0) + (onDemand.count || 0), favorites: favorites.count || 0 };
    },
    enabled: !!user,
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;
      if (profile?.avatar_url) {
        await supabase.storage.from("avatars").remove([profile.avatar_url]);
      }
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: filePath })
        .eq("user_id", user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      toast({ title: "Profile photo updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

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

  const handleSavePreferences = async () => {
    if (!profile || !user) return;
    setIsLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ fitness_goals: weeklyGoalText })
      .eq("id", profile.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Preferences saved!" });
    }
    setIsLoading(false);
  };

  const generateGoalFeedback = () => {
    if (!additionalGoals.trim()) return;
    const lower = additionalGoals.toLowerCase();
    let feedback = "";
    if (lower.includes("weight") || lower.includes("lose") || lower.includes("fat")) {
      feedback = "For weight loss goals, aim for 4-5 workouts per week combining Cardio and Strength training. Pair with your nutrition plan for best results. Consistency over 8-12 weeks will show significant progress.";
    } else if (lower.includes("muscle") || lower.includes("gain") || lower.includes("bulk")) {
      feedback = "To build muscle, focus on 4-5 Strength sessions per week with progressive overload. Ensure protein intake is at least 0.8g per pound of bodyweight. Rest days are essential for recovery.";
    } else if (lower.includes("flex") || lower.includes("mobil")) {
      feedback = "For flexibility goals, include 2-3 Yoga or Stretch sessions weekly alongside your regular training. Consistency with mobility work yields results in 4-6 weeks.";
    } else if (lower.includes("endurance") || lower.includes("cardio") || lower.includes("run")) {
      feedback = "Build endurance with 3-4 Cardio or HIIT sessions per week. Gradually increase duration by 10% each week. Cross-train with Strength to prevent injury.";
    } else {
      feedback = `Great goal! We recommend 3-5 workouts per week mixing Strength and Cardio. Track your progress in the app and stay consistent — results come with dedication.`;
    }
    setGoalFeedback(feedback);
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
    { id: "settings", label: "Settings" },
  ];

  const allAchievements = [
    { icon: Star, label: "1st Workout", tag: "1ST WORKOUT", unlocked: (totalStats?.workouts || 0) >= 1, desc: "Complete your first workout" },
    { icon: Sun, label: "Early Riser", tag: "EARLY RISER", unlocked: (totalStats?.workouts || 0) >= 3, desc: "Complete 3 workouts" },
    { icon: Moon, label: "Night Owl", tag: "NIGHT OWL", unlocked: (totalStats?.workouts || 0) >= 5, desc: "Complete 5 workouts" },
    { icon: Shield, label: "Weekend Warrior", tag: "WARRIOR", unlocked: (totalStats?.workouts || 0) >= 7, desc: "Complete 7 workouts" },
    { icon: Dumbbell, label: "Iron Will", tag: "IRON WILL", unlocked: (totalStats?.workouts || 0) >= 15, desc: "Complete 15 workouts" },
    { icon: Heart, label: "Dedicated", tag: "DEDICATED", unlocked: (totalStats?.workouts || 0) >= 25, desc: "Complete 25 workouts" },
    { icon: Award, label: "50 Workouts", tag: "50 WORKOUTS", unlocked: (totalStats?.workouts || 0) >= 50, desc: "Complete 50 workouts" },
    { icon: Trophy, label: "100 Workouts", tag: "100 WORKOUTS", unlocked: (totalStats?.workouts || 0) >= 100, desc: "Complete 100 workouts" },
    { icon: Zap, label: "3-Day Streak", tag: "3X DAYS", unlocked: (weeklyActivity?.activeDays || 0) >= 3, desc: "3 active days in a week" },
    { icon: Target, label: "7-Day Streak", tag: "7X DAYS", unlocked: (weeklyActivity?.activeDays || 0) >= 7, desc: "7 active days in a week" },
    { icon: Star, label: "200 Workouts", tag: "200 WORKOUTS", unlocked: (totalStats?.workouts || 0) >= 200, desc: "Complete 200 workouts" },
    { icon: Trophy, label: "500 Workouts", tag: "500 WORKOUTS", unlocked: (totalStats?.workouts || 0) >= 500, desc: "Complete 500 workouts" },
    { icon: Zap, label: "5-Day Streak", tag: "5X DAYS", unlocked: (weeklyActivity?.activeDays || 0) >= 5, desc: "5 active days in a week" },
    { icon: Heart, label: "First Favorite", tag: "1ST FAVE", unlocked: (totalStats?.favorites || 0) >= 1, desc: "Save your first workout" },
    { icon: Shield, label: "10 Favorites", tag: "10 FAVES", unlocked: (totalStats?.favorites || 0) >= 10, desc: "Save 10 workouts" },
    { icon: Target, label: "Month Strong", tag: "30 WORKOUTS", unlocked: (totalStats?.workouts || 0) >= 30, desc: "Complete 30 workouts" },
    { icon: Award, label: "Centurion", tag: "CENTURION", unlocked: (totalStats?.workouts || 0) >= 100, desc: "Join the 100 club" },
    { icon: Dumbbell, label: "10 Workouts", tag: "10 WORKOUTS", unlocked: (totalStats?.workouts || 0) >= 10, desc: "Complete 10 workouts" },
  ];

  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const displayedAchievements = showAllAchievements ? allAchievements : allAchievements.slice(0, 5);

  // Settings sub-views
  if (settingsView === "privacy") {
    return (
      <DashboardLayout>
        <PrivacyDataView onBack={() => setSettingsView(null)} />
      </DashboardLayout>
    );
  }

  if (settingsView === "report-bug") {
    return (
      <DashboardLayout>
        <ReportBugView onBack={() => setSettingsView(null)} />
      </DashboardLayout>
    );
  }

  if (settingsView === "profile-edit") {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto">
          <button onClick={() => setSettingsView(null)} className="text-foreground mb-4 text-sm font-bold">← Back</button>
          <h1 className="text-3xl font-bold text-foreground mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>Profile</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground mb-3">Private</h2>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-foreground">Display Name</span>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData(p => ({ ...p, display_name: e.target.value }))}
                  className="bg-transparent border-0 text-right text-sm font-medium text-foreground w-40 p-0 h-auto focus-visible:ring-0"
                />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground mb-1">Details</h2>
              <p className="text-xs text-foreground/60 mb-3">These details yield more accurate performance metrics.</p>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-foreground">Bio</span>
                <span className="text-sm text-foreground/60">{formData.bio || "Add bio"}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <span className="text-sm text-foreground">Fitness Goals</span>
                <span className="text-sm text-foreground/60">{formData.fitness_goals || "Set goals"}</span>
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
            <h2 className="text-base font-bold text-foreground mb-3">Account</h2>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">{user?.email}</span>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-base font-bold text-foreground mb-3">Notifications</h2>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <span className="text-sm text-foreground">Push Notifications</span>
                <p className="text-xs text-foreground/60 mt-0.5">Receive workout reminders & achievements</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <span className="text-sm text-foreground">Meal Reminders</span>
                <p className="text-xs text-foreground/60 mt-0.5">Reminders to log meals & track macros</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <span className="text-sm text-foreground">Inactivity Alerts</span>
                <p className="text-xs text-foreground/60 mt-0.5">Nudge after 3+ days without a workout</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
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

            {/* Weekly Workout Goals */}
            <div className="py-3 border-b border-border">
              <span className="text-sm font-bold text-foreground">Weekly Workout Goals</span>
              <Textarea
                value={weeklyGoalText}
                onChange={(e) => setWeeklyGoalText(e.target.value)}
                placeholder="e.g. 4 workouts per week — Mon, Wed, Fri, Sat"
                className="mt-2 bg-foreground/5 border-border text-foreground text-sm min-h-[60px] placeholder:text-foreground/40"
              />
            </div>

            {/* Favorite Types */}
            <div className="py-3 border-b border-border">
              <span className="text-sm font-bold text-foreground">Favorite Types</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {WORKOUT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFavoriteTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                      favoriteTypes.includes(type)
                        ? "bg-foreground text-background"
                        : "bg-foreground/10 text-foreground border border-foreground/20"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Goals */}
            <div className="py-3 border-b border-border">
              <span className="text-sm font-bold text-foreground">Additional Goals</span>
              <Textarea
                value={additionalGoals}
                onChange={(e) => { setAdditionalGoals(e.target.value); setGoalFeedback(null); }}
                placeholder="e.g. Lose 15 lbs, build muscle, improve flexibility..."
                className="mt-2 bg-foreground/5 border-border text-foreground text-sm min-h-[60px] placeholder:text-foreground/40"
              />
              <Button
                type="button"
                onClick={generateGoalFeedback}
                className="mt-2 bg-foreground text-background hover:bg-foreground/90 text-xs font-bold rounded-lg h-8 px-4"
              >
                Get Recommendation
              </Button>
              {goalFeedback && (
                <div className="mt-3 p-3 rounded-xl bg-foreground/5 border border-foreground/10">
                  <p className="text-xs text-foreground leading-relaxed">{goalFeedback}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-base font-bold text-foreground mb-3">Display</h2>
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-sm text-foreground">Units of Measure</span>
              <span className="text-sm font-medium text-foreground">Imperial</span>
            </div>
          </div>

          <Button
            onClick={handleSavePreferences}
            disabled={isLoading}
            className="w-full mt-6 bg-foreground text-background hover:bg-foreground/90 font-bold text-sm rounded-xl h-11"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-0">

        {/* Profile Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-foreground/20 to-card p-6 pb-5">
          <button
            onClick={() => setActiveTab("settings")}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full hover:bg-foreground/10 transition-colors"
          >
            <Settings className="w-5 h-5 text-foreground/70" />
          </button>

          <div className="flex items-center gap-4 mt-4">
            {/* Tappable Avatar */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-28 h-28 rounded-full bg-foreground flex items-center justify-center border-4 border-foreground/20 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-background" />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-background">
                    {(profile?.display_name || "M").charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="absolute top-0 right-0 w-7 h-7 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center border border-foreground/10 pointer-events-none">
                <Camera className="w-3.5 h-3.5 text-foreground" />
              </div>
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

          {/* Stats — Total Classes Completed */}
          <div className="flex items-center gap-8 mt-5">
            <div>
              <p className="text-xs font-semibold text-foreground/60">Total Classes Completed</p>
              <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>{totalClasses}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-border mt-1 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "text-foreground border-foreground"
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
                                ? "bg-foreground text-background"
                                : "bg-foreground/5 text-foreground/40"
                          }`}>
                            {d.date}
                          </div>
                          <span className="text-[9px] font-semibold text-foreground/40">{d.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Classes card */}
                  <div className="flex-shrink-0 w-48 rounded-2xl border border-border bg-card p-5">
                    <p className="text-sm font-bold text-foreground">Classes</p>
                    <p className="text-4xl font-bold text-foreground mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{totalClasses}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-semibold" style={{ color: 'hsl(142, 71%, 55%)' }}>Total Completed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>Achievements</h2>
                  <button
                    onClick={() => setShowAllAchievements(!showAllAchievements)}
                    className="text-sm font-semibold text-foreground"
                  >
                    {showAllAchievements ? "Show Less" : "View All"}
                  </button>
                </div>
                <div className={`${showAllAchievements ? "grid grid-cols-4 gap-4" : "flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"}`}>
                  {displayedAchievements.map((m) => (
                    <div key={m.label} className={`flex flex-col items-center gap-2 ${showAllAchievements ? "" : "flex-shrink-0"}`}>
                      <div className={`w-20 h-20 flex items-center justify-center relative ${
                        m.unlocked ? "" : "opacity-30"
                      }`}>
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                            background: m.unlocked
                              ? "linear-gradient(135deg, hsl(45, 80%, 50%), hsl(35, 90%, 40%))"
                              : "linear-gradient(135deg, hsl(220, 5%, 35%), hsl(220, 5%, 25%))",
                          }}
                        >
                          <m.icon className={`w-7 h-7 ${m.unlocked ? "text-white" : "text-foreground/50"}`} />
                        </div>
                        <div
                          className="absolute inset-[-3px]"
                          style={{
                            clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                            background: m.unlocked
                              ? "linear-gradient(135deg, hsl(45, 80%, 60%), hsl(35, 90%, 45%))"
                              : "linear-gradient(135deg, hsl(220, 5%, 40%), hsl(220, 5%, 30%))",
                            zIndex: -1,
                          }}
                        />
                      </div>
                      <span className={`text-[11px] font-bold text-center w-20 truncate ${m.unlocked ? "text-foreground" : "text-foreground/40"}`}>{m.label}</span>
                      {showAllAchievements && (
                        <span className="text-[9px] text-foreground/50 text-center w-20">{m.desc}</span>
                      )}
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

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="space-y-0">
              <h2 className="text-lg font-bold text-foreground mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>Settings</h2>

              <div>
                <h3 className="text-sm font-bold text-foreground mb-2">Account</h3>
                <button onClick={() => setSettingsView("profile-edit")} className="flex items-center justify-between w-full py-3.5 border-b border-border">
                  <span className="text-sm text-foreground">Profile</span>
                  <ChevronRight className="w-4 h-4 text-foreground/30" />
                </button>
                <button onClick={() => setSettingsView("account")} className="flex items-center justify-between w-full py-3.5 border-b border-border">
                  <span className="text-sm text-foreground">Account Settings</span>
                  <ChevronRight className="w-4 h-4 text-foreground/30" />
                </button>
                <button onClick={() => setSettingsView("preferences")} className="flex items-center justify-between w-full py-3.5 border-b border-border">
                  <span className="text-sm text-foreground">Preferences</span>
                  <ChevronRight className="w-4 h-4 text-foreground/30" />
                </button>
                <button onClick={() => setSettingsView("privacy")} className="flex items-center justify-between w-full py-3.5 border-b border-border">
                  <span className="text-sm text-foreground">Privacy & Data</span>
                  <ChevronRight className="w-4 h-4 text-foreground/30" />
                </button>
                <button onClick={() => setSettingsView("report-bug")} className="flex items-center justify-between w-full py-3.5 border-b border-border">
                  <span className="text-sm text-foreground">Report a Bug</span>
                  <ChevronRight className="w-4 h-4 text-foreground/30" />
                </button>
              </div>

              <div className="mt-6">
                <button
                  onClick={signOut}
                  className="flex items-center justify-between w-full py-3.5 border-b border-border"
                >
                  <span className="text-sm text-foreground">Logout</span>
                  <LogOut className="w-4 h-4 text-foreground/30" />
                </button>
                <button
                  onClick={async () => {
                    if (!user) return;
                    const confirmed = window.confirm(
                      "Are you sure you want to request account deletion? This will submit a request to permanently delete your account and all associated data. This action cannot be undone once processed."
                    );
                    if (!confirmed) return;
                    const { error } = await supabase.from("support_tickets").insert({
                      user_id: user.id,
                      type: "account_deletion",
                      subject: "Account Deletion Request",
                      message: `User ${user.email} has requested full account and data deletion.`,
                    });
                    if (error) {
                      toast({ title: "Error", description: "Could not submit request. Please try again.", variant: "destructive" });
                    } else {
                      toast({ title: "Request Submitted", description: "Your account deletion request has been received. We will process it within 30 days." });
                    }
                  }}
                  className="flex items-center justify-between w-full py-3.5 border-b border-border"
                >
                  <span className="text-sm text-destructive">Request Account Deletion</span>
                  <ChevronRight className="w-4 h-4 text-destructive/50" />
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
