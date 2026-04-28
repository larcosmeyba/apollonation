import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Play, Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAccessControl } from "@/hooks/useAccessControl";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, subDays } from "date-fns";
import { Flame } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import stockBack from "@/assets/stock-back.png";
import stockArms from "@/assets/stock-arms.png";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
import marcosAction6 from "@/assets/marcos-action-6.jpg";
import marcosAction7 from "@/assets/marcos-action-7.jpg";
import catStretch from "@/assets/categories/stretch.jpg";
import catCardio from "@/assets/categories/cardio.jpg";
import catSculpt from "@/assets/categories/sculpt.jpg";
import catStrength from "@/assets/categories/strength.png";
import catHIIT from "@/assets/categories/hiit.png";
import catCore from "@/assets/core-card.jpg";
import { getYouTubeEmbedUrl, getYouTubeThumbnail } from "@/utils/youtube";
import { toast } from "sonner";

const WORKOUT_IMAGES = [stockBack, stockArms, marcosAction1, marcosAction6, marcosAction7];

const CATEGORY_IMAGES: Record<string, string> = {
  Strength: catStrength,
  HIIT: catHIIT,
  Sculpt: catSculpt,
  Cardio: catCardio,
  Stretch: catStretch,
  Core: catCore,
};


const getThumb = (w: any, i: number) => {
  if (w.thumbnail_url) return w.thumbnail_url;
  if (w.video_url) return getYouTubeThumbnail(w.video_url);
  return WORKOUT_IMAGES[i % WORKOUT_IMAGES.length];
};

