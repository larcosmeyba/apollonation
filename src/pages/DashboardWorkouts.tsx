import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Play, Clock, Flame, Search, Dumbbell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Workout = Tables<"workouts">;

const getYouTubeVideoId = (url: string): string | null => {
  try {
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return shortMatch[1];
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) return watchMatch[1];
    const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) return shortsMatch[1];
    const embedMatch = url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return embedMatch[1];
    return null;
  } catch { return null; }
};

const getYouTubeEmbedUrl = (url: string): string => {
  const videoId = getYouTubeVideoId(url);
  if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=1`;
  return url;
};

const getYouTubeThumbnail = (url: string): string | null => {
  const videoId = getYouTubeVideoId(url);
  if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return null;
};

const CATEGORIES = ["All", "Strength", "HIIT", "Sculpt", "Recovery", "Core", "Mobility", "Stretch"];

const DashboardWorkouts = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["client-workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: workoutExercises = [] } = useQuery({
    queryKey: ["workout-exercises", selectedWorkout?.id],
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

  const { data: recentlyWatched = [] } = useQuery({
    queryKey: ["recently-watched", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_workout_progress")
        .select("workout_id, completed_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data?.map((d) => d.workout_id) || [];
    },
    enabled: !!user,
  });

  const featured = workouts.find((w) => w.is_featured);
  const filteredWorkouts = workouts.filter((w) => {
    const matchesSearch = w.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || w.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const recentWorkouts = workouts.filter((w) => recentlyWatched.includes(w.id)).slice(0, 6);
  const categoryWorkouts = (cat: string) => workouts.filter((w) => w.category.toLowerCase() === cat.toLowerCase()).slice(0, 8);

  const getWorkoutThumbnail = (workout: Workout): string | null => {
    if (workout.thumbnail_url) return workout.thumbnail_url;
    if (workout.video_url) return getYouTubeThumbnail(workout.video_url);
    return null;
  };

  const WorkoutCard = ({ workout, size = "md" }: { workout: Workout; size?: "sm" | "md" | "lg" }) => {
    const isLg = size === "lg";
    const thumb = getWorkoutThumbnail(workout);
    return (
      <button
        onClick={() => setSelectedWorkout(workout)}
        className={`group relative overflow-hidden rounded-xl border border-border/15 bg-foreground/[0.02] text-left transition-all hover:border-foreground/15 flex-shrink-0 ${
          isLg ? "w-full" : size === "sm" ? "w-40 min-w-[10rem]" : "w-52 min-w-[13rem]"
        }`}
      >
        <div className={`relative overflow-hidden ${isLg ? "aspect-[16/7]" : "aspect-video"}`}>
          {thumb ? (
            <img
              src={thumb}
              alt={workout.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-foreground/[0.03] flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-foreground/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

          {workout.video_url && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className={`rounded-full bg-foreground/80 flex items-center justify-center ${isLg ? "w-14 h-14" : "w-10 h-10"}`}>
                <Play className={`text-background ml-0.5 ${isLg ? "w-5 h-5" : "w-4 h-4"}`} fill="currentColor" />
              </div>
            </div>
          )}

          {workout.is_featured && (
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-foreground rounded-full">
              <span className="text-[8px] font-bold text-background uppercase tracking-[0.15em]">Featured</span>
            </div>
          )}

          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[9px] text-foreground/60">
              <Clock className="w-2.5 h-2.5" />
              {workout.duration_minutes}m
            </span>
            {workout.calories_estimate && (
              <span className="flex items-center gap-1 text-[9px] text-foreground/60">
                <Flame className="w-2.5 h-2.5" />
                {workout.calories_estimate}
              </span>
            )}
          </div>
        </div>

        <div className={`${isLg ? "p-4" : "p-2.5"}`}>
          <p className="text-[8px] text-foreground/25 uppercase tracking-[0.15em] mb-0.5">{workout.category}</p>
          <h3 className={`font-heading leading-tight text-foreground/80 ${isLg ? "text-lg" : "text-[13px]"}`}>{workout.title}</h3>
          {isLg && workout.description && (
            <p className="text-[11px] text-foreground/30 mt-1 line-clamp-2">{workout.description}</p>
          )}
        </div>
      </button>
    );
  };

  const HorizontalRow = ({ title, items }: { title: string; items: Workout[] }) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2.5">
        <h2 className="font-heading text-base tracking-wide text-foreground/70">{title}</h2>
        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {items.map((w) => (
            <WorkoutCard key={w.id} workout={w} size="md" />
          ))}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl tracking-wide">On Demand</h1>
          <p className="text-xs text-foreground/30 mt-0.5">{workouts.length} workouts ready when you are</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
          <Input
            placeholder="Search workouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-foreground/[0.03] border-border/20 text-sm"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-medium transition-all whitespace-nowrap tracking-wider ${
                selectedCategory === cat
                  ? "bg-foreground text-background"
                  : "bg-foreground/[0.03] border border-border/15 text-foreground/40 hover:text-foreground/60"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <p className="text-foreground/30 animate-pulse text-sm">Loading...</p>
          </div>
        ) : searchQuery || selectedCategory !== "All" ? (
          <div className="space-y-2.5">
            <h2 className="font-heading text-base tracking-wide text-foreground/70">
              {selectedCategory !== "All" ? selectedCategory : "Results"}
            </h2>
            {filteredWorkouts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-foreground/30 text-sm">No workouts found.</p>
              </div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                {filteredWorkouts.map((w) => (
                  <WorkoutCard key={w.id} workout={w} size="md" />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-7">
            {featured && <WorkoutCard workout={featured} size="lg" />}
            {recentWorkouts.length > 0 && (
              <HorizontalRow title="Continue Watching" items={recentWorkouts} />
            )}
            <HorizontalRow title="Strength" items={categoryWorkouts("Strength")} />
            <HorizontalRow title="HIIT" items={categoryWorkouts("HIIT")} />
            <HorizontalRow title="Recovery" items={categoryWorkouts("Recovery")} />
            {workouts.length > 0 && (
              <HorizontalRow title="All Workouts" items={workouts.slice(0, 12)} />
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedWorkout} onOpenChange={() => setSelectedWorkout(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-background border-border/20">
          {selectedWorkout && (
            <>
              {selectedWorkout.video_url ? (
                <div className="relative aspect-video w-full">
                  <iframe
                    src={getYouTubeEmbedUrl(selectedWorkout.video_url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : getWorkoutThumbnail(selectedWorkout) ? (
                <div className="relative aspect-video w-full overflow-hidden">
                  <img src={getWorkoutThumbnail(selectedWorkout)!} alt={selectedWorkout.title} className="w-full h-full object-cover" />
                </div>
              ) : null}

              <ScrollArea className="max-h-[60vh]">
                <div className="p-5 space-y-4">
                  <DialogHeader>
                    <p className="text-[9px] text-foreground/25 uppercase tracking-[0.15em] mb-0.5">
                      {selectedWorkout.category}
                    </p>
                    <DialogTitle className="font-heading text-xl text-foreground/90">{selectedWorkout.title}</DialogTitle>
                    {selectedWorkout.description && (
                      <p className="text-foreground/40 text-xs mt-1">{selectedWorkout.description}</p>
                    )}
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-foreground/[0.03] p-3 rounded-lg text-center border border-border/10">
                      <p className="text-[9px] text-foreground/25">Duration</p>
                      <p className="font-heading text-sm text-foreground/70">{selectedWorkout.duration_minutes} min</p>
                    </div>
                    {selectedWorkout.calories_estimate && (
                      <div className="bg-foreground/[0.03] p-3 rounded-lg text-center border border-border/10">
                        <p className="text-[9px] text-foreground/25">Calories</p>
                        <p className="font-heading text-sm text-foreground/70">{selectedWorkout.calories_estimate}</p>
                      </div>
                    )}
                  </div>

                  {workoutExercises.length > 0 && (
                    <div>
                      <h3 className="font-heading text-sm mb-2 text-foreground/60">Exercises</h3>
                      <div className="space-y-1.5">
                        {workoutExercises.map((we: any, i: number) => (
                          <div key={we.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-foreground/[0.02] border border-border/10">
                            <span className="w-5 h-5 rounded-full bg-foreground/5 flex items-center justify-center text-[9px] text-foreground/30 flex-shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-foreground/70">{we.exercises?.title || "Exercise"}</p>
                              <div className="flex items-center gap-3 mt-0.5 text-[9px] text-foreground/25">
                                <span>{we.sets}×{we.reps}</span>
                                {we.rest_seconds && <span>Rest: {we.rest_seconds}s</span>}
                                {we.exercises?.muscle_group && (
                                  <Badge variant="secondary" className="text-[8px] py-0 bg-foreground/5 text-foreground/30 border-0">{we.exercises.muscle_group}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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

export default DashboardWorkouts;
