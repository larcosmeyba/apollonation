import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Play, Plus } from "lucide-react";
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
      <div className="max-w-xl mx-auto space-y-8">

        {/* Greeting */}
        <div className="flex items-center gap-4 pt-2">
          <Link
            to="/dashboard/profile"
            className="w-14 h-14 rounded-full bg-foreground flex items-center justify-center flex-shrink-0"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-background">
                {(profile?.display_name || "M").charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
          <div>
            <p className="text-sm font-semibold text-foreground">{greeting}</p>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {profile?.display_name || "Warrior"}
            </h1>
          </div>
        </div>

        {/* NEW THIS WEEK */}
        <div>
          <h2 className="text-lg font-bold text-foreground uppercase tracking-wide mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            New This Week
          </h2>
          {newThisWeek.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {newThisWeek.map((w, i) => (
                <Link
                  key={w.id}
                  to="/dashboard/workouts"
                  className="relative rounded-2xl overflow-hidden flex-shrink-0 w-[85%] aspect-[16/10] group"
                >
                  <img
                    src={getThumb(w, i) || WORKOUT_IMAGES[i % WORKOUT_IMAGES.length]}
                    alt={w.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  {/* Save button */}
                  <div className="absolute top-3 right-3">
                    <div className="w-8 h-8 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center">
                      <Plus className="w-4 h-4 text-foreground" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-base font-bold text-foreground uppercase leading-tight truncate">
                      {w.title}
                    </h3>
                    <p className="text-xs font-medium text-foreground/70 mt-1">
                      Marcos Leyba &nbsp;/&nbsp; {w.duration_minutes} min &nbsp;/&nbsp; Train: {w.category}
                    </p>
                    <Link to="/dashboard/workouts">
                      <Button
                        variant="outline"
                        className="mt-3 rounded-full border-foreground/40 text-foreground bg-transparent hover:bg-foreground/10 text-xs font-bold uppercase tracking-wider px-6 h-9"
                      >
                        <Play className="w-3 h-3 mr-2 fill-current" />
                        Start
                      </Button>
                    </Link>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* Fallback hero card when no new workouts */
            <div className="rounded-2xl overflow-hidden">
              <div className="relative aspect-[16/10]">
                <img
                  src={getWorkoutImage(todayStr)}
                  alt="Today's training"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute top-3 right-3">
                  <div className="w-8 h-8 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center">
                    <Plus className="w-4 h-4 text-foreground" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-base font-bold text-foreground uppercase leading-tight">
                    {isRestDay
                      ? "Recovery & Mobility"
                      : todayWorkout?.focus || todayWorkout?.day_label || "Today's Training"
                    }
                  </h3>
                  <p className="text-xs font-medium text-foreground/70 mt-1">
                    Marcos Leyba &nbsp;/&nbsp; {todayWorkout?.exercises?.length || 0} exercises
                  </p>
                  <Link to={isRestDay ? "/dashboard/recovery" : `/dashboard/training/workout?day=${todayWorkout?.id}&date=${todayStr}`}>
                    <Button
                      variant="outline"
                      className="mt-3 rounded-full border-foreground/40 text-foreground bg-transparent hover:bg-foreground/10 text-xs font-bold uppercase tracking-wider px-6 h-9"
                    >
                      <Play className="w-3 h-3 mr-2 fill-current" />
                      Start
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Choose How You Train */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Choose How You Train
            </h2>
            <Link to="/dashboard/workouts">
              <span className="text-sm font-semibold text-foreground/60 hover:text-foreground transition-colors">View All</span>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {categories.map((cat) => (
              <Link
                key={cat}
                to="/dashboard/workouts"
                className="relative rounded-2xl overflow-hidden flex-shrink-0 w-40 h-28 group"
              >
                <img src={CATEGORY_IMAGES[cat]} alt={cat} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/45 group-hover:bg-black/35 transition-colors" />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground tracking-wide">
                  {cat}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Your Coaches */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Your Coaches
            </h2>
            <span className="text-sm font-semibold text-foreground/60">View All</span>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border">
                <img src={marcosAction1} alt="Marcos Leyba" className="w-full h-full object-cover" />
              </div>
              <p className="text-sm font-bold text-foreground text-center">Marcos Leyba</p>
            </div>
          </div>
        </div>

        {/* ALL CLASSES */}
        {allWorkouts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground uppercase tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                All Classes
              </h2>
              <Link to="/dashboard/workouts">
                <span className="text-sm font-semibold text-foreground/60 hover:text-foreground transition-colors">View All</span>
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {allWorkouts.map((w, i) => (
                <Link
                  key={w.id}
                  to="/dashboard/workouts"
                  className="relative rounded-2xl overflow-hidden flex-shrink-0 w-[75%] aspect-[4/3] group"
                >
                  <img
                    src={getThumb(w, i) || WORKOUT_IMAGES[i % WORKOUT_IMAGES.length]}
                    alt={w.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <div className="w-8 h-8 rounded-full bg-foreground/20 backdrop-blur-sm flex items-center justify-center">
                      <Plus className="w-4 h-4 text-foreground" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-sm font-bold text-foreground uppercase leading-tight truncate">
                      {w.title}
                    </h3>
                    <p className="text-[11px] font-medium text-foreground/60 mt-0.5">
                      Marcos Leyba &nbsp;/&nbsp; {w.duration_minutes} min &nbsp;/&nbsp; Train: {w.category}
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
