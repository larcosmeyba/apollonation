import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Play, Flame, Dumbbell, Apple, UtensilsCrossed, ShoppingCart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfWeek } from "date-fns";
import stockBack from "@/assets/stock-back.png";
import stockArms from "@/assets/stock-arms.png";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
import marcosAction6 from "@/assets/marcos-action-6.jpg";
import marcosAction7 from "@/assets/marcos-action-7.jpg";

const WORKOUT_IMAGES = [stockBack, stockArms, marcosAction1, marcosAction6, marcosAction7];

const getWorkoutImage = (dateStr: string) => {
  const hash = dateStr.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return WORKOUT_IMAGES[hash % WORKOUT_IMAGES.length];
};

const CATEGORY_IMAGES: Record<string, string> = {
  Cardio: marcosAction1,
  Sculpt: stockBack,
  Strength: stockArms,
  HIIT: marcosAction6,
  Stretch: marcosAction7,
  Yoga: marcosAction1,
  Senior: stockBack,
};

const Dashboard = () => {
  const { user, profile } = useAuth();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 17) return "Good Afternoon,";
    return "Good Evening,";
  }, []);

  // Fetch today's workout
  const { data: todayWorkout } = useQuery({
    queryKey: ["today-workout", user?.id, todayStr],
    queryFn: async () => {
      if (!user) return null;
      const { data: plans } = await (supabase as any)
        .from("client_training_plans")
        .select("*, client_questionnaires!client_training_plans_questionnaire_id_fkey(cycle_start_date)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1);
      const plan = plans?.[0];
      if (!plan) return null;
      const cycleStartStr = plan.client_questionnaires?.cycle_start_date || plan.created_at.slice(0, 10);
      const cycleStart = new Date(cycleStartStr + "T00:00:00");
      const target = new Date(); target.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((target.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
      const dayNumber = (diffDays % (plan.duration_weeks * 7)) + 1;
      const weekNumber = Math.floor(diffDays / 7) + 1;
      const { data: days } = await (supabase as any)
        .from("training_plan_days")
        .select("*, training_plan_exercises(*)")
        .eq("plan_id", plan.id)
        .eq("day_number", dayNumber)
        .limit(1);
      if (!days?.[0]) return null;
      return {
        ...days[0],
        planTitle: plan.title,
        weekNumber,
        exercises: days[0].training_plan_exercises?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [],
      };
    },
    enabled: !!user,
  });

  // New this week workouts
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: newThisWeek = [] } = useQuery({
    queryKey: ["new-this-week", weekStart],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts")
        .select("id, title, category, duration_minutes, calories_estimate, thumbnail_url, video_url")
        .gte("created_at", weekStart)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // All workouts for "All Classes"
  const { data: allWorkouts = [] } = useQuery({
    queryKey: ["all-workouts-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts")
        .select("id, title, category, duration_minutes, calories_estimate, thumbnail_url, video_url")
        .order("created_at", { ascending: false })
        .limit(12);
      return data || [];
    },
  });

  // Streak data
  const { data: streakData } = useQuery({
    queryKey: ["home-streak", user?.id],
    queryFn: async () => {
      if (!user) return { current: 0, workoutsWeek: 0 };
      const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data: sessions } = await supabase
        .from("workout_session_logs")
        .select("log_date")
        .eq("user_id", user.id)
        .gte("log_date", since);
      const workoutDates = new Set((sessions || []).map((d: any) => d.log_date));
      let current = 0;
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = format(subDays(today, i), "yyyy-MM-dd");
        if (i === 0 && !workoutDates.has(d)) continue;
        if (workoutDates.has(d)) current++;
        else if (i > 0) break;
      }
      const last7 = Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), "yyyy-MM-dd"));
      return { current, workoutsWeek: last7.filter(d => workoutDates.has(d)).length };
    },
    enabled: !!user,
  });

  const categories = ["Cardio", "Sculpt", "Strength", "HIIT", "Stretch", "Yoga", "Senior"];
  const isRestDay = !todayWorkout;

  const getYouTubeThumbnail = (url: string): string | null => {
    try {
      const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]v=([a-zA-Z0-9_-]+)/) || url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
      return null;
    } catch { return null; }
  };

  const getThumb = (w: any, i: number) => {
    if (w.thumbnail_url) return w.thumbnail_url;
    if (w.video_url) return getYouTubeThumbnail(w.video_url);
    return WORKOUT_IMAGES[i % WORKOUT_IMAGES.length];
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-5">

        {/* 1. Greeting */}
        <div className="flex items-center gap-3 pt-1">
          <Link
            to="/dashboard/profile"
            className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-foreground">
                {(profile?.display_name || "M").charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="font-heading text-xl text-foreground">
              {profile?.display_name || "Warrior"}
            </h1>
          </div>
        </div>

        {/* 2. New This Week */}
        {newThisWeek.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-heading text-base text-foreground">New This Week</h2>
              <Link to="/dashboard/workouts">
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">View All</span>
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {newThisWeek.map((w, i) => (
                <Link
                  key={w.id}
                  to="/dashboard/workouts"
                  className="relative rounded-xl overflow-hidden flex-shrink-0 w-44 aspect-[4/3] group"
                >
                  <img
                    src={getThumb(w, i) || WORKOUT_IMAGES[i % WORKOUT_IMAGES.length]}
                    alt={w.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                      <Play className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2.5 right-2.5">
                    <p className="text-xs font-semibold text-white truncate">{w.title}</p>
                    <p className="text-[9px] text-white/60">{w.duration_minutes} min · {w.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 3. Hero Workout Card */}
        <div className="rounded-2xl overflow-hidden border border-border">
          <div className="relative aspect-[16/10]">
            <img
              src={getWorkoutImage(todayStr)}
              alt="Today's training"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5">
              {!isRestDay && todayWorkout?.weekNumber && (
                <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] mb-1">
                  Week {todayWorkout.weekNumber} · Day {todayWorkout.day_number}
                </p>
              )}
              <h2 className="font-heading text-xl text-white mb-0.5">
                {isRestDay
                  ? "Recovery & Mobility"
                  : todayWorkout?.focus || todayWorkout?.day_label || "Today's Training"
                }
              </h2>
              {!isRestDay && (
                <p className="text-xs text-white/50 mb-3">
                  {todayWorkout?.exercises?.length || 0} exercises · Marcos Leyba
                </p>
              )}
              <Link to={isRestDay ? "/dashboard/recovery" : `/dashboard/training/workout?day=${todayWorkout?.id}&date=${todayStr}`}>
                <Button className="bg-white text-black hover:bg-white/90 rounded-full px-6 text-sm font-semibold h-10">
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  {isRestDay ? "Start Recovery" : "Start Workout"}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Choose How You Train */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading text-base text-foreground">Choose How You Train</h2>
            <Link to="/dashboard/workouts">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">View All</span>
            </Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {categories.map((cat) => (
              <Link
                key={cat}
                to="/dashboard/workouts"
                className="relative rounded-xl overflow-hidden flex-shrink-0 w-28 h-20 group"
              >
                <img src={CATEGORY_IMAGES[cat]} alt={cat} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white tracking-wide">
                  {cat}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 5. Your Coaches */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading text-base text-foreground">Your Coaches</h2>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-border" style={{ width: 72, height: 72 }}>
                <img src={marcosAction1} alt="Marcos Leyba" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Marcos Leyba</p>
                <p className="text-[10px] text-muted-foreground">Founder & Head Coach</p>
              </div>
            </div>
          </div>
        </div>

        {/* 6. All Classes */}
        {allWorkouts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-heading text-base text-foreground">All Classes</h2>
              <Link to="/dashboard/workouts">
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">View All</span>
              </Link>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {allWorkouts.map((w, i) => (
                <Link
                  key={w.id}
                  to="/dashboard/workouts"
                  className="relative rounded-xl overflow-hidden flex-shrink-0 w-52 aspect-[4/3] group"
                >
                  <img
                    src={getThumb(w, i) || WORKOUT_IMAGES[i % WORKOUT_IMAGES.length]}
                    alt={w.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-2.5 right-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2.5 left-3 right-3">
                    <p className="text-sm font-semibold text-white truncate">{w.title}</p>
                    <p className="text-[10px] text-white/60">
                      Marcos Leyba · {w.duration_minutes} min · {w.category}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}


      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
