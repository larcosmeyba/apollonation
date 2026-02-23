import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ListChecks, Upload, Image, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import WorkoutExerciseLinker from "./WorkoutExerciseLinker";

interface Workout {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration_minutes: number;
  calories_estimate: number | null;
  video_url: string | null;
  thumbnail_url: string | null;
  is_featured: boolean | null;
}

const CATEGORIES = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "hiit", label: "HIIT" },
  { value: "flexibility", label: "Flexibility" },
  { value: "recovery", label: "Recovery" },
];

const AdminWorkouts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [linkingWorkout, setLinkingWorkout] = useState<Workout | null>(null);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "strength",
    duration_minutes: 15,
    calories_estimate: 200,
    video_url: "",
    thumbnail_url: "",
    is_featured: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: workouts, isLoading } = useQuery({
    queryKey: ["admin-workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Workout[];
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (formData.title.length > 100) newErrors.title = "Title must be under 100 characters";
    if (formData.duration_minutes < 1) newErrors.duration = "Duration must be at least 1 minute";
    if (formData.duration_minutes > 120) newErrors.duration = "Duration must be under 120 minutes";
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
      const { error } = await supabase.from("workouts").insert({
        title: data.title.trim(),
        description: data.description.trim() || null,
        category: data.category,
        duration_minutes: data.duration_minutes,
        calories_estimate: data.calories_estimate || null,
        video_url: data.video_url.trim() || null,
        thumbnail_url: data.thumbnail_url.trim() || null,
        is_featured: data.is_featured,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["featured-workouts"] });
      toast({ title: "Workout created successfully" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error creating workout", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("workouts")
        .update({
          title: data.title.trim(),
          description: data.description.trim() || null,
          category: data.category,
          duration_minutes: data.duration_minutes,
          calories_estimate: data.calories_estimate || null,
          video_url: data.video_url.trim() || null,
          thumbnail_url: data.thumbnail_url.trim() || null,
          is_featured: data.is_featured,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["featured-workouts"] });
      toast({ title: "Workout updated successfully" });
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error updating workout", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["featured-workouts"] });
      toast({ title: "Workout deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting workout", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "strength",
      duration_minutes: 15,
      calories_estimate: 200,
      video_url: "",
      thumbnail_url: "",
      is_featured: false,
    });
    setEditingWorkout(null);
    setIsDialogOpen(false);
    setErrors({});
  };

  const handleEdit = (workout: Workout) => {
    setEditingWorkout(workout);
    setFormData({
      title: workout.title,
      description: workout.description || "",
      category: workout.category,
      duration_minutes: workout.duration_minutes,
      calories_estimate: workout.calories_estimate || 0,
      video_url: workout.video_url || "",
      thumbnail_url: workout.thumbnail_url || "",
      is_featured: workout.is_featured || false,
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (editingWorkout) {
      updateMutation.mutate({ id: editingWorkout.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // If linking exercises to a workout, show the linker
  if (linkingWorkout) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setLinkingWorkout(null)}>
          ← Back to Workouts
        </Button>
        <WorkoutExerciseLinker workoutId={linkingWorkout.id} workoutTitle={linkingWorkout.title} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-xl">On-Demand Workouts</h2>
          <p className="text-sm text-muted-foreground">15-minute YouTube-style workout videos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button variant="apollo" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingWorkout ? "Edit Workout" : "Add New Workout"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
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
                  rows={3}
                  maxLength={500}
                  placeholder="Describe the workout focus and intensity..."
                />
                <p className="text-xs text-muted-foreground mt-1">{formData.description.length}/500</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="duration">Duration (min) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData((p) => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))}
                    min={1}
                    max={120}
                    required
                    className={errors.duration ? "border-destructive" : ""}
                  />
                  {errors.duration && <p className="text-xs text-destructive mt-1">{errors.duration}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="calories">Calories Estimate</Label>
                <Input
                  id="calories"
                  type="number"
                  value={formData.calories_estimate}
                  onChange={(e) => setFormData((p) => ({ ...p, calories_estimate: parseInt(e.target.value) || 0 }))}
                  min={0}
                  max={2000}
                />
              </div>
              <div>
                <Label htmlFor="video_url">Video URL (YouTube/Vimeo)</Label>
                <Input
                  id="video_url"
                  value={formData.video_url}
                  onChange={(e) => setFormData((p) => ({ ...p, video_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                  className={errors.video_url ? "border-destructive" : ""}
                />
                {errors.video_url && <p className="text-xs text-destructive mt-1">{errors.video_url}</p>}
              </div>
              <div>
                <Label>Thumbnail</Label>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
                      return;
                    }
                    setIsUploadingThumb(true);
                    const ext = file.name.split(".").pop();
                    const fileName = `workout-${crypto.randomUUID()}.${ext}`;
                    const { error } = await supabase.storage.from("thumbnails").upload(fileName, file, { contentType: file.type });
                    if (error) {
                      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                      setIsUploadingThumb(false);
                      return;
                    }
                    const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(fileName);
                    setFormData((p) => ({ ...p, thumbnail_url: urlData.publicUrl }));
                    setIsUploadingThumb(false);
                    toast({ title: "Thumbnail uploaded!" });
                  }}
                />
                {formData.thumbnail_url ? (
                  <div className="mt-2 relative">
                    <img src={formData.thumbnail_url} alt="Thumbnail" className="w-full h-32 object-cover rounded-md border border-border" />
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, thumbnail_url: "" }))}
                      className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-destructive/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-20 border-dashed mt-2"
                    onClick={() => thumbInputRef.current?.click()}
                    disabled={isUploadingThumb}
                  >
                    {isUploadingThumb ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Image className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Upload thumbnail (JPG, PNG — max 5MB)</span>
                      </div>
                    )}
                  </Button>
                )}
                <Input
                  className="mt-2"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData((p) => ({ ...p, thumbnail_url: e.target.value }))}
                  placeholder="Or paste a URL..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, is_featured: v }))}
                />
                <Label htmlFor="is_featured">Featured workout (shown on homepage)</Label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" variant="apollo" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingWorkout ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-apollo overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : workouts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No workouts yet. Add your first workout!
                </TableCell>
              </TableRow>
            ) : (
              workouts?.map((workout) => (
                <TableRow key={workout.id}>
                  <TableCell className="font-medium">{workout.title}</TableCell>
                  <TableCell className="capitalize">{workout.category}</TableCell>
                  <TableCell>{workout.duration_minutes} min</TableCell>
                  <TableCell>{workout.is_featured ? "⭐ Yes" : "No"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Link exercises"
                        onClick={() => setLinkingWorkout(workout)}
                      >
                        <ListChecks className="w-4 h-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(workout)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(workout.id)}
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

export default AdminWorkouts;
