import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  sort_order: number;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  notes: string | null;
  exercise?: {
    title: string;
    muscle_group: string;
  };
}

interface Exercise {
  id: string;
  title: string;
  muscle_group: string;
}

interface Props {
  workoutId: string;
  workoutTitle: string;
}

const WorkoutExerciseLinker = ({ workoutId, workoutTitle }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState("10");
  const [restSeconds, setRestSeconds] = useState(60);

  // Fetch linked exercises for this workout
  const { data: linkedExercises, isLoading } = useQuery({
    queryKey: ["workout-exercises", workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_exercises")
        .select("*, exercises(title, muscle_group)")
        .eq("workout_id", workoutId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((item) => ({
        ...item,
        exercise: item.exercises,
      })) as WorkoutExercise[];
    },
  });

  // Fetch all available exercises
  const { data: allExercises } = useQuery({
    queryKey: ["all-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, title, muscle_group")
        .order("muscle_group", { ascending: true });
      if (error) throw error;
      return data as Exercise[];
    },
  });

  // Filter out already-linked exercises
  const availableExercises = allExercises?.filter(
    (e) => !linkedExercises?.some((le) => le.exercise_id === e.id)
  );

  const addMutation = useMutation({
    mutationFn: async () => {
      const nextOrder = (linkedExercises?.length || 0) + 1;
      const { error } = await supabase.from("workout_exercises").insert({
        workout_id: workoutId,
        exercise_id: selectedExerciseId,
        sort_order: nextOrder,
        sets,
        reps,
        rest_seconds: restSeconds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-exercises", workoutId] });
      toast({ title: "Exercise added to workout" });
      setIsDialogOpen(false);
      setSelectedExerciseId("");
      setSets(3);
      setReps("10");
      setRestSeconds(60);
    },
    onError: (error) => {
      toast({ title: "Error adding exercise", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-exercises", workoutId] });
      toast({ title: "Exercise removed from workout" });
    },
    onError: (error) => {
      toast({ title: "Error removing exercise", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-heading text-lg text-white">
          Exercises in <span className="text-primary">{workoutTitle}</span>
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="apollo" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Link Exercise
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Exercise to Workout</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Exercise</Label>
                <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an exercise..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableExercises?.map((ex) => (
                      <SelectItem key={ex.id} value={ex.id}>
                        {ex.title} ({ex.muscle_group})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Sets</Label>
                  <Input
                    type="number"
                    value={sets}
                    onChange={(e) => setSets(parseInt(e.target.value) || 0)}
                    min={1}
                    max={20}
                  />
                </div>
                <div>
                  <Label>Reps</Label>
                  <Input
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    placeholder="e.g. 10 or 8-12"
                  />
                </div>
                <div>
                  <Label>Rest (sec)</Label>
                  <Input
                    type="number"
                    value={restSeconds}
                    onChange={(e) => setRestSeconds(parseInt(e.target.value) || 0)}
                    min={0}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button
                  variant="apollo"
                  onClick={() => addMutation.mutate()}
                  disabled={!selectedExerciseId || addMutation.isPending}
                >
                  Add Exercise
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-apollo overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Exercise</TableHead>
              <TableHead>Muscle Group</TableHead>
              <TableHead>Sets × Reps</TableHead>
              <TableHead>Rest</TableHead>
              <TableHead className="w-16">Remove</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">Loading...</TableCell>
              </TableRow>
            ) : !linkedExercises?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No exercises linked yet. Click "Link Exercise" to add.
                </TableCell>
              </TableRow>
            ) : (
              linkedExercises.map((we, idx) => (
                <TableRow key={we.id}>
                  <TableCell className="text-muted-foreground">
                    <GripVertical className="w-4 h-4 inline mr-1 opacity-30" />
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">{we.exercise?.title}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{we.exercise?.muscle_group}</TableCell>
                  <TableCell>{we.sets} × {we.reps}</TableCell>
                  <TableCell>{we.rest_seconds}s</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMutation.mutate(we.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default WorkoutExerciseLinker;
