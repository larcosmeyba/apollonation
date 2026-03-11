import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UsersRound, Play, ChevronLeft, ChevronRight, Timer, Repeat } from "lucide-react";

interface SlideExercise {
  name: string;
  thumbnail_url: string | null;
  video_url: string | null;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
}

const AdminGroupCoaching = () => {
  const [presenting, setPresenting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  // Fetch on-demand classes
  const { data: workouts = [] } = useQuery({
    queryKey: ["group-coaching-workouts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workouts")
        .select("id, title, thumbnail_url, category, duration_minutes")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch exercises for selected workout
  const { data: slides = [] } = useQuery({
    queryKey: ["group-coaching-slides", selectedWorkoutId],
    queryFn: async () => {
      if (!selectedWorkoutId) return [];
      const { data } = await supabase
        .from("workout_exercises")
        .select("sets, reps, rest_seconds, notes, sort_order, exercises(title, thumbnail_url, video_url)")
        .eq("workout_id", selectedWorkoutId)
        .order("sort_order", { ascending: true });
      if (!data) return [];
      return data.map((we: any) => ({
        name: we.exercises?.title || "Exercise",
        thumbnail_url: we.exercises?.thumbnail_url,
        video_url: we.exercises?.video_url,
        sets: we.sets,
        reps: we.reps,
        rest_seconds: we.rest_seconds,
      })) as SlideExercise[];
    },
    enabled: !!selectedWorkoutId,
  });

  // Presentation mode
  if (presenting && slides.length > 0) {
    const slide = slides[currentSlide];
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentSlide + 1} / {slides.length}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPresenting(false)}>
            Exit
          </Button>
        </div>

        <div className="flex flex-col items-center gap-6 max-w-2xl text-center px-4">
          {slide.thumbnail_url ? (
            <img
              src={slide.thumbnail_url}
              alt={slide.name}
              className="w-80 h-80 object-cover rounded-xl"
            />
          ) : slide.video_url ? (
            <video
              src={slide.video_url}
              className="w-80 h-80 object-cover rounded-xl"
              autoPlay
              loop
              muted
            />
          ) : (
            <div className="w-80 h-80 bg-muted rounded-xl flex items-center justify-center">
              <UsersRound className="w-16 h-16 text-muted-foreground" />
            </div>
          )}

          <h2 className="font-heading text-3xl tracking-wider uppercase">{slide.name}</h2>

          <div className="flex items-center gap-6 text-lg">
            {slide.sets && (
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-apollo-gold" />
                <span>{slide.sets} sets</span>
              </div>
            )}
            {slide.reps && (
              <div className="flex items-center gap-2">
                <span className="text-apollo-gold font-bold">#</span>
                <span>{slide.reps} reps</span>
              </div>
            )}
            {slide.rest_seconds && (
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-apollo-gold" />
                <span>{slide.rest_seconds}s rest</span>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-8 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            disabled={currentSlide === 0}
            onClick={() => setCurrentSlide((p) => p - 1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentSlide === slides.length - 1}
            onClick={() => setCurrentSlide((p) => p + 1)}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl tracking-wider">GROUP COACHING</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a workout to present as a slideshow during group sessions
          </p>
        </div>
      </div>

      {selectedWorkoutId && slides.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelectedWorkoutId(null)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to workouts
            </Button>
            <Button
              onClick={() => {
                setCurrentSlide(0);
                setPresenting(true);
              }}
              className="bg-apollo-gold text-background hover:bg-apollo-gold/90"
            >
              <Play className="w-4 h-4 mr-2" /> Start Presentation
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {slides.map((s, i) => (
              <Card key={i} className="bg-card border-border rounded-xl">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {s.thumbnail_url ? (
                      <img src={s.thumbnail_url} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UsersRound className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[s.sets && `${s.sets} sets`, s.reps && `${s.reps} reps`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {workouts.map((w) => (
            <Card
              key={w.id}
              onClick={() => setSelectedWorkoutId(w.id)}
              className="bg-card border-border rounded-xl cursor-pointer hover:ring-1 hover:ring-apollo-gold/30 transition-all overflow-hidden"
            >
              <div className="aspect-video bg-muted relative">
                {w.thumbnail_url ? (
                  <img src={w.thumbnail_url} alt={w.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Dumbbell className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Play className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{w.title}</p>
                <p className="text-xs text-muted-foreground">{w.duration_minutes} min · {w.category}</p>
              </CardContent>
            </Card>
          ))}
          {workouts.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <UsersRound className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No workouts available. Add on-demand classes first.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminGroupCoaching;
