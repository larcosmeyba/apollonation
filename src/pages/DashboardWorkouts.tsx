import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Play, Search, Bookmark, BookmarkCheck, Dumbbell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek } from "date-fns";
import { toast } from "sonner";
import marcosAction1 from "@/assets/marcos-action-1.jpg";
import marcosAction6 from "@/assets/marcos-action-6.jpg";
import marcosAction7 from "@/assets/marcos-action-7.jpg";
import stockBack from "@/assets/stock-back.png";
import stockArms from "@/assets/stock-arms.png";
import marcos2 from "@/assets/marcos-2.jpg";
import marcos3 from "@/assets/marcos-3.jpg";
import marcos5 from "@/assets/marcos-5.jpg";
import marcos8 from "@/assets/marcos-8.jpg";
import type { Tables } from "@/integrations/supabase/types";

type Workout = Tables<"workouts">;

const WORKOUT_IMAGES = [stockBack, stockArms, marcosAction1, marcosAction6, marcosAction7, marcos2, marcos3, marcos5, marcos8];

const TYPE_IMAGES: Record<string, string> = {
  Strength: stockArms,
  HIIT: marcosAction6,
  Sculpt: stockBack,
  Cardio: marcosAction1,
  Recovery: marcosAction7,
  Core: marcos2,
  Stretch: marcos3,
  Yoga: marcos5,
  Senior: marcos8,
};

