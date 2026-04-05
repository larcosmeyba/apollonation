import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ChevronRight, Play, Flame, Dumbbell, Zap, Apple, UtensilsCrossed, ShoppingCart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import stockBack from "@/assets/stock-back.png";
import stockArms from "@/assets/stock-arms.png";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
import marcosAction6 from "@/assets/marcos-action-6.jpg";
import marcosAction7 from "@/assets/marcos-action-7.jpg";

const WORKOUT_IMAGES = [stockBack, stockArms, marcosAction1, marcosAction6, marcosAction7];
const CATEGORY_IMAGES = [marcosAction1, stockBack, stockArms, marcosAction6, marcosAction7];

const getWorkoutImage = (dateStr: string) => {
  const hash = dateStr.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return WORKOUT_IMAGES[hash % WORKOUT_IMAGES.length];
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

  // Featured on-demand workouts
  const { data: recentWorkouts = [] } = useQuery({
    queryKey: ["recent-workouts-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts")
        .select("id, title, category, duration_minutes, calories_estimate, thumbnail_url, video_url")
        .order("created_at", { ascending: false })
        .limit(6);
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

  const categories = [
    { name: "Strength", image: CATEGORY_IMAGES[0] },
    { name: "Sculpt", image: CATEGORY_IMAGES[1] },
    { name: "Core", image: CATEGORY_IMAGES[2] },
    { name: "HIIT", image: CATEGORY_IMAGES[3] },
    { name: "Recovery", image: CATEGORY_IMAGES[4] },
  ];

  const isRestDay = !todayWorkout;

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6">

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

        {/* 2. Hero Workout Card */}
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

        {/* 3. Choose Your Training */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base text-foreground">Choose Your Training</h2>
            <Link to="/dashboard/workouts">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">View All</span>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={`/dashboard/workouts`}
                className="relative rounded-xl overflow-hidden flex-shrink-0 w-36 h-24 group"
              >
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white tracking-wide">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 4. Your Coach */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base text-foreground">Your Coach</h2>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-border">
                <img src={marcosAction1} alt="Marcos Leyba" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Marcos Leyba</p>
                <p className="text-[10px] text-muted-foreground">Founder & Head Coach</p>
              </div>
            </div>
          </div>
        </div>

        {/* 5. All Workouts */}
        {recentWorkouts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-base text-foreground">All Workouts</h2>
              <Link to="/dashboard/workouts">
                <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">View All</span>
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {recentWorkouts.map((w, i) => (
                <Link
                  key={w.id}
                  to="/dashboard/workouts"
                  className="relative rounded-xl overflow-hidden flex-shrink-0 w-60 aspect-[4/3] group"
                >
                  {w.thumbnail_url ? (
                    <img src={w.thumbnail_url} alt={w.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <img src={WORKOUT_IMAGES[i % WORKOUT_IMAGES.length]} alt={w.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
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

        {/* 6. Fuel Your Training */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base text-foreground">Fuel Your Training</h2>
            <Link to="/dashboard/nutrition">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">View All</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Flame, label: "Macro Tracking", to: "/dashboard/macros" },
              { icon: UtensilsCrossed, label: "Meal Plans", to: "/dashboard/nutrition" },
              { icon: BookOpen, label: "Recipes", to: "/dashboard/recipes" },
              { icon: ShoppingCart, label: "Grocery Lists", to: "/dashboard/nutrition" },
            ].map((item) => (
              <Link key={item.label} to={item.to} className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2 hover:border-accent/30 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <item.icon className="w-5 h-5 text-accent" />
                </div>
                <span className="text-xs font-medium text-foreground">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 7. Weekly Activity */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base text-foreground">Weekly Activity</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-heading text-foreground">{streakData?.current || 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Day Streak</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-heading text-foreground">{streakData?.workoutsWeek || 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Workouts This Week</p>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
