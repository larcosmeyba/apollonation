import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Play, ChevronLeft } from "lucide-react";
import type { ClassType, SlideExercise } from "./group-coaching/types";
import ClassTypeSelector from "./group-coaching/ClassTypeSelector";
import SlideshowPresenter from "./group-coaching/SlideshowPresenter";

const AdminGroupCoaching = () => {
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [classType, setClassType] = useState<ClassType | null>(null);
  const [presenting, setPresenting] = useState(false);

  // Fetch workouts
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
  const { data: exercises = [] } = useQuery({
    queryKey: ["group-coaching-exercises", selectedWorkoutId],
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
        notes: we.notes,
      })) as SlideExercise[];
    },
    enabled: !!selectedWorkoutId,
  });

  // Presenting mode
  if (presenting && classType) {
    return (
      <SlideshowPresenter
        classType={classType}
        exercises={exercises}
        onExit={() => setPresenting(false)}
      />
    );
  }

  // Class type selection (after workout is chosen, before presenting)
  if (selectedWorkoutId && !classType) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedWorkoutId(null)}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to workouts
        </Button>
        <ClassTypeSelector onSelect={(type) => setClassType(type)} />
      </div>
    );
  }

  // After class type selected — preview & launch
  if (selectedWorkoutId && classType) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { setClassType(null); setSelectedWorkoutId(null); }}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={() => setPresenting(true)}
            className="bg-foreground text-background hover:opacity-90"
          >
            <Play className="w-4 h-4 mr-2" /> Start Presentation
          </Button>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
            {classType} class · {exercises.length} exercises
          </p>
          <h2 className="font-heading text-xl tracking-wider text-foreground">
            {workouts.find((w) => w.id === selectedWorkoutId)?.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {exercises.map((ex, i) => (
            <Card key={i} className="bg-card border-border rounded-xl">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {ex.thumbnail_url ? (
                    <img src={ex.thumbnail_url} alt={ex.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Dumbbell className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{ex.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Default: workout grid
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-xl tracking-wider text-foreground">GROUP COACHING</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a workout to present during group sessions
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {workouts.map((w) => (
          <Card
            key={w.id}
            onClick={() => setSelectedWorkoutId(w.id)}
            className="bg-card border-border rounded-xl cursor-pointer hover:ring-1 hover:ring-foreground/20 transition-all overflow-hidden"
          >
            <div className="aspect-video bg-muted relative">
              {w.thumbnail_url ? (
                <img src={w.thumbnail_url} alt={w.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Dumbbell className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-background/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Play className="w-8 h-8 text-foreground" />
              </div>
            </div>
            <CardContent className="p-3">
              <p className="text-sm font-medium truncate text-foreground">{w.title}</p>
              <p className="text-xs text-muted-foreground">{w.duration_minutes} min · {w.category}</p>
            </CardContent>
          </Card>
        ))}
        {workouts.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No workouts available. Add on-demand classes first.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGroupCoaching;
