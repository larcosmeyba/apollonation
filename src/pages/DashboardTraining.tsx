import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, ChevronLeft, ChevronRight, RefreshCw, Loader2, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v");
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
    return null;
  } catch { return null; }
};

const getYouTubeThumbnail = (url: string): string | null => {
  const id = getYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
};

interface ExerciseTileProps {
  exerciseName: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  muscleGroup?: string | null;
  notes?: string | null;
  onSwap: () => void;
}

const ExerciseTile = ({ exerciseName, sets, reps, restSeconds, muscleGroup, notes, onSwap }: ExerciseTileProps) => {
  const [videoOpen, setVideoOpen] = useState(false);

  const { data: exercise } = useQuery({
    queryKey: ["exercise-tile", exerciseName],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("title, video_url, description, thumbnail_url")
        .ilike("title", exerciseName)
        .maybeSingle();
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });

  const thumbnail = exercise?.video_url ? getYouTubeThumbnail(exercise.video_url) : exercise?.thumbnail_url;
  const embedUrl = exercise?.video_url
    ? `https://www.youtube.com/embed/${getYouTubeVideoId(exercise.video_url)}?autoplay=1`
    : null;

  return (
    <>
      <div className="card-apollo overflow-hidden group hover:border-apollo-gold/50 transition-all">
        {/* Large thumbnail / video preview */}
        <button
          onClick={() => exercise?.video_url && setVideoOpen(true)}
          className="relative w-full aspect-video bg-muted overflow-hidden"
          disabled={!exercise?.video_url}
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={exerciseName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Dumbbell className="w-10 h-10 text-muted-foreground/20" />
            </div>
          )}
          {exercise?.video_url && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-14 h-14 rounded-full bg-apollo-gold flex items-center justify-center">
                <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-3 right-3">
            <p className="font-heading text-sm text-white text-left truncate">{exerciseName}</p>
          </div>
        </button>

        {/* Exercise details */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{sets} sets × {reps}</span>
              {restSeconds && <span>· {restSeconds}s rest</span>}
            </div>
            <Button variant="ghost" size="sm" onClick={onSwap} title="Swap exercise" className="h-7 w-7 p-0">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
          {muscleGroup && (
            <Badge variant="secondary" className="text-[10px]">{muscleGroup}</Badge>
          )}
          {notes && <p className="text-xs text-muted-foreground italic line-clamp-2">{notes}</p>}
        </div>
      </div>

      {/* Video modal */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-base">{exercise?.title || exerciseName}</DialogTitle>
            {exercise?.description && (
              <p className="text-xs text-muted-foreground mt-1">{exercise.description}</p>
            )}
          </DialogHeader>
          <div className="aspect-video w-full">
            {embedUrl && videoOpen ? (
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={exerciseName}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const DashboardTraining = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [swappingExercise, setSwappingExercise] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [loadingSwap, setLoadingSwap] = useState(false);

  const { data: plans } = useQuery({
    queryKey: ["my-training-plans"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_training_plans")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const activePlan = plans?.find((p: any) => p.status === "active") || plans?.[0];

  const { data: days } = useQuery({
    queryKey: ["my-training-days", activePlan?.id],
    queryFn: async () => {
      if (!activePlan) return [];
      const { data, error } = await (supabase as any)
        .from("training_plan_days")
        .select("*, training_plan_exercises(*)")
        .eq("plan_id", activePlan.id)
        .order("day_number");
      if (error) throw error;
      return data;
    },
    enabled: !!activePlan,
  });

  const weekDays = days?.filter((d: any) => {
    const weekStart = (currentWeek - 1) * 7 + 1;
    const weekEnd = currentWeek * 7;
    return d.day_number >= weekStart && d.day_number <= weekEnd;
  }) || [];

  const handleSwapExercise = async (exercise: any) => {
    setSwappingExercise(exercise);
    setLoadingSwap(true);
    setAlternatives([]);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-exercise-swap", {
        body: { exerciseName: exercise.exercise_name, muscleGroup: exercise.muscle_group },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAlternatives(data.alternatives || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingSwap(false);
    }
  };

  const confirmSwap = async (alt: any) => {
    if (!swappingExercise) return;
    const { error } = await (supabase as any)
      .from("training_plan_exercises")
      .update({
        exercise_name: alt.exercise_name,
        muscle_group: alt.muscle_group,
        notes: `Swapped from: ${swappingExercise.exercise_name}. ${alt.reason}`,
      })
      .eq("id", swappingExercise.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Exercise swapped!" });
    setSwappingExercise(null);
    window.location.reload();
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl mb-2">
            My <span className="text-apollo-gold">Training Program</span>
          </h1>
          <p className="text-muted-foreground">Your personalized workout schedule by Coach Marcos</p>
        </div>

        {!activePlan ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Dumbbell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-lg mb-2">No Training Program Yet</h3>
              <p className="text-muted-foreground text-sm">
                Your program will be generated after completing the questionnaire.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Plan info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-heading text-apollo-gold">{activePlan.workout_days_per_week}</p>
                  <p className="text-xs text-muted-foreground">Days/Week</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-heading">{activePlan.duration_weeks}</p>
                  <p className="text-xs text-muted-foreground">Weeks</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-heading">Cycle {activePlan.cycle_number}</p>
                  <p className="text-xs text-muted-foreground">Current Cycle</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-4 text-center">
                  <Badge variant={activePlan.status === "active" ? "default" : "secondary"}>
                    {activePlan.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Status</p>
                </CardContent>
              </Card>
            </div>

            {/* Week nav */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button variant="ghost" size="sm" disabled={currentWeek <= 1} onClick={() => setCurrentWeek(w => w - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-heading text-lg">Week {currentWeek}</span>
              <Button variant="ghost" size="sm" disabled={currentWeek >= (activePlan.duration_weeks || 4)} onClick={() => setCurrentWeek(w => w + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Training days with tile grid */}
            {weekDays.length > 0 ? (
              weekDays.map((day: any) => (
                <div key={day.id} className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading text-lg">{day.day_label || `Day ${day.day_number}`}</h3>
                      {day.focus && (
                        <Badge variant="outline" className="text-apollo-gold border-apollo-gold/30">
                          {day.focus}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Exercise tiles grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {day.training_plan_exercises
                      ?.sort((a: any, b: any) => a.sort_order - b.sort_order)
                      .map((ex: any) => (
                        <ExerciseTile
                          key={ex.id}
                          exerciseName={ex.exercise_name}
                          sets={ex.sets}
                          reps={ex.reps}
                          restSeconds={ex.rest_seconds}
                          muscleGroup={ex.muscle_group}
                          notes={ex.notes}
                          onSwap={() => handleSwapExercise(ex)}
                        />
                      ))}
                  </div>
                </div>
              ))
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No training days scheduled for this week.
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Exercise swap dialog */}
        <Dialog open={!!swappingExercise} onOpenChange={(open) => !open && setSwappingExercise(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Swap Exercise</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              Replace <strong>{swappingExercise?.exercise_name}</strong> with an alternative:
            </p>
            {loadingSwap ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-apollo-gold" />
                <span className="ml-2 text-sm text-muted-foreground">Finding alternatives...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {alternatives.map((alt, i) => (
                  <button
                    key={i}
                    onClick={() => confirmSwap(alt)}
                    className="w-full text-left p-4 rounded-lg border border-border hover:border-apollo-gold/50 transition-all"
                  >
                    <p className="font-medium text-sm">{alt.exercise_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{alt.muscle_group}</Badge>
                      <Badge variant="outline" className="text-[10px]">{alt.difficulty}</Badge>
                      <span className="text-[10px] text-muted-foreground">{alt.movement_pattern}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alt.reason}</p>
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default DashboardTraining;
