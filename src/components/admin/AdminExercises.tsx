import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Exercise {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  muscle_group: string;
  equipment: string | null;
  difficulty: string | null;
}

const MUSCLE_GROUPS = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "biceps", label: "Biceps" },
  { value: "triceps", label: "Triceps" },
  { value: "legs", label: "Legs" },
  { value: "glutes", label: "Glutes" },
  { value: "core", label: "Core" },
  { value: "full-body", label: "Full Body" },
];

const DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const AdminExercises = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    muscle_group: "chest",
    equipment: "",
    difficulty: "beginner",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: exercises, isLoading } = useQuery({
    queryKey: ["admin-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("muscle_group", { ascending: true });
      if (error) throw error;
      return data as Exercise[];
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Exercise name is required";
    if (formData.title.length > 100) newErrors.title = "Name must be under 100 characters";
    if (formData.video_url && !isValidUrl(formData.video_url)) newErrors.video_url = "Enter a valid URL";
    if (formData.thumbnail_url && !isValidUrl(formData.thumbnail_url)) newErrors.thumbnail_url = "Enter a valid URL";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("exercises").insert({
        title: data.title.trim(),
        description: data.description.trim() || null,
        video_url: data.video_url.trim() || null,
        thumbnail_url: data.thumbnail_url.trim() || null,
        muscle_group: data.muscle_group,
        equipment: data.equipment.trim() || null,
        difficulty: data.difficulty,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
      toast({ title: "Exercise created successfully" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error creating exercise", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("exercises")
        .update({
          title: data.title.trim(),
          description: data.description.trim() || null,
          video_url: data.video_url.trim() || null,
          thumbnail_url: data.thumbnail_url.trim() || null,
          muscle_group: data.muscle_group,
          equipment: data.equipment.trim() || null,
          difficulty: data.difficulty,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
      toast({ title: "Exercise updated successfully" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error updating exercise", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-exercises"] });
      toast({ title: "Exercise deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting exercise", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      video_url: "",
      thumbnail_url: "",
      muscle_group: "chest",
      equipment: "",
      difficulty: "beginner",
    });
    setEditingExercise(null);
    setIsDialogOpen(false);
    setErrors({});
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      title: exercise.title,
      description: exercise.description || "",
      video_url: exercise.video_url || "",
      thumbnail_url: exercise.thumbnail_url || "",
      muscle_group: exercise.muscle_group,
      equipment: exercise.equipment || "",
      difficulty: exercise.difficulty || "beginner",
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (editingExercise) {
      updateMutation.mutate({ id: editingExercise.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-xl">Exercise Library</h2>
          <p className="text-sm text-muted-foreground">5-second clips demonstrating individual exercises</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button variant="apollo" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Exercise
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingExercise ? "Edit Exercise" : "Add New Exercise"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Exercise Name *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Bicep Curl"
                  maxLength={100}
                  required
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  maxLength={300}
                  placeholder="Brief description of proper form..."
                />
                <p className="text-xs text-muted-foreground mt-1">{formData.description.length}/300</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="muscle_group">Muscle Group *</Label>
                  <Select
                    value={formData.muscle_group}
                    onValueChange={(v) => setFormData((p) => ({ ...p, muscle_group: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSCLE_GROUPS.map((mg) => (
                        <SelectItem key={mg.value} value={mg.value}>{mg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty *</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(v) => setFormData((p) => ({ ...p, difficulty: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="equipment">Equipment (optional)</Label>
                <Input
                  id="equipment"
                  value={formData.equipment}
                  onChange={(e) => setFormData((p) => ({ ...p, equipment: e.target.value }))}
                  placeholder="e.g., Dumbbells, Barbell, None"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="video_url">Video URL (5-second clip)</Label>
                <Input
                  id="video_url"
                  value={formData.video_url}
                  onChange={(e) => setFormData((p) => ({ ...p, video_url: e.target.value }))}
                  placeholder="https://..."
                  className={errors.video_url ? "border-destructive" : ""}
                />
                {errors.video_url && <p className="text-xs text-destructive mt-1">{errors.video_url}</p>}
              </div>
              <div>
                <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                <Input
                  id="thumbnail_url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData((p) => ({ ...p, thumbnail_url: e.target.value }))}
                  placeholder="https://..."
                  className={errors.thumbnail_url ? "border-destructive" : ""}
                />
                {errors.thumbnail_url && <p className="text-xs text-destructive mt-1">{errors.thumbnail_url}</p>}
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" variant="apollo" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingExercise ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search exercises by name, muscle group, or equipment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="card-apollo overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exercise</TableHead>
              <TableHead>Muscle Group</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : exercises?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No exercises yet. Add your first exercise!
                </TableCell>
              </TableRow>
            ) : (
              exercises
                ?.filter((ex) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    ex.title.toLowerCase().includes(q) ||
                    ex.muscle_group.toLowerCase().includes(q) ||
                    (ex.equipment?.toLowerCase().includes(q) ?? false) ||
                    (ex.difficulty?.toLowerCase().includes(q) ?? false)
                  );
                })
                .map((exercise) => (
                <TableRow key={exercise.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {exercise.title}
                      {exercise.video_url && (
                        <a
                          href={exercise.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-apollo-gold transition-colors"
                          title="Open video"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{exercise.muscle_group}</TableCell>
                  <TableCell>{exercise.equipment || "None"}</TableCell>
                  <TableCell className="capitalize">{exercise.difficulty}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(exercise)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(exercise.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
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

export default AdminExercises;
