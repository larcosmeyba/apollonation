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
import { Plus, Pencil, Trash2, ListChecks, Upload, Image, Loader2, Search, Copy, EyeOff, Play, CheckCircle2, AlertCircle, Link as LinkIcon, Gift, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import AdminClassPlayerLauncher from "@/components/dashboard/AdminClassPlayerLauncher";
import MuxVideo from "@/components/video/MuxVideo";
import RenderMp4Panel from "./library/RenderMp4Panel";



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
  is_published?: boolean;
  admin_class_id?: string | null;
  mux_asset_id?: string | null;
  mux_playback_id?: string | null;
  mux_playback_signed?: boolean | null;
  mux_status?: string | null;
  is_free_pick?: boolean;
  created_at?: string;
}


const CATEGORIES = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "hiit", label: "HIIT" },
  { value: "sculpt", label: "Sculpt" },
  { value: "flexibility", label: "Flexibility" },
  { value: "recovery", label: "Recovery" },
];

const AdminWorkouts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [previewWorkout, setPreviewWorkout] = useState<Workout | null>(null);
  const [playingClass, setPlayingClass] = useState<{ classId: string; title: string } | null>(null);

  
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
    is_published: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Library mgmt: search, filter, sort
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [publishFilter, setPublishFilter] = useState<"all" | "published" | "draft">("all");
  const [sortBy, setSortBy] = useState<"newest" | "title" | "duration">("newest");

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
    if (url.startsWith("storage:")) return true;
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
        is_published: data.is_published,
      } as any);
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
          is_published: data.is_published,
        } as any)
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
      is_published: true,
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
      is_published: workout.is_published !== false,
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


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-xl">On-Demand Classes</h2>
          <p className="text-sm text-muted-foreground">Video classes and workout content</p>
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
              {editingWorkout && (
                <RenderMp4Panel
                  classId={editingWorkout.admin_class_id || null}
                  workoutId={editingWorkout.id}
                  hasBlocks={false}
                  onMuxReady={({ videoUrl, thumbnailUrl }) => {
                    setFormData((p) => ({
                      ...p,
                      video_url: videoUrl,
                      thumbnail_url: thumbnailUrl || p.thumbnail_url,
                    }));
                    queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
                  }}
                />
              )}

              <div>
                <Label htmlFor="video_url">Video URL</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Apollo streams on-demand classes from Mux. Use Upload Video to MUX above when this workout is linked to a Class Builder class, or paste a Mux HLS URL here as a backup.
                </p>
                <Input
                  id="video_url"
                  className="mt-2"
                  value={formData.video_url}
                  onChange={(e) => setFormData((p) => ({ ...p, video_url: e.target.value }))}
                  placeholder="https://stream.mux.com/..."
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
              <div className="flex items-center gap-2">
                <Switch
                  id="is_published"
                  checked={formData.is_published}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, is_published: v }))}
                />
                <Label htmlFor="is_published">Published (visible to clients) — turn off to save as draft</Label>
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

      {/* Library Management Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={publishFilter} onValueChange={(v: any) => setPublishFilter(v)}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="title">Title (A→Z)</SelectItem>
            <SelectItem value="duration">Duration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Card Grid */}
      {(() => {
        const filtered = (workouts || [])
          .filter((w) => {
            if (searchQuery && !w.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (categoryFilter !== "all" && w.category !== categoryFilter) return false;
            if (publishFilter === "published" && w.is_published === false) return false;
            if (publishFilter === "draft" && w.is_published !== false) return false;
            return true;
          })
          .sort((a, b) => {
            if (sortBy === "title") return a.title.localeCompare(b.title);
            if (sortBy === "duration") return a.duration_minutes - b.duration_minutes;
            return (b.created_at || "").localeCompare(a.created_at || "");
          });
        if (isLoading) return <p className="text-center py-8 text-muted-foreground">Loading...</p>;
        if (!filtered.length) return <p className="text-center py-8 text-muted-foreground">No workouts match these filters.</p>;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((workout) => (
              <div key={workout.id} className="card-apollo overflow-hidden group">
                <div className="aspect-[4/3] bg-muted relative">
                  {workout.thumbnail_url ? (
                    <img src={workout.thumbnail_url} alt={workout.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {workout.is_featured && (
                    <span className="absolute top-2 left-2 text-[10px] font-medium bg-primary/90 text-primary-foreground px-1.5 py-0.5 rounded">⭐ Featured</span>
                  )}
                  {workout.is_published !== false ? (
                    <button
                      type="button"
                      title="Live on client app — click to unpublish"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await supabase.from("workouts").update({ is_published: false } as any).eq("id", workout.id);
                        queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
                        toast({ title: "Unpublished", description: `${workout.title} is no longer visible to clients.` });
                      }}
                      className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/90 hover:bg-emerald-600 text-white px-1.5 py-0.5 rounded transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Published
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Draft — click to publish to client app"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await supabase.from("workouts").update({ is_published: true } as any).eq("id", workout.id);
                        queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
                        toast({ title: "Published", description: `${workout.title} is now live on the client app.` });
                      }}
                      className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-medium bg-muted/90 hover:bg-muted text-muted-foreground px-1.5 py-0.5 rounded transition-colors"
                    >
                      Draft
                    </button>
                  )}
                  <span className="absolute bottom-2 right-2 text-[10px] bg-background/80 px-1.5 py-0.5 rounded">{workout.duration_minutes} min</span>
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{workout.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{workout.category}</p>
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Preview / Play" onClick={() => setPreviewWorkout(workout)}>
                      <Play className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => handleEdit(workout)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title={workout.mux_playback_id ? "Copy Mux public URL" : "No Mux video uploaded yet"}
                      disabled={!workout.mux_playback_id}
                      onClick={async () => {
                        if (!workout.mux_playback_id) return;
                        const url = `https://stream.mux.com/${workout.mux_playback_id}`;
                        await navigator.clipboard.writeText(url);
                        toast({ title: "Mux URL copied", description: url });
                      }}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                    </Button>


                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title={workout.is_published === false ? "Publish" : "Unpublish"}
                      onClick={async () => {
                        await supabase.from("workouts").update({ is_published: workout.is_published === false } as any).eq("id", workout.id);
                        queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
                      }}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Duplicate"
                      onClick={async () => {
                        const { id, created_at, ...rest } = workout as any;
                        await supabase.from("workouts").insert({ ...rest, title: `${workout.title} (copy)`, is_published: false });
                        queryClient.invalidateQueries({ queryKey: ["admin-workouts"] });
                        toast({ title: "Duplicated as draft" });
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteMutation.mutate(workout.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Preview / Play */}
      <Dialog open={!!previewWorkout} onOpenChange={() => setPreviewWorkout(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {previewWorkout && (
            <div className="space-y-0">
              {previewWorkout.mux_playback_id ? (
                <div className="relative aspect-video w-full bg-black">
                  <MuxVideo
                    playbackId={previewWorkout.mux_playback_id}
                    signed={Boolean(previewWorkout.mux_playback_signed)}
                    title={previewWorkout.title}
                    videoId={previewWorkout.id}
                    category={previewWorkout.category}
                    autoPlay
                    controls
                  />
                </div>
              ) : previewWorkout.thumbnail_url ? (
                <div className="relative aspect-video w-full bg-muted">
                  <img src={previewWorkout.thumbnail_url} alt={previewWorkout.title} className="w-full h-full object-cover" />
                </div>
              ) : null}
              <div className="p-5 space-y-3">
                <DialogHeader>
                  <DialogTitle>{previewWorkout.title}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground capitalize">
                  {previewWorkout.category} · {previewWorkout.duration_minutes} min
                </p>
                {previewWorkout.description && (
                  <p className="text-sm text-muted-foreground">{previewWorkout.description}</p>
                )}
                {previewWorkout.admin_class_id ? (
                  <Button
                    variant="apollo"
                    size="lg"
                    className="w-full gap-2"
                    onClick={() => {
                      setPlayingClass({ classId: previewWorkout.admin_class_id!, title: previewWorkout.title });
                      setPreviewWorkout(null);
                    }}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Start Workout
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This class isn't linked to a Class Builder session, so the guided player isn't available.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {playingClass && (
        <AdminClassPlayerLauncher
          classId={playingClass.classId}
          title={playingClass.title}
          onClose={() => setPlayingClass(null)}
        />
      )}
    </div>
  );
};


export default AdminWorkouts;
