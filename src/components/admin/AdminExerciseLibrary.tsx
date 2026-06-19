import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Loader2, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import ExerciseEditorSheet from "@/components/admin/library/ExerciseEditorSheet";
import {
  AdminExercise,
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  muxThumb,
} from "@/components/admin/library/exerciseTypes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  intermediate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  advanced: "bg-red-500/15 text-red-400 border-red-500/30",
};

const AdminExerciseLibrary = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [muscleFilter, setMuscleFilter] = useState<string>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<AdminExercise | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminExercise | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: exercises = [], isLoading } = useQuery<AdminExercise[]>({
    queryKey: ["admin-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as AdminExercise[];
    },
  });

  const filtered = exercises.filter((ex) => {
    const matchSearch =
      !search || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "all" || ex.category === categoryFilter;
    const matchMuscle =
      muscleFilter === "all" || ex.muscle_group === muscleFilter;
    return matchSearch && matchCategory && matchMuscle;
  });

  const openNew = () => {
    setEditingExercise(null);
    setEditorOpen(true);
  };

  const openEdit = (ex: AdminExercise) => {
    setEditingExercise(ex);
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("exercises")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      toast.error("Failed to delete exercise");
    } else {
      toast.success(`"${deleteTarget.name}" deleted`);
      qc.invalidateQueries({ queryKey: ["admin-exercises"] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Exercise Library</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {exercises.length} exercises · manage the master movement catalog
          </p>
        </div>
        <Button onClick={openNew} className="self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-2" /> New Exercise
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {EXERCISE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={muscleFilter} onValueChange={setMuscleFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Muscle group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All muscles</SelectItem>
            {MUSCLE_GROUPS.map((m) => (
              <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <Dumbbell className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {exercises.length === 0
              ? "No exercises yet. Add your first one!"
              : "No exercises match your filters."}
          </p>
          {exercises.length === 0 && (
            <Button onClick={openNew} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Exercise
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((ex) => {
            const thumb = ex.thumbnail_url || muxThumb(ex.mux_playback_id);
            return (
              <div
                key={ex.id}
                className="group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={ex.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Dumbbell className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {/* Action overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => openEdit(ex)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => setDeleteTarget(ex)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-1.5">
                  <p className="font-medium text-sm leading-tight line-clamp-1">{ex.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {ex.difficulty && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border capitalize ${DIFFICULTY_COLORS[ex.difficulty] ?? ""}`}>
                        {ex.difficulty}
                      </span>
                    )}
                    {ex.category && (
                      <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0.5 h-auto">
                        {ex.category}
                      </Badge>
                    )}
                    {ex.muscle_group && (
                      <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0.5 h-auto">
                        {ex.muscle_group}
                      </Badge>
                    )}
                  </div>
                  {ex.equipment && ex.equipment.length > 0 && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {ex.equipment.slice(0, 3).join(", ")}
                      {ex.equipment.length > 3 && ` +${ex.equipment.length - 3}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor sheet */}
      <ExerciseEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        exercise={editingExercise}
        allExercises={exercises}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin-exercises"] });
          setEditorOpen(false);
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete exercise?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently removed from the library. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminExerciseLibrary;