/** Storage video player with signed URL */
const StorageVideoPlayer = ({ storagePath }: { storagePath: string }) => {
  const [bucket, ...pathParts] = storagePath.split("/");
  const filePath = pathParts.join("/");
  const { data: signedUrl } = useQuery({
    queryKey: ["signed-video", storagePath],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 1000 * 60 * 30,
  });
  if (!signedUrl) return <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  return <video src={signedUrl} controls autoPlay playsInline className="w-full h-full" />;
};

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { hasPremiumAccess, freeWorkoutsRemaining, freeRecipesRemaining, freeProgramsRemaining } = useAccessControl();
  const { signedUrl: avatarSignedUrl } = useSignedUrl("avatars", profile?.avatar_url);
  const queryClient = useQueryClient();
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning,";
    if (hour < 17) return "Good Afternoon,";
    return "Good Evening,";
  }, []);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: newThisWeek = [], isLoading: isLoadingNew } = useQuery({
    queryKey: ["new-this-week", weekStart],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts")
        .select("*")
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
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      return data || [];
    },
  });

  // Streak: consecutive days with workout OR meal log
  const { data: streak = 0 } = useQuery({
    queryKey: ["home-streak", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const since = format(subDays(new Date(), 60), "yyyy-MM-dd");
      const results = await Promise.allSettled([
        supabase.from("workout_session_logs").select("log_date").eq("user_id", user.id).gte("log_date", since),
        supabase.from("macro_logs").select("log_date").eq("user_id", user.id).gte("log_date", since),
      ]);
      const sessions = results[0].status === "fulfilled" ? results[0].value : (console.warn("[home-streak] sessions failed", (results[0] as PromiseRejectedResult).reason), { data: [] as any[] });
      const macros = results[1].status === "fulfilled" ? results[1].value : (console.warn("[home-streak] macros failed", (results[1] as PromiseRejectedResult).reason), { data: [] as any[] });
      const dates = new Set<string>([
        ...((sessions.data || []) as any[]).map((s) => s.log_date),
        ...((macros.data || []) as any[]).map((m) => m.log_date),
      ]);
      const today = new Date();
      let count = 0;
      for (let i = 0; i < 60; i++) {
        const d = format(subDays(today, i), "yyyy-MM-dd");
        if (i === 0 && !dates.has(d)) continue;
        if (dates.has(d)) count++;
        else if (i > 0) break;
      }
      return count;
    },
    enabled: !!user,
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

  const { data: workoutExercises = [] } = useQuery({
    queryKey: ["workout-exercises-home", selectedWorkout?.id],
    queryFn: async () => {
      if (!selectedWorkout) return [];
      const { data, error } = await supabase
        .from("workout_exercises")
        .select("*, exercises(*)")
        .eq("workout_id", selectedWorkout.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedWorkout,
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

  const categories = ["Strength", "Sculpt", "Cardio", "Core", "Stretch"];

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

  const renderVideoPlayer = (workout: any) => {
    if (!workout.video_url) return null;
    const isStorage = workout.video_url.startsWith("storage:");
    if (isStorage) {
      return (
        <div className="relative aspect-video w-full bg-black">
          <StorageVideoPlayer storagePath={workout.video_url.replace("storage:", "")} />
        </div>
      );
    }
    return (
      <div className="relative aspect-video w-full">
        <iframe
          src={getYouTubeEmbedUrl(workout.video_url)}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    );
  };

  const WorkoutCard = ({ workout, index, aspectClass = "aspect-[16/10]" }: { workout: any; index: number; aspectClass?: string }) => (
    <button
      onClick={() => setSelectedWorkout(workout)}
      className={`relative rounded-2xl overflow-hidden flex-shrink-0 w-[75%] ${aspectClass} group text-left`}
    >
      <img
        src={getThumb(workout, index) || WORKOUT_IMAGES[index % WORKOUT_IMAGES.length]}
        alt={workout.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading={index < 2 ? "eager" : "lazy"}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = WORKOUT_IMAGES[index % WORKOUT_IMAGES.length];
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute top-3 right-3">
        <SaveButton workoutId={workout.id} />
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <h3 className="text-base font-bold text-white uppercase leading-tight truncate">
          {workout.title}
        </h3>
        <p className="text-xs font-bold text-white mt-1">
          Marcos Leyba &nbsp;/&nbsp; {workout.duration_minutes} min &nbsp;/&nbsp; Train: {workout.category}
        </p>
      </div>
    </button>
  );

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
            <Link
              to="/dashboard/profile"
              className="inline-flex items-center gap-1.5 mt-1 text-xs font-semibold text-foreground/60 hover:text-foreground transition-colors"
            >
              <Flame className={`w-3.5 h-3.5 ${streak > 0 ? "text-orange-400" : "text-foreground/40"}`} />
              {streak > 0 ? `${streak} day streak` : "Start your streak"}
            </Link>
          </div>
        </div>

        {/* Free tier starter banner */}
        {!hasPremiumAccess && (
          <div className="rounded-xl bg-muted p-4">
            <p className="text-sm font-medium">Welcome to Apollo Reborn™</p>
            <p className="text-xs text-muted-foreground mt-1">
              You have {freeWorkoutsRemaining} free workouts, {freeProgramsRemaining} programs, and {freeRecipesRemaining} recipes included.
            </p>
            <Button size="sm" variant="apollo" className="mt-3" onClick={() => navigate("/subscribe")}>
              See membership
            </Button>
          </div>
        )}

        {/* AI Daily Workout entry */}
        <button
          type="button"
          onClick={() => navigate("/dashboard/ai-workout")}
          className="w-full text-left rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 text-background p-5 shadow-lg active:scale-[0.99] transition-transform"
        >
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
            AI · Premium
          </p>
          <p className="text-lg font-bold mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Build Today's Workout
          </p>
          <p className="text-xs opacity-80 mt-1">
            Tell Apollo your time, energy, and gear — get a workout in seconds.
          </p>
        </button>

        {/* NEW THIS WEEK */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-wide" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Latest Classes
            </h2>
            <Link to="/dashboard/workouts">
              <span className="text-sm font-bold text-foreground hover:text-accent transition-colors">View All</span>
            </Link>
          </div>
          {isLoadingNew ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="flex-shrink-0 w-[75%] aspect-[16/10] rounded-2xl" />
              ))}
            </div>
          ) : newThisWeek.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {newThisWeek.map((w, i) => (
                <WorkoutCard key={w.id} workout={w} index={i} />
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {allWorkouts.slice(0, 5).map((w, i) => (
                <WorkoutCard key={w.id} workout={w} index={i} />
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
            {categories.map((cat, idx) => (
              <Link
                key={cat}
                to={`/dashboard/workouts?category=${cat.toLowerCase()}`}
                className="relative rounded-2xl overflow-hidden flex-shrink-0 w-52 h-40 group shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
              >
                <img
                  src={CATEGORY_IMAGES[cat]}
                  alt={cat}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                    cat === "Strength" || cat === "Cardio" ? "object-[center_30%]" : "object-[center_top]"
                  } ${idx % 2 !== 0 ? "grayscale" : ""}`}
                />
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
                <WorkoutCard key={w.id} workout={w} index={i} aspectClass="aspect-[4/3]" />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Workout Detail Modal */}
      <Dialog open={!!selectedWorkout} onOpenChange={() => setSelectedWorkout(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-background border-border">
          {selectedWorkout && (
            <>
              {selectedWorkout.video_url ? (
                renderVideoPlayer(selectedWorkout)
              ) : getThumb(selectedWorkout, 0) ? (
                <div className="relative aspect-video w-full overflow-hidden">
                  <img src={getThumb(selectedWorkout, 0)} alt={selectedWorkout.title} className="w-full h-full object-cover" />
                </div>
              ) : null}

              <ScrollArea className="max-h-[60vh]">
                <div className="p-5 space-y-4">
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl tracking-wide">
                      {selectedWorkout.title}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs border-border text-foreground">{selectedWorkout.category}</Badge>
                    <Badge variant="outline" className="text-xs border-border text-foreground">{selectedWorkout.duration_minutes} min</Badge>
                    {selectedWorkout.calories_estimate && (
                      <Badge variant="outline" className="text-xs border-border text-foreground">{selectedWorkout.calories_estimate} cal</Badge>
                    )}
                  </div>

                  {selectedWorkout.description && (
                    <p className="text-sm text-muted-foreground">{selectedWorkout.description}</p>
                  )}

                  {workoutExercises.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-heading text-sm tracking-wide text-foreground">Exercises</h3>
                      {workoutExercises.map((we: any, idx: number) => (
                        <div key={we.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                          <span className="text-xs font-bold text-muted-foreground w-6 text-center">{idx + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{we.exercises?.title || "Exercise"}</p>
                            <p className="text-xs text-muted-foreground">
                              {we.sets && `${we.sets} sets`}{we.reps && ` × ${we.reps}`}{we.rest_seconds && ` · ${we.rest_seconds}s rest`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Dashboard;
