import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, Pencil, Trash2, Plus, GripVertical, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Profile {
  user_id: string;
  display_name: string | null;
  subscription_tier: string;
}

interface TrainingPlan {
  id: string;
  user_id: string;
  title: string;
  status: string;
  cycle_number: number;
  workout_days_per_week: number;
  duration_weeks: number;
  created_at: string;
}

interface TrainingDay {
  id: string;
  plan_id: string;
  day_number: number;
  day_label: string | null;
  focus: string | null;
}

interface TrainingExercise {
  id: string;
  day_id: string;
  exercise_name: string;
  muscle_group: string | null;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  notes: string | null;
  sort_order: number;
}

type ViewMode = "clients" | "plans" | "days" | "exercises";

const AdminClientPlans = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("clients");
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<TrainingDay | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingExercise, setEditingExercise] = useState<TrainingExercise | null>(null);
  const [isExerciseDialogOpen, setIsExerciseDialogOpen] = useState(false);
  const [exerciseForm, setExerciseForm] = useState({
    exercise_name: "", muscle_group: "", sets: 3, reps: "10", rest_seconds: 60, notes: "",
  });

  // Fetch clients (pro/elite only)
  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ["admin-plan-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, subscription_tier")
        .in("subscription_tier", ["pro", "elite"])
        .eq("account_status", "active")
        .order("display_name");
      if (error) throw error;
      return data as Profile[];
    },
    enabled: viewMode === "clients",
  });

  const filteredClients = clients?.filter(c =>
    !searchQuery || (c.display_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch plans for selected client
  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ["admin-client-plans", selectedClient?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_training_plans")
        .select("*")
        .eq("user_id", selectedClient!.user_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TrainingPlan[];
    },
    enabled: viewMode === "plans" && !!selectedClient,
  });

  // Fetch days for selected plan
  const { data: days, isLoading: loadingDays } = useQuery({
    queryKey: ["admin-plan-days", selectedPlan?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plan_days")
        .select("*")
        .eq("plan_id", selectedPlan!.id)
        .order("day_number");
      if (error) throw error;
      return data as TrainingDay[];
    },
    enabled: viewMode === "days" && !!selectedPlan,
  });

  // Fetch exercises for selected day
  const { data: exercises, isLoading: loadingExercises } = useQuery({
    queryKey: ["admin-day-exercises", selectedDay?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plan_exercises")
        .select("*")
        .eq("day_id", selectedDay!.id)
        .order("sort_order");
      if (error) throw error;
      return data as TrainingExercise[];
    },
    enabled: viewMode === "exercises" && !!selectedDay,
  });

  // Exercise CRUD
  const saveExerciseMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: typeof exerciseForm }) => {
      if (id) {
        const { error } = await supabase.from("training_plan_exercises").update({
          exercise_name: data.exercise_name, muscle_group: data.muscle_group || null,
          sets: data.sets, reps: data.reps, rest_seconds: data.rest_seconds, notes: data.notes || null,
        }).eq("id", id);
        if (error) throw error;
      } else {
        const maxSort = exercises?.reduce((max, e) => Math.max(max, e.sort_order), -1) ?? -1;
        const { error } = await supabase.from("training_plan_exercises").insert({
          day_id: selectedDay!.id, exercise_name: data.exercise_name,
          muscle_group: data.muscle_group || null, sets: data.sets, reps: data.reps,
          rest_seconds: data.rest_seconds, notes: data.notes || null, sort_order: maxSort + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-day-exercises", selectedDay?.id] });
      toast({ title: editingExercise ? "Exercise updated" : "Exercise added" });
      closeExerciseDialog();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteExerciseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_plan_exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-day-exercises", selectedDay?.id] });
      toast({ title: "Exercise removed" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openExerciseDialog = (exercise?: TrainingExercise) => {
    if (exercise) {
      setEditingExercise(exercise);
      setExerciseForm({
        exercise_name: exercise.exercise_name, muscle_group: exercise.muscle_group || "",
        sets: exercise.sets || 3, reps: exercise.reps || "10",
        rest_seconds: exercise.rest_seconds || 60, notes: exercise.notes || "",
      });
    } else {
      setEditingExercise(null);
      setExerciseForm({ exercise_name: "", muscle_group: "", sets: 3, reps: "10", rest_seconds: 60, notes: "" });
    }
    setIsExerciseDialogOpen(true);
  };

  const closeExerciseDialog = () => {
    setIsExerciseDialogOpen(false);
    setEditingExercise(null);
  };

  const handleBack = () => {
    if (viewMode === "exercises") setViewMode("days");
    else if (viewMode === "days") setViewMode("plans");
    else if (viewMode === "plans") { setViewMode("clients"); setSelectedClient(null); }
  };

  // ── Breadcrumb ──
  const breadcrumb = () => {
    const parts: string[] = ["Clients"];
    if (selectedClient) parts.push(selectedClient.display_name || "Unknown");
    if (selectedPlan) parts.push(selectedPlan.title);
    if (selectedDay) parts.push(selectedDay.day_label || `Day ${selectedDay.day_number}`);
    return parts;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl">Client Training Plans</h2>
        <p className="text-sm text-muted-foreground">View and edit any client's training program</p>
      </div>

      {/* Breadcrumb */}
      {viewMode !== "clients" && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 h-7">
            <ChevronLeft className="w-3 h-3" /> Back
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumb().map((part, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1">›</span>}
                <span className={i === breadcrumb().length - 1 ? "text-foreground font-medium" : ""}>{part}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── CLIENT LIST ── */}
      {viewMode === "clients" && (
        <>
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="card-apollo overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingClients ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filteredClients?.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No pro/elite clients found.</TableCell></TableRow>
                ) : filteredClients?.map(c => (
                  <TableRow key={c.user_id}>
                    <TableCell className="font-medium">{c.display_name || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{c.subscription_tier}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedClient(c); setViewMode("plans"); }}>
                        View Plans
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* ── PLANS LIST ── */}
      {viewMode === "plans" && (
        <div className="card-apollo overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Days/Week</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPlans ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : plans?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No training plans found.</TableCell></TableRow>
              ) : plans?.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell>{p.cycle_number}</TableCell>
                  <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell>{p.workout_days_per_week}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedPlan(p); setViewMode("days"); }}>
                      View Days
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── DAYS LIST ── */}
      {viewMode === "days" && (
        <div className="card-apollo overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Focus</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingDays ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : days?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No days found.</TableCell></TableRow>
              ) : days?.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.day_number}</TableCell>
                  <TableCell className="font-medium">{d.day_label || "—"}</TableCell>
                  <TableCell>{d.focus || "—"}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedDay(d); setViewMode("exercises"); }}>
                      Edit Exercises
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── EXERCISES LIST ── */}
      {viewMode === "exercises" && (
        <>
          <div className="flex justify-end">
            <Button variant="apollo" size="sm" onClick={() => openExerciseDialog()}>
              <Plus className="w-4 h-4 mr-1" /> Add Exercise
            </Button>
          </div>
          <div className="card-apollo overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Exercise</TableHead>
                  <TableHead>Sets × Reps</TableHead>
                  <TableHead>Rest</TableHead>
                  <TableHead>Muscle</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingExercises ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : exercises?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No exercises. Add one above.</TableCell></TableRow>
                ) : exercises?.map(ex => (
                  <TableRow key={ex.id}>
                    <TableCell className="text-muted-foreground">{ex.sort_order + 1}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{ex.exercise_name}</span>
                        {ex.notes && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{ex.notes}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{ex.sets} × {ex.reps}</TableCell>
                    <TableCell>{ex.rest_seconds}s</TableCell>
                    <TableCell className="capitalize text-sm">{ex.muscle_group || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openExerciseDialog(ex)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteExerciseMutation.mutate(ex.id)} disabled={deleteExerciseMutation.isPending}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Exercise edit dialog */}
          <Dialog open={isExerciseDialogOpen} onOpenChange={(o) => { if (!o) closeExerciseDialog(); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingExercise ? "Edit Exercise" : "Add Exercise"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveExerciseMutation.mutate({ id: editingExercise?.id, data: exerciseForm }); }} className="space-y-4">
                <div>
                  <Label>Exercise Name *</Label>
                  <Input value={exerciseForm.exercise_name} onChange={(e) => setExerciseForm(p => ({ ...p, exercise_name: e.target.value }))} required />
                </div>
                <div>
                  <Label>Muscle Group</Label>
                  <Input value={exerciseForm.muscle_group} onChange={(e) => setExerciseForm(p => ({ ...p, muscle_group: e.target.value }))} placeholder="chest, back, legs..." />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Sets</Label>
                    <Input type="number" value={exerciseForm.sets} onChange={(e) => setExerciseForm(p => ({ ...p, sets: Number(e.target.value) }))} min={1} max={10} />
                  </div>
                  <div>
                    <Label>Reps</Label>
                    <Input value={exerciseForm.reps} onChange={(e) => setExerciseForm(p => ({ ...p, reps: e.target.value }))} placeholder="8-10" />
                  </div>
                  <div>
                    <Label>Rest (sec)</Label>
                    <Input type="number" value={exerciseForm.rest_seconds} onChange={(e) => setExerciseForm(p => ({ ...p, rest_seconds: Number(e.target.value) }))} min={0} />
                  </div>
                </div>
                <div>
                  <Label>Coach Notes</Label>
                  <Textarea value={exerciseForm.notes} onChange={(e) => setExerciseForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Form cues, modifications..." />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={closeExerciseDialog}>Cancel</Button>
                  <Button type="submit" variant="apollo" disabled={saveExerciseMutation.isPending}>
                    {editingExercise ? "Update" : "Add"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default AdminClientPlans;
