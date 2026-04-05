import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Play, Clock, Flame, Search, Dumbbell, Heart, Bookmark } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, startOfWeek } from "date-fns";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
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

const TYPES = ["Strength", "HIIT", "Sculpt", "Cardio", "Recovery", "Core", "Stretch", "Yoga", "Senior"];

const DashboardWorkouts = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const filteredWorkouts = workouts.filter((w) => {
    const matchesSearch = !searchQuery || w.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || w.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const recentlyAdded = workouts.filter(w => w.created_at >= weekStart);
  const savedWorkouts = workouts.filter(w => favorites.includes(w.id));

  const getWorkoutThumbnail = (workout: Workout): string | null => {
    if (workout.thumbnail_url) return workout.thumbnail_url;
    if (workout.video_url) return getYouTubeThumbnail(workout.video_url);
    return null;
  };

  const WorkoutCard = ({ workout }: { workout: Workout }) => {
    const thumb = getWorkoutThumbnail(workout);
    return (
      <button
        onClick={() => setSelectedWorkout(workout)}
        className="group relative overflow-hidden rounded-xl border border-border/15 bg-foreground/[0.02] text-left transition-all hover:border-foreground/15 w-full"
      >
        <div className="relative overflow-hidden aspect-video">
          {thumb ? (
            <img src={thumb} alt={workout.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-foreground/[0.03] flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-foreground/10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          {workout.video_url && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="rounded-full bg-foreground/80 flex items-center justify-center w-10 h-10">
                <Play className="text-background ml-0.5 w-4 h-4" fill="currentColor" />
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[9px] text-foreground/60">
              <Clock className="w-2.5 h-2.5" />{workout.duration_minutes}m
            </span>
            {workout.calories_estimate && (
              <span className="flex items-center gap-1 text-[9px] text-foreground/60">
                <Flame className="w-2.5 h-2.5" />{workout.calories_estimate}
              </span>
            )}
          </div>
        </div>
        <div className="p-2.5">
          <p className="text-[8px] text-foreground/25 uppercase tracking-[0.15em] mb-0.5">{workout.category}</p>
          <h3 className="font-heading leading-tight text-foreground/80 text-[13px]">{workout.title}</h3>
        </div>
      </button>
    );
  };

  const ExploreView = () => (
    <div className="space-y-5">
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

      {/* Types */}
      <div>
        <h3 className="font-heading text-sm text-foreground/70 mb-2">Types</h3>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedCategory(selectedCategory === type ? null : type)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-all whitespace-nowrap tracking-wider ${
                selectedCategory === type
                  ? "bg-foreground text-background"
                  : "bg-foreground/[0.03] border border-border/15 text-foreground/40 hover:text-foreground/60"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Recently Added */}
      {recentlyAdded.length > 0 && !searchQuery && !selectedCategory && (
        <div>
          <h3 className="font-heading text-sm text-foreground/70 mb-2">Recently Added</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {recentlyAdded.slice(0, 4).map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        </div>
      )}

      {/* Instructors */}
      {!searchQuery && !selectedCategory && (
        <div>
          <h3 className="font-heading text-sm text-foreground/70 mb-2">Instructors</h3>
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border">
                <img src={marcosAction1} alt="Marcos Leyba" className="w-full h-full object-cover" />
              </div>
              <p className="text-[11px] font-medium text-foreground/70">Marcos Leyba</p>
            </div>
          </div>
        </div>
      )}

      {/* All workouts / filtered */}
      <div>
        <h3 className="font-heading text-sm text-foreground/70 mb-2">
          {selectedCategory || (searchQuery ? "Results" : "All Classes")}
        </h3>
        {isLoading ? (
          <p className="text-foreground/30 text-sm py-8 text-center animate-pulse">Loading...</p>
        ) : filteredWorkouts.length === 0 ? (
          <p className="text-foreground/30 text-sm py-8 text-center">No workouts found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredWorkouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const CollectionsView = () => (
    <div className="space-y-5">
      {savedWorkouts.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark className="w-10 h-10 text-foreground/10 mx-auto mb-3" />
          <p className="text-foreground/40 text-sm">No saved workouts yet</p>
          <p className="text-foreground/20 text-xs mt-1">Save workouts to build your collection</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {savedWorkouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl tracking-wide">On Demand</h1>
          <p className="text-xs text-foreground/30 mt-0.5">{workouts.length} workouts ready when you are</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="explore" className="w-full">
          <TabsList className="w-full bg-foreground/[0.03] border border-border/15">
            <TabsTrigger value="explore" className="flex-1 text-xs">Explore</TabsTrigger>
            <TabsTrigger value="collections" className="flex-1 text-xs">Collections</TabsTrigger>
          </TabsList>
          <TabsContent value="explore">
            <ExploreView />
          </TabsContent>
          <TabsContent value="collections">
            <CollectionsView />
          </TabsContent>
        </Tabs>
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