const getYouTubeVideoId = (url: string): string | null => {
  try {
    const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]v=([a-zA-Z0-9_-]+)/) || url.match(/\/shorts\/([a-zA-Z0-9_-]+)/) || url.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"explore" | "collections">("explore");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [showSearch, setShowSearch] = useState(false);

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

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const filteredWorkouts = workouts.filter((w) => {
    const matchesSearch = !searchQuery || w.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || w.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const recentlyAdded = workouts.filter(w => w.created_at >= weekStart);
  const savedWorkouts = workouts.filter(w => favorites.includes(w.id));
  const featuredWorkouts = workouts.filter(w => w.is_featured).length > 0
    ? workouts.filter(w => w.is_featured)
    : [...workouts].sort(() => 0.5 - Math.random()).slice(0, 6);

  const getWorkoutThumbnail = (workout: Workout): string | null => {
    if (workout.thumbnail_url) return workout.thumbnail_url;
    if (workout.video_url) return getYouTubeThumbnail(workout.video_url);
    return null;
  };

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

  const WorkoutCard = ({ workout, index = 0 }: { workout: Workout; index?: number }) => {
    const thumb = getWorkoutThumbnail(workout) || WORKOUT_IMAGES[index % WORKOUT_IMAGES.length];
    return (
      <button
        onClick={() => setSelectedWorkout(workout)}
        className="group relative overflow-hidden rounded-2xl text-left transition-all w-full"
      >
        <div className="relative overflow-hidden aspect-[4/3]">
          <img
            src={thumb}
            alt={workout.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute top-3 right-3">
            <SaveButton workoutId={workout.id} />
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-sm font-bold text-white uppercase leading-tight truncate">
              {workout.title}
            </h3>
            <p className="text-[11px] font-bold text-white mt-0.5">
              Marcos Leyba &nbsp;/&nbsp; {workout.duration_minutes} min &nbsp;/&nbsp; Train: {workout.category}
            </p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            On Demand
          </h1>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-foreground/5 transition-colors"
          >
            <Search className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Search bar (toggleable) */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <Input
              placeholder="Search workouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border text-sm text-foreground"
              autoFocus
            />
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab("explore")}
              className={`flex-1 pb-3 text-sm font-bold text-center transition-colors relative ${
              activeTab === "explore" ? "text-white" : "text-white/40"
              }`}
            >
              Explore
              {activeTab === "explore" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("collections")}
              className={`flex-1 pb-3 text-sm font-bold text-center transition-colors relative ${
                activeTab === "collections" ? "text-white" : "text-white/40"
              }`}
            >
              Collections
              {activeTab === "collections" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
          </div>
        </div>

        {/* Explore Tab */}
        {activeTab === "explore" && !searchQuery && !selectedCategory && (
          <div className="space-y-8">

            {/* Types — 2-column grid with image backgrounds */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>Types</h2>
                <span className="text-sm font-bold text-foreground">View All</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedCategory(type)}
                    className="relative rounded-2xl overflow-hidden h-24 group text-left shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                  >
                    <img
                      src={TYPE_IMAGES[type]}
                      alt={type}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/35 transition-colors" />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow-lg">
                      {type}
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-2xl h-24 bg-card border border-border flex items-center justify-center hover:bg-foreground/5 transition-colors"
                >
                  <span className="text-sm font-bold text-foreground">View All</span>
                </button>
              </div>
            </div>

            {/* Recently Added */}
            {recentlyAdded.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>Recently Added</h2>
                  <span className="text-sm font-bold text-foreground">View All</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {recentlyAdded.map((w, i) => (
                    <div key={w.id} className="flex-shrink-0 w-[70%]">
                      <WorkoutCard workout={w} index={i} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructors */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>Instructors</h2>
                <span className="text-sm font-bold text-foreground">View All</span>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-white shadow-[0_0_25px_rgba(255,255,255,0.25),0_0_50px_rgba(255,255,255,0.1)]">
                    <img src={marcosAction1} alt="Marcos Leyba" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-sm font-bold text-foreground text-center">Marcos Leyba</p>
                </div>
              </div>
            </div>

            {/* Featured */}
            {featuredWorkouts.length > 0 && workouts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>Featured</h2>
                  <span className="text-sm font-bold text-foreground">View All</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {featuredWorkouts.map((w, i) => (
                    <div key={w.id} className="flex-shrink-0 w-[70%]">
                      <WorkoutCard workout={w} index={i} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Classes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>All Classes</h2>
              </div>
              {isLoading ? (
                <p className="text-white/50 text-sm py-8 text-center animate-pulse">Loading...</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {workouts.map((w, i) => (
                    <WorkoutCard key={w.id} workout={w} index={i} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Explore Tab — filtered/search results */}
        {activeTab === "explore" && (searchQuery || selectedCategory) && (
          <div className="space-y-6">
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs font-bold text-accent"
                >
                  ← Back
                </button>
                <span className="text-lg font-bold text-foreground">{selectedCategory}</span>
              </div>
            )}
            {filteredWorkouts.length === 0 ? (
              <p className="text-white/50 text-sm py-12 text-center">No workouts found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredWorkouts.map((w, i) => (
                  <WorkoutCard key={w.id} workout={w} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collections Tab */}
        {activeTab === "collections" && (
          <div className="space-y-6">
            {savedWorkouts.length === 0 ? (
              <div className="text-center py-20">
                <Bookmark className="w-12 h-12 text-foreground/10 mx-auto mb-4" />
                <p className="text-foreground text-sm font-bold">No saved workouts yet</p>
                <p className="text-white text-xs mt-1">Tap the bookmark icon on any workout to save it</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {savedWorkouts.map((w, i) => (
                  <WorkoutCard key={w.id} workout={w} index={i} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedWorkout} onOpenChange={() => setSelectedWorkout(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-background border-border">
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
                    <p className="text-[10px] text-white uppercase tracking-[0.15em] font-bold mb-1">
                      {selectedWorkout.category}
                    </p>
                    <DialogTitle className="text-xl font-bold text-foreground">{selectedWorkout.title}</DialogTitle>
                    {selectedWorkout.description && (
                      <p className="text-white text-sm mt-1">{selectedWorkout.description}</p>
                    )}
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card p-4 rounded-2xl text-center border border-border">
                      <p className="text-[10px] text-white font-bold uppercase">Duration</p>
                      <p className="text-lg font-bold text-foreground mt-1">{selectedWorkout.duration_minutes} min</p>
                    </div>
                    {selectedWorkout.calories_estimate && (
                      <div className="bg-card p-4 rounded-2xl text-center border border-border">
                        <p className="text-[10px] text-white font-bold uppercase">Calories</p>
                        <p className="text-lg font-bold text-foreground mt-1">{selectedWorkout.calories_estimate}</p>
                      </div>
                    )}
                  </div>

                  {workoutExercises.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-3">Exercises</h3>
                      <div className="space-y-2">
                        {workoutExercises.map((we: any, i: number) => (
                          <div key={we.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                            <span className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-foreground">{we.exercises?.title || "Exercise"}</p>
                              <div className="flex items-center gap-3 mt-0.5 text-[10px] text-white font-medium">
                                <span>{we.sets}×{we.reps}</span>
                                {we.rest_seconds && <span>Rest: {we.rest_seconds}s</span>}
                                {we.exercises?.muscle_group && (
                                  <Badge variant="secondary" className="text-[9px] py-0 bg-foreground/5 text-white border-0">{we.exercises.muscle_group}</Badge>
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
