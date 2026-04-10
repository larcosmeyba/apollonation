import { useAuth } from "@/contexts/AuthContext";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Play, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek } from "date-fns";
import stockBack from "@/assets/stock-back.png";
import stockArms from "@/assets/stock-arms.png";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
import marcosAction6 from "@/assets/marcos-action-6.jpg";
import marcosAction7 from "@/assets/marcos-action-7.jpg";
import { toast } from "sonner";

const WORKOUT_IMAGES = [stockBack, stockArms, marcosAction1, marcosAction6, marcosAction7];

const CATEGORY_IMAGES: Record<string, string> = {
  Cardio: marcosAction1,
  Sculpt: stockBack,
  Strength: stockArms,
  HIIT: marcosAction6,
  Stretch: marcosAction7,
  Yoga: marcosAction1,
  Senior: stockBack,
};

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

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { signedUrl: avatarSignedUrl } = useSignedUrl("avatars", profile?.avatar_url);
  const queryClient = useQueryClient();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 17) return "Good Afternoon,";
    return "Good Evening,";
  }, []);

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

  const { data: favorites = [] } = useQuery({
    queryKey: ["user-favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_favorites")
        .select("workout_id")
        .eq("user_id", user.id)
        .not("workout_id", "is", null);
      return data?.map(f => f.workout_id).filter(Boolean) as string[] || [];
    },
    enabled: !!user,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (workoutId: string) => {
      if (!user) return;
      const isFav = favorites.includes(workoutId);
      if (isFav) {
        await supabase.from("user_favorites").delete().eq("user_id", user.id).eq("workout_id", workoutId);
      } else {
        await supabase.from("user_favorites").insert({ user_id: user.id, workout_id: workoutId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-favorites"] });
    },
    onError: () => toast.error("Could not update favorite"),
  });

  const categories = ["Cardio", "Sculpt", "Strength", "HIIT", "Stretch", "Yoga", "Senior"];

  const SaveButton = ({ workoutId }: { workoutId: string }) => {
    const isSaved = favorites.includes(workoutId);
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite.mutate(workoutId); }}
        className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-colors"
      >
        {isSaved ? (
          <BookmarkCheck className="w-4 h-4 text-white" />
        ) : (
          <Bookmark className="w-4 h-4 text-white" />
        )}
      </button>
    );
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
            {avatarSignedUrl ? (
              <img src={avatarSignedUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-background">
                {(profile?.display_name || "M").charAt(0).toUpperCase()}
              </span>
            )}
          </Link>
          <div>
            <p className="text-sm font-bold text-foreground">{greeting}</p>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {profile?.display_name || "Warrior"}
            </h1>
          </div>
        </div>

        {/* NEW THIS WEEK */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              New This Week
            </h2>
            <Link to="/dashboard/workouts">
              <span className="text-sm font-bold text-foreground hover:text-accent transition-colors">View All</span>
            </Link>
          </div>
          {newThisWeek.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {newThisWeek.map((w, i) => (
                <Link
                  key={w.id}
                  to="/dashboard/workouts"
                  className="relative rounded-2xl overflow-hidden flex-shrink-0 w-[75%] aspect-[16/10] group"
                >
                  <img
                    src={getThumb(w, i) || WORKOUT_IMAGES[i % WORKOUT_IMAGES.length]}
                    alt={w.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <SaveButton workoutId={w.id} />
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-base font-bold text-white uppercase leading-tight truncate">
                      {w.title}
                    </h3>
                    <p className="text-xs font-bold text-white mt-1">
                      Marcos Leyba &nbsp;/&nbsp; {w.duration_minutes} min &nbsp;/&nbsp; Train: {w.category}
                    </p>
                    <Link to="/dashboard/workouts">
                      <Button
                        variant="outline"
                        className="mt-3 rounded-full border-white/40 text-white bg-transparent hover:bg-white/10 text-xs font-bold uppercase tracking-wider px-6 h-9"
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
            /* Fallback — show all workouts as "new" */
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {allWorkouts.slice(0, 5).map((w, i) => (
                <Link
                  key={w.id}
                  to="/dashboard/workouts"
                  className="relative rounded-2xl overflow-hidden flex-shrink-0 w-[75%] aspect-[16/10] group"
                >
                  <img
                    src={getThumb(w, i) || WORKOUT_IMAGES[i % WORKOUT_IMAGES.length]}
                    alt={w.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <SaveButton workoutId={w.id} />
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-base font-bold text-white uppercase leading-tight truncate">
                      {w.title}
                    </h3>
                    <p className="text-xs font-bold text-white mt-1">
                      Marcos Leyba &nbsp;/&nbsp; {w.duration_minutes} min &nbsp;/&nbsp; Train: {w.category}
                    </p>
                    <Link to="/dashboard/workouts">
                      <Button
                        variant="outline"
                        className="mt-3 rounded-full border-white/40 text-white bg-transparent hover:bg-white/10 text-xs font-bold uppercase tracking-wider px-6 h-9"
                      >
                        <Play className="w-3 h-3 mr-2 fill-current" />
                        Start
                      </Button>
                    </Link>
                  </div>
                </Link>
              ))}
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
              <span className="text-sm font-bold text-foreground hover:text-accent transition-colors">View All</span>
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {categories.map((cat) => (
              <Link
                key={cat}
                to={`/dashboard/workouts?category=${cat.toLowerCase()}`}
                className="relative rounded-2xl overflow-hidden flex-shrink-0 w-40 h-28 group shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
              >
                <img src={CATEGORY_IMAGES[cat]} alt={cat} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/35 transition-colors" />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white tracking-wide drop-shadow-lg">
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
            <span className="text-sm font-bold text-foreground">View All</span>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <Link to="/dashboard/coach/marcos" className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-white shadow-[0_0_12px_rgba(255,255,255,0.12),0_0_30px_rgba(255,255,255,0.05)]">
                <img src={marcosAction1} alt="Marcos Leyba" className="w-full h-full object-cover" />
              </div>
              <p className="text-sm font-bold text-foreground text-center">Marcos Leyba</p>
            </Link>
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
                <span className="text-sm font-bold text-foreground hover:text-accent transition-colors">View All</span>
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
                    <SaveButton workoutId={w.id} />
                  </div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-sm font-bold text-white uppercase leading-tight truncate">
                      {w.title}
                    </h3>
                    <p className="text-[11px] font-bold text-white mt-0.5">
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
