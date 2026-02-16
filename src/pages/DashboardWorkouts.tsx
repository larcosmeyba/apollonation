import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const getYouTubeEmbedUrl = (url: string): string => {
  if (url.includes("/embed/")) return url;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const shortsMatch = url.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  return url;
};
import { Play, Clock, Flame, Filter, Heart, Dumbbell } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Workout = Tables<"workouts">;

const categories = ["All", "Strength", "HIIT", "Flexibility", "Recovery"];

const DashboardWorkouts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["client-workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Fetch exercises for the selected workout
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

  const filteredWorkouts = workouts.filter((workout) => {
    const matchesSearch = workout.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || workout.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl mb-2">
            Workout <span className="text-apollo-gold">Library</span>
          </h1>
          <p className="text-muted-foreground">
            {workouts.length} workouts designed by Coach Marcos
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search workouts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted border-border"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-muted border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground animate-pulse">Loading workouts...</p>
          </div>
        ) : (
          <>
            {/* Workouts grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  onClick={() => setSelectedWorkout(workout)}
                  className="card-apollo group overflow-hidden hover:border-apollo-gold/50 transition-all cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {workout.thumbnail_url ? (
                      <img
                        src={workout.thumbnail_url}
                        alt={workout.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dumbbell className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Play button */}
                    {workout.video_url && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-apollo-gold flex items-center justify-center">
                          <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                        </div>
                      </div>
                    )}

                    {/* Featured badge */}
                    {workout.is_featured && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-apollo-gold rounded text-xs font-bold text-primary-foreground">
                        FEATURED
                      </div>
                    )}

                    {/* Favorite button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(workout.id);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          favorites.includes(workout.id)
                            ? "fill-apollo-gold text-apollo-gold"
                            : "text-white"
                        }`}
                      />
                    </button>

                    {/* Duration & calories */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-white/90">
                        <Clock className="w-3 h-3" />
                        {workout.duration_minutes} min
                      </span>
                      {workout.calories_estimate && (
                        <span className="flex items-center gap-1 text-xs text-white/90">
                          <Flame className="w-3 h-3" />
                          {workout.calories_estimate} cal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-apollo-gold uppercase tracking-wide">
                        {workout.category}
                      </span>
                    </div>
                    <h3 className="font-heading text-lg mb-1">{workout.title}</h3>
                    {workout.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {workout.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredWorkouts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No workouts found matching your criteria.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Workout Detail Modal */}
      <Dialog open={!!selectedWorkout} onOpenChange={() => setSelectedWorkout(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          {selectedWorkout && (
            <>
              {/* Video or thumbnail */}
              {selectedWorkout.video_url ? (
                <div className="relative aspect-video w-full">
                  <iframe
                    src={getYouTubeEmbedUrl(selectedWorkout.video_url)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : selectedWorkout.thumbnail_url ? (
                <div className="relative aspect-video w-full overflow-hidden">
                  <img
                    src={selectedWorkout.thumbnail_url}
                    alt={selectedWorkout.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

              <ScrollArea className="max-h-[60vh]">
                <div className="p-6 space-y-6">
                  <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-apollo-gold uppercase tracking-wide">
                        {selectedWorkout.category}
                      </span>
                      {selectedWorkout.is_featured && (
                        <Badge className="bg-apollo-gold text-primary-foreground text-[10px]">FEATURED</Badge>
                      )}
                    </div>
                    <DialogTitle className="font-heading text-2xl">
                      {selectedWorkout.title}
                    </DialogTitle>
                    {selectedWorkout.description && (
                      <p className="text-muted-foreground text-sm mt-1">
                        {selectedWorkout.description}
                      </p>
                    )}
                  </DialogHeader>

                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 p-3 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-medium text-sm">{selectedWorkout.duration_minutes} min</p>
                    </div>
                    {selectedWorkout.calories_estimate && (
                      <div className="bg-muted/50 p-3 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">Calories</p>
                        <p className="font-medium text-sm">{selectedWorkout.calories_estimate}</p>
                      </div>
                    )}
                  </div>

                  {/* Exercises */}
                  {workoutExercises.length > 0 && (
                    <div>
                      <h3 className="font-heading text-lg mb-3">Exercises</h3>
                      <div className="space-y-2">
                        {workoutExercises.map((we: any, i: number) => (
                          <div key={we.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                            <span className="w-6 h-6 rounded-full bg-apollo-gold/20 flex items-center justify-center text-xs font-medium text-apollo-gold flex-shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{we.exercises?.title || "Exercise"}</p>
                              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                <span>{we.sets} sets × {we.reps} reps</span>
                                {we.rest_seconds && <span>Rest: {we.rest_seconds}s</span>}
                                {we.exercises?.muscle_group && (
                                  <Badge variant="secondary" className="text-[10px]">{we.exercises.muscle_group}</Badge>
                                )}
                              </div>
                              {we.notes && <p className="text-xs text-muted-foreground mt-1 italic">{we.notes}</p>}
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
