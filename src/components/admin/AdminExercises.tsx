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
import { Plus, Pencil, Trash2, Search, Play, Upload, Link, Loader2, Image } from "lucide-react";
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

const getYouTubeEmbedUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    let videoId: string | null = null;
    if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  } catch {
    return null;
  }
};

const AdminExercises = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [videoPreview, setVideoPreview] = useState<{ title: string; url: string } | null>(null);
  const [videoInputMode, setVideoInputMode] = useState<"url" | "upload">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
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
    if (formData.video_url && videoInputMode === "url" && !isValidUrl(formData.video_url)) newErrors.video_url = "Enter a valid URL";
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

  const handleFileUpload = async (file: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Max file size is 50MB", variant: "destructive" });
      return;
    }

    const allowedTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload MP4, MOV, WebM, or AVI files", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("exercise-videos")
      .upload(fileName, file, { contentType: file.type });

    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setIsUploading(false);
      return;
    }

    // Store the storage path as the video_url (prefixed to identify it as storage)
    setFormData((p) => ({ ...p, video_url: `storage:exercise-videos/${fileName}` }));
    setUploadedFileName(file.name);
    setIsUploading(false);
    toast({ title: "Video uploaded successfully" });
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
    setVideoInputMode("upload");
    setUploadedFileName(null);
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    const isStorage = exercise.video_url?.startsWith("storage:");
    setVideoInputMode(isStorage ? "upload" : "url");
    setUploadedFileName(isStorage ? "Previously uploaded video" : null);
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

              {/* Video input with toggle between upload and URL */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Exercise Video</Label>
                  <div className="flex gap-1 bg-muted rounded-md p-0.5">
                    <button
                      type="button"
                      onClick={() => { setVideoInputMode("upload"); setFormData(p => ({ ...p, video_url: "" })); setUploadedFileName(null); }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        videoInputMode === "upload"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => { setVideoInputMode("url"); setFormData(p => ({ ...p, video_url: "" })); setUploadedFileName(null); }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        videoInputMode === "url"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Link className="w-3 h-3" />
                      YouTube URL
                    </button>
                  </div>
                </div>

                {videoInputMode === "upload" ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    {uploadedFileName ? (
                      <div className="flex items-center gap-2 p-3 border border-border rounded-md bg-muted/30">
                        <Play className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm truncate flex-1">{uploadedFileName}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUploadedFileName(null);
                            setFormData(p => ({ ...p, video_url: "" }));
                          }}
                          className="text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-20 border-dashed"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Uploading...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              MP4, MOV, WebM — up to 50MB
                            </span>
                          </div>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div>
                    <Input
                      value={formData.video_url}
                      onChange={(e) => setFormData((p) => ({ ...p, video_url: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=..."
                      className={errors.video_url ? "border-destructive" : ""}
                    />
                    {errors.video_url && <p className="text-xs text-destructive mt-1">{errors.video_url}</p>}
                  </div>
                )}
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
                    const fileName = `exercise-${crypto.randomUUID()}.${ext}`;
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
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" variant="apollo" disabled={createMutation.isPending || updateMutation.isPending || isUploading}>
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
                        <button
                          onClick={() => setVideoPreview({ title: exercise.title, url: exercise.video_url! })}
                          className="text-muted-foreground hover:text-apollo-gold transition-colors"
                          title="Watch video"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
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

      {/* Video Preview Modal */}
      <Dialog open={!!videoPreview} onOpenChange={(open) => { if (!open) setVideoPreview(null); }}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{videoPreview?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full">
            {videoPreview && (() => {
              const url = videoPreview.url;
              // Handle storage URLs
              if (url.startsWith("storage:")) {
                return <StorageVideoPlayer storagePath={url.replace("storage:", "")} />;
              }
              const embedUrl = getYouTubeEmbedUrl(url);
              return embedUrl ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={videoPreview.title}
                />
              ) : (
                <video src={url} controls autoPlay className="w-full h-full" />
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** Small helper to play videos from storage with a signed URL */
const StorageVideoPlayer = ({ storagePath }: { storagePath: string }) => {
  const [bucket, ...pathParts] = storagePath.split("/");
  const filePath = pathParts.join("/");

  const { data: signedUrl } = useQuery({
    queryKey: ["signed-video", storagePath],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 1000 * 60 * 30,
  });

  if (!signedUrl) return <div className="w-full h-full flex items-center justify-center bg-black"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return <video src={signedUrl} controls autoPlay className="w-full h-full" />;
};

export default AdminExercises;
